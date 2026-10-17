const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const read = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
function load(relative, dependencies = {}) {
  const context = { exports: {}, console, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(ts.transpileModule(read(relative), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, context);
  return context.exports;
}
const { MonitorScope } = load('src/utils/monitorScope.ts');
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };

test('escopo: estado continua sem tela e reconectar assinante nao reinicia efeitos', async () => {
  let starts = 0, stops = 0, notifications = 0;
  const scope = new MonitorScope(h => {
    const [value, set] = h.useState(0);
    h.useEffect(() => { starts++; return () => { stops++; }; }, []);
    return { value, set };
  });
  assert.equal(starts, 0);
  scope.start(); scope.start();
  const detach = scope.subscribe(() => { notifications++; });
  scope.getSnapshot().set(1); await flush(); detach();
  scope.getSnapshot().set(v => v + 1); await flush();
  assert.equal(scope.getSnapshot().value, 2);
  assert.equal(notifications, 1);
  scope.subscribe(() => { notifications++; });
  assert.equal(starts, 1); assert.equal(stops, 0);
  scope.dispose(); scope.dispose(); assert.equal(stops, 1);
});

test('escopo: mudanca de dependencias limpa efeito anterior uma vez', async () => {
  let preference = true, starts = 0, stops = 0;
  const scope = new MonitorScope(h => {
    h.useEffect(() => { starts++; return () => { stops++; }; }, [preference]);
    return preference;
  });
  scope.start(); scope.refresh(); await flush();
  assert.equal(starts, 1); assert.equal(stops, 0);
  preference = false; scope.refresh(); await flush();
  assert.equal(starts, 2); assert.equal(stops, 1);
  scope.dispose(); assert.equal(stops, 2);
});

test('escopo: estado e ref sao estaveis, inicializacao lazy nao se repete', async () => {
  let initialized = 0;
  const scope = new MonitorScope(h => {
    const [value, set] = h.useState(() => { initialized++; return 0; });
    const ref = h.useRef('live');
    const callback = h.useCallback(() => ref.current, []);
    return { value, set, ref, callback };
  });
  scope.start(); const before = scope.getSnapshot();
  before.ref.current = 'changed'; before.set(1); before.set(2); await flush();
  const after = scope.getSnapshot();
  assert.equal(initialized, 1); assert.equal(after.value, 2);
  assert.equal(before.set, after.set); assert.equal(before.ref, after.ref);
  assert.equal(before.callback, after.callback); assert.equal(after.callback(), 'changed');
  scope.dispose();
});

test('escopo: descarte anterior ao start e atualizacoes tardias nao criam recursos', async () => {
  let starts = 0;
  const scope = new MonitorScope(h => {
    const [value, set] = h.useState(0);
    h.useEffect(() => { starts++; }, []);
    return { value, set };
  });
  const original = scope.getSnapshot();
  original.set(1); scope.dispose(); scope.start(); await flush();
  original.set(2); await flush();
  assert.equal(starts, 0); assert.equal(scope.getSnapshot(), original);
});

function registry({ drain } = {}) {
  const auth = { currentUser: { uid: 'A' } }, observers = new Set(), storage = new Set();
  const calls = { starts: [], disposals: [], cleanups: [], emergencyCancel: 0 };
  const module = load('src/services/persistentMonitor.ts', {
    'firebase/auth': { onAuthStateChanged: (_auth, callback) => { observers.add(callback); return () => observers.delete(callback); } },
    './firebaseConfig': { auth },
    './accountStorage': { subscribeAccountStorage: callback => { storage.add(callback); return () => storage.delete(callback); } },
    '../utils/monitorScope': { MonitorScope },
    '../hooks/useEsp32Monitor': { runEsp32Monitor: (h, preferences) => {
      const owner = auth.currentUser.uid;
      h.useEffect(() => { calls.starts.push(owner); return () => { calls.cleanups.push(owner); }; }, []);
      return { preferences, liberarRecursosDoMonitor: () => { calls.disposals.push(owner); return drain ?? Promise.resolve(); } };
    } },
  });
  const preferences = { autoConnect: true, notificationsEnabled: true, themeMode: 'dark' };
  return { ...module, auth, calls, preferences,
    account: owner => { auth.currentUser = owner ? { uid: owner } : null; observers.forEach(fn => fn(auth.currentUser)); },
    save: value => storage.forEach(fn => fn('@escolta_preferences_v2', value)),
  };
}

test('sessao: mesma conta reusa controlador depois de remover e abrir tela', async () => {
  const m = registry();
  const first = m.getPersistentMonitor('A', m.preferences); await flush();
  const detach = first.scope.subscribe(() => {}); detach();
  const second = m.getPersistentMonitor('A', m.preferences); await flush();
  assert.equal(first, second); assert.deepEqual(m.calls.starts, ['A']);
  assert.deepEqual(m.calls.disposals, []);
  m.account(null); await flush();
});

test('sessao: perda da conta limpa recursos sem cancelar emergencia por confirmacao ficticia', async () => {
  const m = registry();
  m.getPersistentMonitor('A', m.preferences); await flush();
  m.account(null); m.account(null); await flush();
  assert.deepEqual(m.calls.disposals, ['A']); assert.deepEqual(m.calls.cleanups, ['A']);
  assert.equal(m.calls.emergencyCancel, 0);
  assert.throws(() => m.getPersistentMonitor('A', m.preferences), /indisponível/);
});

test('sessao: nova conta aguarda descarte do GATT anterior antes de iniciar', async () => {
  let finish;
  const m = registry({ drain: new Promise(resolve => { finish = resolve; }) });
  m.getPersistentMonitor('A', m.preferences); await flush();
  m.account('B'); const next = m.getPersistentMonitor('B', m.preferences); await flush();
  assert.deepEqual(m.calls.starts, ['A']);
  finish(); await flush(); assert.deepEqual(m.calls.starts, ['A', 'B']);
  assert.notEqual(next.owner, 'A'); m.account(null); await flush();
});

test('sessao: conta descartada durante barreira nao inicia controlador fantasma', async () => {
  let finish;
  const m = registry({ drain: new Promise(resolve => { finish = resolve; }) });
  m.getPersistentMonitor('A', m.preferences); await flush();
  m.account('B'); m.getPersistentMonitor('B', m.preferences); m.account(null);
  finish(); await flush();
  assert.deepEqual(m.calls.starts, ['A']);
});

test('sessao: preferencias salvas atualizam monitor sem tela; JSON invalido e ignorado', async () => {
  const m = registry(); const current = m.getPersistentMonitor('A', m.preferences); await flush();
  m.save('{invalid'); await flush(); assert.equal(current.scope.getSnapshot().preferences.autoConnect, true);
  m.save(JSON.stringify({ autoConnect: false, notificationsEnabled: 'wrong', themeMode: 'light' })); await flush();
  assert.equal(current.scope.getSnapshot().preferences.autoConnect, false);
  assert.equal(current.scope.getSnapshot().preferences.notificationsEnabled, true);
  assert.equal(current.scope.getSnapshot().preferences.themeMode, 'light');
  assert.deepEqual(m.calls.starts, ['A']); m.account(null); await flush();
});

test('contrato: somente teste usa monitor persistente e desmontar tela nao dispoe sessao', () => {
  assert.match(read('App.tsx'), /VALIDATED_MONITOR_ENABLED \? usePersistentEsp32Monitor\(\) : useEsp32Monitor\(\)/);
  const hook = read('src/hooks/usePersistentEsp32Monitor.ts');
  assert.match(hook, /useSyncExternalStore/);
  assert.doesNotMatch(hook, /disconnectBle|\.dispose\(|encerrarMonitoramento\(/);
  assert.doesNotMatch(read('src/services/persistentMonitor.ts'), /\.encerrarMonitoramento\(/);
});
