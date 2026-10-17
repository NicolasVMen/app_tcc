const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function storage() {
  const data = new Map([['@escolta_user_profile', '{"nomeCrianca":"Perfil antigo"}']]);
  const context = { exports: {}, require: () => ({
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async key => { data.delete(key); },
  }) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/accountStorage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return { data, ...context.exports };
}

test('migração copia sem apagar originais e não entrega perfil a outra conta', async () => {
  const s = storage();
  await s.initializeAccountStorage('nicolas', true);
  const original = await s.default.getItem('@escolta_user_profile');
  assert.ok(original.includes('Perfil antigo'));
  assert.ok(s.data.has('@escolta_user_profile'));
  await s.initializeAccountStorage('outra', true);
  assert.equal(await s.default.getItem('@escolta_user_profile'), null);
  await s.default.setItem('@escolta_user_profile', 'outro perfil');
  await s.initializeAccountStorage('nicolas');
  assert.equal(await s.default.getItem('@escolta_user_profile'), original);
});

test('escrita pendente conserva conta de origem e mantém a ordem', async () => {
  const s = storage();
  await s.initializeAccountStorage('a');
  const writes = [s.default.setItem('history', 'primeiro'), s.default.setItem('history', 'segundo')];
  await s.initializeAccountStorage('b');
  await Promise.all(writes);
  assert.equal(await s.default.getItem('history'), null);
  await s.initializeAccountStorage('a');
  assert.equal(await s.default.getItem('history'), 'segundo');
});

test('login novo não recebe dados legados sem dono conhecido', async () => {
  const s = storage();
  await s.initializeAccountStorage(null);
  await s.initializeAccountStorage('novo', false);
  assert.equal(await s.default.getItem('@escolta_user_profile'), null);
  assert.ok(s.data.has('@escolta_user_profile'));
});

test('preenchimento do perfil após Google preserva criança, contato e dono', async () => {
  const s = storage();
  await s.initializeAccountStorage('a');
  await s.default.setItem('@escolta_user_profile', JSON.stringify({ nomeCrianca: 'Criança', emailEmergencia: 'a@b.com' }));
  await s.ensureProfileForAccount('a', 'Responsável Google');
  const saved = JSON.parse(await s.default.getItem('@escolta_user_profile'));
  assert.equal(saved.nomeResponsavel, 'Responsável Google');
  assert.equal(saved.nomeCrianca, 'Criança');
  assert.equal(saved.emailEmergencia, 'a@b.com');
  await s.ensureProfileForAccount('a', 'Outro nome');
  assert.equal(JSON.parse(await s.default.getItem('@escolta_user_profile')).nomeResponsavel, 'Responsável Google');
  await s.initializeAccountStorage('b');
  assert.equal(await s.default.getItem('@escolta_user_profile'), null);
});

test('perfil ilegível é preservado em vez de sobrescrito no login', async () => {
  const s = storage();
  await s.initializeAccountStorage('a');
  await s.default.setItem('@escolta_user_profile', 'original ilegível');
  await s.ensureProfileForAccount('a', 'Nome');
  assert.equal(await s.default.getItem('@escolta_user_profile'), 'original ilegível');
});
