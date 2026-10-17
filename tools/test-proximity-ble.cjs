// Integração isolada: simula BLE sem acessar telefone, rede ou placa.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function loadTs(relative, dependencies, globals = {}) {
  const filename = path.join(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = { exports: {}, require: name => {
    if (!(name in dependencies)) throw new Error(`Import inesperado: ${name}`);
    return dependencies[name];
  }, ...globals };
  vm.runInNewContext(code, context, { filename });
  return context.exports;
}

test('observação preserva callbacks, não sobrepõe leituras e limpa dados ao desconectar', async () => {
  let tick, notify, disconnected, resolveRead;
  let reads = 0, writes = 0;
  const device = {
    name: 'ESCOLTA_BLE',
    connect: async () => device,
    discoverAllServicesAndCharacteristics: async () => {},
    monitorCharacteristicForService: (service, char, callback) => { notify = callback; },
    onDisconnected: callback => { disconnected = callback; },
    readRSSI: () => { reads++; return new Promise(resolve => { resolveRead = resolve; }); },
    writeCharacteristicWithResponseForService: async () => { writes++; },
    cancelConnection: async () => { disconnected(null, device); },
  };
  class Manager {
    state = async () => 'PoweredOn';
    startDeviceScan = (ids, options, callback) => callback(null, device);
    stopDeviceScan = () => {};
  }
  const trial = loadTs('src/utils/proximityTrial.ts', {});
  const api = loadTs('src/services/bleApi.ts', {
    'react-native-ble-plx': { BleManager: Manager },
    'react-native': { AppState: { currentState: 'active' }, Platform: { OS: 'ios', Version: 19 }, PermissionsAndroid: {} },
    './nativeIdentity': { IS_TEST_BUILD: false, VALIDATED_MONITOR_ENABLED: false },
    './backgroundSentinel': { subscribeBackgroundProtectionTick: () => null },
    buffer: require('node:buffer'), '../utils/proximityTrial': trial,
    '../utils/telemetry': loadTs('src/utils/telemetry.ts', {}),
    '../utils/safetyConfirmation': loadTs('src/utils/safetyConfirmation.ts', {}),
    '../utils/asyncTimeout': { withTimeout: async operation => operation },
    './blePermissions': { ensureBlePermissions: async () => {} },
  }, {
    setInterval: callback => { tick = callback; return 1; },
    clearInterval: () => {}, setTimeout: () => 2, clearTimeout: () => {},
    console: { warn: () => {} },
  });
  const statuses = [], connections = [], packets = [];
  api.setBleCallbacks(status => statuses.push(status), connected => connections.push(connected));
  const unsubscribe = api.subscribeProximityTelemetry(packet => packets.push(packet));
  const unsubscribeBroken = api.subscribeProximityTelemetry(() => { throw new Error('Erro de observador simulado'); });
  await api.connectBle();
  const emit = () => notify(null, { value: Buffer.from(JSON.stringify({
    rssi: -61, rssi_raw: -60, distancia_m: 1.2, estado: 'seguro',
    panico_ativo: false, monitoramento_ativo: true,
  })).toString('base64') });
  emit();
  assert.equal(statuses.length, 1);
  assert.equal(packets.length, 0); // Não inventa RSSI antes da primeira leitura.
  const pending = tick();
  await tick();
  assert.equal(reads, 1); // Segundo ciclo não sobrepõe a leitura pendente.
  resolveRead({ rssi: -60 });
  await pending;
  assert.equal(writes, 1);
  emit();
  assert.equal(packets.length, 1);
  assert.equal(packets[0].sampleId, 1);
  assert.equal(packets[0].phoneRssi, -60);
  assert.equal(packets[0].rawRssi, -60);
  assert.equal(statuses.length, 2); // Proteção continua recebendo o mesmo status.
  unsubscribe();
  unsubscribeBroken();
  emit();
  assert.equal(packets.length, 1);
  assert.equal(statuses.length, 3);
  await api.disconnectBle();
  assert.deepEqual(connections, [true, false]);
  assert.equal(api.isBleConnected(), false);
});
