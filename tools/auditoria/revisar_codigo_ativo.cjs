// Auditoria somente de leitura. Não usa dispositivo, rede, Firebase ou dados reais.
// Os cenários negativos executam trechos reais com armazenamento/periféricos simulados.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const slash = file => file.split(path.sep).join('/');
function walk(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory() && /^(?:build(?:[_-].*)?|\.gradle|node_modules)$/.test(entry.name)) return [];
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function resolveLocal(from, specifier) {
  const base = slash(path.normalize(path.join(path.dirname(from), specifier)));
  return [base, ...['.ts', '.tsx', '.js', '.json', '/index.ts', '/index.tsx'].map(ext => base + ext)]
    .find(file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile());
}
function inventory() {
  const sources = ['App.tsx', ...walk('src').filter(file => /\.tsx?$/.test(file))].sort();
  const graph = new Map();
  for (const file of sources) {
    const source = read(file);
    const info = ts.preProcessFile(source, true, true);
    const imports = info.importedFiles.map(item => item.fileName);
    // Inclui recursos require() e importações tardias (preProcessFile pode omiti-las).
    for (const match of source.matchAll(/(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) imports.push(match[1]);
    const local = [...new Set(imports.filter(value => value.startsWith('.')))];
    graph.set(file, {
      file, lines: source.split(/\r?\n/).length,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'),
      localImports: local.map(specifier => ({ specifier, resolved: resolveLocal(file, specifier) ?? null })),
      externalImports: [...new Set(imports.filter(value => !value.startsWith('.')))].sort(),
    });
  }
  const reachable = new Set();
  function visit(file) {
    if (reachable.has(file) || !graph.has(file)) return;
    reachable.add(file);
    graph.get(file).localImports.forEach(item => visit(item.resolved));
  }
  visit('App.tsx');
  return [...graph.values()].map(file => ({ ...file, reachableFromApp: reachable.has(file.file) }));
}
function compile(source, dependencies = {}, globals = {}) {
  const context = { exports: {}, console, ...globals, require: name => {
    if (!(name in dependencies)) throw new Error(`Import não simulado: ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } }).outputText, context);
  return context.exports;
}
function extractBody(source, marker) {
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) throw new Error(`Trecho não localizado: ${marker}`);
  const start = source.indexOf('{', markerAt);
  let depth = 1, end = start + 1;
  while (end < source.length && depth) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') depth--;
    end++;
  }
  if (depth) throw new Error('Bloco incompleto');
  return source.slice(start + 1, end - 1);
}
function firmwareStaleSignal() {
  const source = read('firmware/xiao_escolta_ble/xiao_escolta_ble.ino');
  if (source.includes('ESCOLTA_TESTE_WATCHDOG_RSSI')) {
    const body = extractBody(source, 'void processarSinal(');
    return { method: 'inspeção de ligação W1; comportamento temporal testado em C++ separado, não emula rádio',
      optInOnly: /ESCOLTA_TESTE_WATCHDOG_RSSI != 1/.test(source),
      beforeMissingReadReturn: body.indexOf('watchdogRssi.expirou') < body.indexOf('if (!rssiAtualizado) return'),
      variant: 'xiao-p5-r4-d1-k2-w1', timeoutMs: 8000 };
  }
  // Este bloco específico não contém declarações/tipos exclusivos de C++.
  // Executa o fluxo transcrito, NÃO emula ArduinoBLE, rádio ou temporização real.
  const body = extractBody(read('firmware/xiao_escolta_ble/xiao_escolta_ble.ino'), 'void processarSinal(');
  function scenario(connected) {
    const context = {
      escoltaAtivada: true, contadorDesconectado: 0, DEBOUNCE_DESCONEXAO_AMOSTRAS: 10,
      modoPanico: false, estadoAtual: 0, PERIGO: 2, rssiAtualizado: false,
      Serial: { println() {} }, monitorProximidade: { receber() { throw new Error('Leitura inexistente'); } },
    };
    vm.createContext(context);
    vm.runInContext(`const processar = (rssiCru, conectado) => {${body}};
      for (let i = 0; i < 120; i++) processar(-65, ${connected});`, context);
    return { iterations: 120, simulatedDurationMs: 120 * 500, panic: context.modoPanico,
      state: context.estadoAtual, disconnectCounter: context.contadorDesconectado };
  }
  return { method: 'fluxo real de processarSinal, periféricos simulados; não é ensaio físico',
    connectedWithoutNewRssi: scenario(true), disconnected: scenario(false) };
}
async function trialWriteAccountRace() {
  const values = new Map();
  const nativeStorage = { getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } };
  const account = compile(read('src/services/accountStorage.ts'), {
    '@react-native-async-storage/async-storage': nativeStorage,
  });
  await account.initializeAccountStorage('A');
  const utils = compile(read('src/utils/proximityTrial.ts'));
  const historyApi = compile(read('src/services/trialHistory.ts'), {
    './accountStorage': account, '../utils/proximityTrial': utils,
  });
  const history = new historyApi.TrialHistoryStore('A');
  await history.load();
  const source = read('src/screens/ProximityTrialModal.tsx');
  const tree = ts.createSourceFile('modal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'finish') callback = node.initializer.arguments[0];
    ts.forEachChild(node, find);
  }
  find(tree);
  if (!callback) throw new Error('Callback finish não localizado');
  let release;
  const writesRef = { current: new Promise(resolve => { release = resolve; }) };
  const exports = compile(`export const finish = ${callback.getText(tree)};`, {}, {
    AsyncStorage: account.default, STORAGE_KEY: '@escolta_proximity_trials_v1', MAX_RUNS: 100, history,
    mountedRef: { current: true },
    currentRef: { current: { id: 'coleta-exclusiva-A', distanceM: 1, condition: 'simulado', startedAt: 1, endedAt: null, stopReason: null, samples: [] } },
    runsRef: { current: [] }, writesRef, setCurrent() {}, setRuns() {}, setStorageError() {},
  });
  // A conta já mudou quando o callback atrasado da coleta A começa a gravar.
  await account.initializeAccountStorage('B');
  exports.finish('interrompido pelo usuário');
  release();
  await writesRef.current;
  const targetKey = [...values.keys()].find(key => key.startsWith('@escolta_proximity_trials_v1'));
  return { method: 'callback finish, TrialHistoryStore e accountStorage reais; contas e atraso simulados',
    originAccount: 'A', accountBeforeQueueDrain: 'B', actualStoredKey: targetKey,
    crossedAccount: targetKey?.endsWith(':uid:B') === true };
}
function promotionPredicates() {
  const file = 'modules/escolta-sentinela/android/src/main/java/expo/modules/escoltasentinela/';
  const module = read(file + 'EscoltaSentinelaModule.kt');
  const service = read(file + 'EscoltaSentinelaService.kt');
  const nativeStillTestOnly = /Constant\("protectionHeartbeatAvailable"\)[\s\S]*?endsWith\("\.teste"\)/.test(module)
    && /if \(packageName\.endsWith\("\.teste"\) && !heartbeatStarted\)/.test(service);
  const policy = read(file + 'ValidatedMonitorPolicy.kt');
  const sharedPolicy = module.includes('ValidatedMonitorPolicy.isEnabled(it)')
    && service.includes('ValidatedMonitorPolicy.isEnabled(this)')
    && policy.includes('getBoolean("escolta.validated_monitor", false)');
  return { method: 'inspeção estática das condições Kotlin; não executa Android', nativeStillTestOnly,
    matrix: [false, true].flatMap(test => [false, true].map(optIn => ({
      testPackage: test, validatedMetadata: optIn, jsValidated: test || optIn,
      nativeHeartbeatAccordingToCurrentGuard: sharedPolicy ? test || optIn : nativeStillTestOnly ? test : 'rever código alterado',
    }))) };
}
(async () => {
  const files = inventory();
  const supportingPaths = [...walk('firmware/xiao_escolta_ble').filter(file => /\.(ino|h)$/.test(file)),
    ...walk('modules').filter(file => /\.(kt|xml|gradle|json|wav)$/.test(file) && !file.includes('/build/')),
    'package.json', 'package-lock.json', 'app.json', 'eas.json', 'tsconfig.json', 'babel.config.js', 'metro.config.js',
    'android/app/build.gradle', 'android/app/src/main/AndroidManifest.xml',
    'android/app/src/main/java/com/nicolasvmen/escoltaunitau/MainActivity.kt',
    'android/app/src/main/java/com/nicolasvmen/escoltaunitau/MainApplication.kt',
    'tools/plugins/with-test-build.cjs', 'tools/android/standalone-test/AndroidManifest.xml',
    'tools/build-android.ps1', 'tools/auditoria/verificar_candidato_android.cjs',
    'assets/alert_tone.wav', 'assets/icon.png', 'assets/google-g.png',
  ];
  const supportingFiles = supportingPaths.sort().map(file => {
    const bytes = fs.readFileSync(path.join(root, file));
    return { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  });
  console.log(JSON.stringify({ date: '2026-10-17', scope: 'fontes de entrada e src; não prova execução em aparelho',
    files, counts: { sources: files.length, reachable: files.filter(file => file.reachableFromApp).length },
    supportingFiles,
    unresolved: files.flatMap(file => file.localImports.filter(item => !item.resolved).map(item => ({ from: file.file, ...item }))),
    promotion: promotionPredicates(), firmwareStaleSignal: firmwareStaleSignal(),
    trialWriteAccountRace: await trialWriteAccountRace(),
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
