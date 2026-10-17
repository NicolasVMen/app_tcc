// Dados, transporte por arquivo e falhas simuladas; o seletor real é testado no Samsung.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function load(relative, dependencies = {}) {
  const filename = path.join(__dirname, '..', relative);
  const context = { exports: {}, Date, Set, console, require: name => {
    if (!(name in dependencies)) throw new Error(`Import inesperado: ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context, { filename });
  return context.exports;
}
const trials = load('src/utils/proximityTrial.ts');
const format = load('src/utils/proximityExport.ts', { './proximityTrial': trials });
const startedAt = Date.parse('2026-10-16T02:15:00Z');
const makeRun = (id = 'ensaio-1', time = startedAt) => ({
  id, distanceM: 4, startedAt: time, endedAt: time + 40000, stopReason: 'concluído',
  condition: 'Sala; caixa fechada', metadata: { firmware: 'xiao-p5-r4', phone: 'SM-S928B',
    platform: 'android 36', heightM: null, app: '1.0.0' },
  samples: [0, 1, 2].map((index) => ({ receivedAt: time + 11000 + index * 1000,
    readAt: time + 10900 + index * 1000, sampleId: index + 1, phoneRssi: -80 - index,
    rawRssi: -82, filteredRssi: -81 - index, estimatedM: [3, 4, 5][index],
    state: index ? 'panico' : 'atencao', panic: index > 0, active: true, firmware: 'xiao-p5-r4' })),
});
const options = { scope: 'history', format: 'samples' };
const parseRow = line => [...line.matchAll(/"((?:[^"]|"")*)"(?:;|$)/g)].map(m => m[1].replace(/""/g, '"'));

test('CSV detalhado preserva integralmente o formato e os dados, acrescentando somente BOM', () => {
  const runs = [makeRun()];
  const artifact = format.buildTrialExport(runs, options, startedAt);
  assert.equal(artifact.content, '\uFEFF' + trials.trialsToCsv(runs));
  assert.equal(artifact.runCount, 1);
  assert.equal(artifact.sampleCount, 3);
  assert.match(artifact.filename, /^Escolta_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}_historico_amostras\.csv$/);
});

test('último ensaio é o mais recente; seleção não modifica o histórico e não exclui incompletos', () => {
  const old = makeRun('antigo');
  const recent = { ...makeRun('recente', startedAt + 60000), samples: [], stopReason: 'interrompido pelo usuário' };
  const runs = [recent, old];
  const before = JSON.stringify(runs);
  const artifact = format.buildTrialExport(runs, { scope: 'latest', format: 'samples' });
  assert.equal(JSON.stringify(runs), before);
  assert.equal(artifact.runCount, 1);
  assert.equal(artifact.sampleCount, 0);
  assert.ok(artifact.content.includes('recente'));
  assert.ok(!artifact.content.includes('antigo'));
  assert.equal(artifact.content.split('\r\n').length, 2);
});

test('resumo tem unidades, médias, mediana, erro absoluto, metadados e contagens corretos', () => {
  const csv = format.trialsSummaryToCsv([makeRun()]);
  const lines = csv.split('\r\n');
  const header = parseRow(lines[0]), values = parseRow(lines[1]);
  assert.equal(values.length, header.length);
  const row = Object.fromEntries(header.map((key, i) => [key, values[i]]));
  assert.equal(row.distancia_real_m, '4');
  assert.equal(row.rssi_filtrado_medio_dbm, '-82');
  assert.equal(row.rssi_filtrado_mediana_dbm, '-82');
  assert.equal(row.rssi_filtrado_minimo_dbm, '-83');
  assert.equal(row.rssi_filtrado_maximo_dbm, '-81');
  assert.equal(row.distancia_estimada_media_m, '4');
  assert.equal(row.erro_absoluto_medio_m, '0.667');
  assert.equal(row.amostras_em_atencao, '1');
  assert.equal(row.amostras_com_panico, '2');
  assert.equal(row.altura_m, ''); // Não inventa altura zero.
  assert.equal(row.modelo_celular, 'SM-S928B');
  assert.ok(row.inicio_utc.endsWith('Z'));
});

test('resumo sem amostras mantém lacunas; notas e IDs de texto não executam fórmulas', () => {
  const run = { ...makeRun('=FORMULA'), samples: [], condition: '@teste; "acentuação"' };
  const csv = format.trialsSummaryToCsv([run]);
  const header = parseRow(csv.split('\r\n')[0]), values = parseRow(csv.split('\r\n')[1]);
  const row = Object.fromEntries(header.map((key, i) => [key, values[i]]));
  assert.equal(row.ensaio, "'=FORMULA");
  assert.equal(row.condicao, "'@teste; \"acentuação\"");
  assert.equal(row.rssi_filtrado_medio_dbm, '');
  assert.equal(row.erro_absoluto_medio_m, '');
  assert.equal(row.amostras_coletadas, '0');
});

test('histórico máximo de 100 ensaios/3000 amostras é exportado completo, sem truncar', () => {
  const runs = Array.from({ length: 100 }, (_, i) => {
    const run = makeRun(`ensaio-${i}`, startedAt + i * 60000);
    return { ...run, samples: Array.from({ length: 30 }, (_, j) => ({ ...run.samples[j % 3], sampleId: j + 1 })) };
  });
  const artifact = format.buildTrialExport(runs, options);
  assert.equal(artifact.runCount, 100);
  assert.equal(artifact.sampleCount, 3000);
  assert.equal(artifact.content.split('\r\n').length, 3001);
  assert.ok(Buffer.byteLength(artifact.content, 'utf8') > 500000);
  assert.equal(format.buildTrialExport(runs, { scope: 'history', format: 'summary' }).content.split('\r\n').length, 101);
});

test('sem dados/opção desconhecida não cria exportação enganosa', () => {
  assert.throws(() => format.buildTrialExport([], options), /Não há ensaios/);
  assert.throws(() => format.buildTrialExport([makeRun()], { scope: 'outro', format: 'summary' }), /inválida/);
});

function service(overrides = {}) {
  const calls = [];
  const fileSystem = { cacheDirectory: 'file:///cache/', EncodingType: { UTF8: 'utf8' },
    makeDirectoryAsync: async (...args) => { calls.push(['mkdir', ...args]); },
    writeAsStringAsync: async (...args) => { calls.push(['write', ...args]); },
    StorageAccessFramework: {
      requestDirectoryPermissionsAsync: async () => ({ granted: true, directoryUri: 'content://chosen' }),
      createFileAsync: async (...args) => { calls.push(['create', ...args]); return 'content://chosen/result.csv'; },
    }, ...overrides.fileSystem,
  };
  const sharing = { isAvailableAsync: async () => true,
    shareAsync: async (...args) => { calls.push(['share', ...args]); }, ...overrides.sharing };
  const api = load('src/services/proximityExport.ts', {
    'react-native': { Platform: { OS: overrides.platform ?? 'android' } },
    'expo-modules-core': { requireOptionalNativeModule: () => overrides.missingNative ? null : {} },
    'expo-file-system/legacy': fileSystem, 'expo-sharing': sharing,
    '../utils/proximityExport': format, '../utils/asyncTimeout': {
      withTimeout: overrides.withTimeout ?? (async operation => operation),
    },
  });
  return { ...api, calls, fileSystem, sharing };
}

test('compartilha só URI do arquivo com MIME CSV; nunca o histórico em extras de texto', async () => {
  const api = service();
  const result = await api.exportTrialCsv([makeRun()], options, 'share');
  const write = api.calls.find(c => c[0] === 'write'), share = api.calls.find(c => c[0] === 'share');
  assert.equal(result.status, 'shared');
  assert.equal(share[1], write[1]);
  assert.match(share[1], /^file:\/\/\/cache\/escolta-exports\/Escolta_.*\.csv$/);
  assert.equal(write[2], '\uFEFF' + trials.trialsToCsv([makeRun()]));
  assert.equal(share[2].mimeType, 'text/csv');
  assert.equal(share[2].message, undefined);
  assert.equal(share[2].content, undefined);
  assert.ok(!JSON.stringify(share).includes('Sala; caixa fechada'));
});

test('bloqueia exportações simultâneas e libera após fechar/cancelar o seletor', async () => {
  let finish;
  const api = service({ sharing: { shareAsync: () => new Promise(resolve => { finish = resolve; }) } });
  const first = api.exportTrialCsv([makeRun()], options, 'share');
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(api.exportTrialCsv([makeRun()], options, 'save'), /andamento/);
  finish();
  await first;
  assert.equal((await api.exportTrialCsv([makeRun()], options, 'save')).status, 'saved');
});

test('falha de gravação não abre seletor e libera nova tentativa sem apagar ensaios', async () => {
  let fail = true;
  const api = service({ fileSystem: { writeAsStringAsync: async () => { if (fail) throw new Error('Sem espaço'); } } });
  const runs = [makeRun()], before = JSON.stringify(runs);
  await assert.rejects(api.exportTrialCsv(runs, options, 'share'), /Sem espaço/);
  assert.ok(!api.calls.some(c => c[0] === 'share'));
  assert.equal(JSON.stringify(runs), before);
  fail = false;
  await api.exportTrialCsv(runs, options, 'share');
});

test('cancelar permissão de pasta não cria arquivo nem altera histórico', async () => {
  const api = service({ fileSystem: { StorageAccessFramework: {
    requestDirectoryPermissionsAsync: async () => ({ granted: false }),
    createFileAsync: async () => { throw new Error('Não deveria criar arquivo'); },
  } } });
  assert.equal((await api.exportTrialCsv([makeRun()], options, 'save')).status, 'cancelled');
  assert.deepEqual(api.calls, []);
});

test('salvar usa pasta explicitamente escolhida e grava conteúdo completo em UTF-8', async () => {
  const api = service();
  const result = await api.exportTrialCsv([makeRun()], options, 'save');
  const create = api.calls.find(c => c[0] === 'create'), write = api.calls.find(c => c[0] === 'write');
  assert.equal(result.status, 'saved');
  assert.equal(create[1], 'content://chosen');
  assert.equal(create[3], 'text/csv');
  assert.equal(write[1], 'content://chosen/result.csv');
  assert.equal(write[2], '\uFEFF' + trials.trialsToCsv([makeRun()]));
  assert.equal(write[3].encoding, 'utf8');
  assert.ok(!api.calls.some(c => c[0] === 'share'));
});

test('módulo ausente ou compartilhamento indisponível tem erro controlado e alternativa salvar', async () => {
  const oldApp = service({ missingNative: true });
  await assert.rejects(oldApp.exportTrialCsv([makeRun()], options, 'share'), /Atualize o aplicativo/);
  assert.equal((await oldApp.exportTrialCsv([makeRun()], options, 'save')).status, 'saved');
  const unavailable = service({ sharing: { isAvailableAsync: async () => false } });
  await assert.rejects(unavailable.exportTrialCsv([makeRun()], options, 'share'), /indisponível/);
});

test('falha do seletor libera trava para repetir; salvar em plataforma diferente é recusado', async () => {
  const api = service({ sharing: { shareAsync: async () => { throw new Error('Seletor indisponível'); } } });
  await assert.rejects(api.exportTrialCsv([makeRun()], options, 'share'), /Seletor indisponível/);
  assert.equal((await api.exportTrialCsv([makeRun()], options, 'save')).status, 'saved');
  await assert.rejects(service({ platform: 'ios' }).exportTrialCsv([makeRun()], options, 'save'), /Compartilhar CSV/);
});

test('tela oferece escopo/formato/salvar, trava imediata e não chama Share.share com texto grande', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/ProximityTrialModal.tsx'), 'utf8');
  assert.doesNotMatch(source, /Share\.share|message: trialsToCsv/);
  for (const text of ['Histórico completo', 'Último ensaio', 'Amostras detalhadas', 'Resumo por ensaio',
    'SALVAR CSV NO CELULAR', 'COMPARTILHAR ARQUIVO CSV', 'exportRef.current = true', 'exportRef.current = false']) {
    assert.ok(source.includes(text), text);
  }
  assert.match(source, /withTimeout\(writesRef\.current\.catch\(\(\) => \{\}\), 10000/);
});

test('layout do ensaio limita viewport à janela e reserva espaço flexível para rolagem', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/ProximityTrialModal.tsx'), 'utf8');
  assert.match(source, /height: windowHeight, maxHeight: windowHeight/);
  assert.match(source, /scroll: \{ flex: 1, minHeight: 0 \}/);
  assert.match(source, /header: \{ flexShrink: 0/);
  assert.match(source, /testID="proximity-trial-scroll" style=\{styles\.scroll\}/);
  assert.match(source, /multiline scrollEnabled=\{false\}/);
  assert.match(source, /keyboardDismissMode="on-drag"/);
  assert.match(source, /showsVerticalScrollIndicator scrollEnabled/);
});
