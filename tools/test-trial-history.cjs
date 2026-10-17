const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, deps) {
  const c = { exports: {}, require: name => {
    if (!(name in deps)) throw new Error(`Dependência inesperada: ${name}`);
    return deps[name];
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText, c);
  return c.exports;
}
function fixture() {
  const data = new Map();
  let readFails = false, writeFails = false, gate = Promise.resolve();
  const native = { getItem: async key => {
    if (readFails) throw new Error('Disco indisponível');
    return data.get(key) ?? null;
  }, setItem: async (key, value) => {
    await gate;
    if (writeFails) throw new Error('Disco cheio');
    data.set(key, value);
  }, removeItem: async key => data.delete(key) };
  const account = load('src/services/accountStorage.ts', { '@react-native-async-storage/async-storage': native });
  const utils = load('src/utils/proximityTrial.ts', {});
  const history = load('src/services/trialHistory.ts', { './accountStorage': account, '../utils/proximityTrial': utils });
  const row = id => ({ id, distanceM: 1, condition: 'sem obstáculos', startedAt: 10000,
    endedAt: 20000, stopReason: 'interrompido', samples: [] });
  return { account, data, ...history, row,
    failReads: value => { readFails = value; }, failWrites: value => { writeFails = value; },
    delayWrites: () => { let release; gate = new Promise(resolve => { release = resolve; }); return release; } };
}
test('ensaio: gravação agendada após troca conserva explicitamente a conta da coleta', async () => {
  const f = fixture();
  await f.account.initializeAccountStorage('A');
  const store = new f.TrialHistoryStore('A');
  await store.load();
  let release;
  const previous = new Promise(resolve => { release = resolve; });
  const pending = previous.then(() => store.save([f.row('somente-A')]));
  const events = [];
  f.account.subscribeAccountStorage((...args) => events.push(args));
  await f.account.initializeAccountStorage('B');
  release(); await pending;
  assert.equal(await f.account.default.getItem(f.TRIAL_HISTORY_KEY), null);
  assert.equal(events.length, 0);
  assert.match(f.data.get(f.TRIAL_HISTORY_KEY + ':uid:A'), /somente-A/);
});
test('ensaio: fila central não permite que a primeira gravação ultrapasse a segunda', async () => {
  const f = fixture(); const s = new f.TrialHistoryStore('A'); await s.load();
  const release = f.delayWrites();
  const first = s.save([f.row('primeiro')]);
  const second = s.save([f.row('primeiro'), f.row('segundo')]);
  release(); await Promise.all([first, second]);
  assert.equal(JSON.parse(f.data.get(f.TRIAL_HISTORY_KEY + ':uid:A')).length, 2);
});
test('ensaio: JSON ilegível ou estrutura inválida são preservados e bloqueiam sobrescrita', async () => {
  for (const raw of ['', '{inválido', '{}', '[{}]', 'null']) {
    const f = fixture(); const key = f.TRIAL_HISTORY_KEY + ':uid:A'; f.data.set(key, raw);
    const s = new f.TrialHistoryStore('A');
    await assert.rejects(s.load());
    await assert.rejects(s.save([f.row('novo')]), /Carregue/);
    assert.equal(f.data.get(key), raw);
  }
});
test('ensaio: erro de leitura bloqueia escrita e repetir a leitura permite recuperar sem apagar', async () => {
  const f = fixture(); const key = f.TRIAL_HISTORY_KEY + ':uid:A';
  f.data.set(key, JSON.stringify([f.row('antigo')]));
  const s = new f.TrialHistoryStore('A'); f.failReads(true);
  await assert.rejects(s.load()); await assert.rejects(s.save([f.row('novo')]));
  f.failReads(false); const rows = await s.load(); assert.equal(rows[0].id, 'antigo');
  await s.save([...rows, f.row('novo')]); assert.equal(JSON.parse(f.data.get(key)).length, 2);
});
test('ensaio: falha de gravação mantém original e uma nova tentativa inclui os dados em memória', async () => {
  const f = fixture(); const key = f.TRIAL_HISTORY_KEY + ':uid:A';
  const s = new f.TrialHistoryStore('A'); await s.load();
  const rows = [f.row('resgatar')]; f.failWrites(true);
  await assert.rejects(s.save(rows)); assert.equal(f.data.get(key), undefined);
  assert.equal(rows[0].id, 'resgatar'); f.failWrites(false); await s.save(rows);
  assert.match(f.data.get(key), /resgatar/);
});
test('ensaio: salvar sem carregar ou sem proprietário é recusado', async () => {
  const f = fixture(); assert.throws(() => new f.TrialHistoryStore(''));
  await assert.rejects(new f.TrialHistoryStore('A').save([f.row('novo')]));
});
test('ensaio: componente bloqueia coleta após erro e permite resgate em memória após falha de escrita', () => {
  const source = fs.readFileSync('src/screens/ProximityTrialModal.tsx', 'utf8');
  assert.match(source, /new TrialHistoryStore\(accountUid/);
  assert.match(source, /writesRef\.current = write/);
  assert.doesNotMatch(source, /writesRef\.current\.then|AsyncStorage\.setItem/);
  assert.match(source, /setLoaded\(false\)/);
  assert.match(source, /TENTAR CARREGAR HISTÓRICO/);
  assert.match(source, /writesRef\.current\.catch\(\(\) => \{\}\)/);
});
