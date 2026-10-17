const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function setup(options = {}) {
  const calls = { requests: [], checks: [] };
  let granted = options.granted ?? false;
  const permissions = { BLUETOOTH_SCAN: 'scan', BLUETOOTH_CONNECT: 'connect', ACCESS_FINE_LOCATION: 'location' };
  const api = { PERMISSIONS: permissions,
    check: async permission => { calls.checks.push(permission); return granted; },
    requestMultiple: async requested => {
      calls.requests.push(Array.from(requested));
      if (options.pending) await options.pending;
      granted = options.accept === true;
      return {}; // Lógica precisa reconsultar, não confiar nesse retorno.
    },
  };
  const c = { exports: {}, require: name => {
    assert.equal(name, 'react-native');
    return { Platform: { OS: options.os ?? 'android', Version: options.version ?? 36 }, PermissionsAndroid: api };
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/blePermissions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, c);
  return { api: c.exports, calls, grant: value => { granted = value; } };
}

test('primeira autorização Android pede somente permissões BLE antes de prosseguir', async () => {
  const m = setup({ accept: true });
  assert.equal(await m.api.hasBlePermissions(), false);
  assert.equal(m.calls.requests.length, 0);
  await m.api.ensureBlePermissions();
  assert.deepEqual(m.calls.requests, [['scan', 'connect']]);
  assert.equal(await m.api.hasBlePermissions(), true);
  await m.api.ensureBlePermissions();
  assert.equal(m.calls.requests.length, 1);
});

test('recusa não repete diálogos em reconexões, e autorização pelas configurações recupera', async () => {
  const m = setup();
  await assert.rejects(m.api.ensureBlePermissions(), /Dispositivos próximos/);
  await assert.rejects(m.api.ensureBlePermissions(), /Dispositivos próximos/);
  assert.equal(m.calls.requests.length, 1);
  m.grant(true);
  await m.api.ensureBlePermissions();
  m.grant(false);
  assert.equal(await m.api.hasBlePermissions(), false);
  await assert.rejects(m.api.ensureBlePermissions(), /Dispositivos próximos/);
  assert.equal(m.calls.requests.length, 1);
});

test('solicitações concorrentes compartilham um único diálogo', async () => {
  let finish;
  const m = setup({ accept: true, pending: new Promise(resolve => { finish = resolve; }) });
  const first = m.api.ensureBlePermissions(), second = m.api.ensureBlePermissions();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(m.calls.requests.length, 1);
  finish();
  await Promise.all([first, second]);
});

test('Android anterior a 12 preserva solicitação de localização para descoberta BLE', async () => {
  const m = setup({ version: 30, accept: true });
  await m.api.ensureBlePermissions();
  assert.deepEqual(m.calls.requests, [['location']]);
});

test('iOS não solicita permissões Android', async () => {
  const m = setup({ os: 'ios', version: 19 });
  await m.api.ensureBlePermissions();
  assert.equal(m.calls.requests.length, 0);
  assert.equal(m.calls.checks.length, 0);
});

test('contrato nativo: início valida BLE e promoção captura recusas do Android', () => {
  const source = fs.readFileSync('modules/escolta-sentinela/android/src/main/java/expo/modules/escoltasentinela/EscoltaSentinelaService.kt', 'utf8');
  assert.match(source, /fun start\(context: Context, title: String, body: String\) \{\s+requireBluetoothPermissions\(context\)/);
  assert.match(source, /!hasBluetoothPermissions\(this\)[\s\S]*?stopSelf\(\)[\s\S]*?return START_NOT_STICKY/);
  assert.match(source, /catch \(_: SecurityException\)/);
  assert.match(source, /catch \(_: IllegalStateException\)/);
});
