const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, deps, globals) {
  const c = { exports: {}, require: name => deps[name], ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, c);
  return c.exports;
}
async function setup(options = {}) {
  const timers = new Map(), intervals = [], callbacks = {}, statuses = [], connections = [];
  const nativeTicks = [], appStateListeners = new Set();
  const appState = { currentState: 'active', addEventListener: (_event, fn) => {
    appStateListeners.add(fn); return { remove: () => appStateListeners.delete(fn) };
  } };
  let resolveConnect, reads = 0, writes = 0, cancelled = 0, clock = 100000;
  class ClockDate extends Date { static now() { return clock; } }
  const globals = { console: { warn() {} },
    Date: ClockDate, __DEV__: options.development === true,
    setTimeout: (callback, ms) => { const key = {}; timers.set(key, { callback, ms }); return key; },
    clearTimeout: key => timers.delete(key),
    setInterval: callback => { intervals.push(callback); return intervals.length; }, clearInterval() {},
  };
  const device = {
    name: 'ESCOLTA_BLE',
    connect: options.pendingConnect ? () => new Promise(r => { resolveConnect = r; }) : async () => device,
    discoverAllServicesAndCharacteristics: async () => {},
    monitorCharacteristicForService: (_s, _c, cb) => { callbacks.notify = cb; return { remove() {} }; },
    onDisconnected: cb => { callbacks.disconnect = cb; return { remove() {} }; },
    cancelConnection: async () => { cancelled++; },
    readRSSI: () => { reads++; return options.hangingRead ? new Promise(() => {}) : Promise.resolve({ rssi: -62 }); },
    writeCharacteristicWithResponseForService: async () => { writes++; },
  };
  class Manager { state = async () => 'PoweredOn'; stopDeviceScan() {} startDeviceScan(_i, _o, cb) { cb(null, device); } }
  const deps = {
    'react-native-ble-plx': { BleManager: Manager },
    'react-native': { AppState: appState, Platform: { OS: 'ios', Version: 19 }, PermissionsAndroid: {} },
    './nativeIdentity': { IS_TEST_BUILD: options.testBuild === true,
      BATTERY_STUDY_ENABLED: options.batteryStudy === true,
      DEV_RSSI_WATCHDOG_EXPERIMENT_ENABLED: options.development === true && options.testBuild === true,
      VALIDATED_MONITOR_ENABLED: options.validatedMonitor ?? options.testBuild === true },
    './backgroundSentinel': { subscribeBackgroundProtectionTick: fn => {
      if (!options.nativeTicks) return null;
      const tick = { fn, active: true }; nativeTicks.push(tick);
      return () => { tick.active = false; };
    } },
    buffer: require('node:buffer'),
    '../utils/proximityTrial': load('src/utils/proximityTrial.ts', {}, globals),
    '../utils/telemetry': load('src/utils/telemetry.ts', {}, globals),
    '../utils/safetyConfirmation': load('src/utils/safetyConfirmation.ts', {}, globals),
    '../utils/asyncTimeout': load('src/utils/asyncTimeout.ts', {}, globals),
    './blePermissions': { ensureBlePermissions: async () => {} },
  };
  const api = load('src/services/bleApi.ts', deps, globals);
  api.setBleCallbacks(v => statuses.push(v), v => connections.push(v));
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  const connection = api.connectBle();
  await flush();
  if (!options.pendingConnect) await connection;
  return { api, connection, timers, intervals, device, statuses, connections, flush,
    nativeTick: () => nativeTicks.filter(t => t.active).forEach(t => t.fn()),
    nativeTickCount: () => nativeTicks.filter(t => t.active).length,
    appState: value => { appState.currentState = value; appStateListeners.forEach(fn => fn(value)); },
    reads: () => reads, cancelled: () => cancelled,
    writes: () => writes, advance: ms => { clock += ms; },
    finishConnect: () => resolveConnect(device),
    emit: data => callbacks.notify(null, { value: Buffer.from(JSON.stringify(data)).toString('base64') }),
    oldDisconnect: () => callbacks.disconnect(null, device),
  };
}
const status = { rssi: -62, estado: 'seguro', panico_ativo: false, monitoramento_ativo: true };

test('autonomia BLE: cache é opt-in, copia somente telemetria e não cria operações adicionais',async()=>{
  const off=await setup();off.emit({...status,bateria_v:4.1});
  assert.equal(off.api.getAutonomyTelemetry(),null);await off.api.disconnectBle();
  const m=await setup({batteryStudy:true});
  assert.equal(m.api.getAutonomyTelemetry(),null);
  const reads=m.reads(),writes=m.writes(),timers=m.intervals.length;
  m.emit({...status,fw:'xiao-p5-r4-d1-k2-w1',bateria_v:4.1,bateria_pct:100,usb_conectado:false,carregando:false,segredo:'não copiar'});
  const packet=m.api.getAutonomyTelemetry();
  assert.equal(packet.at,100000);assert.equal(packet.status.bateria_v,4.1);
  assert.equal(packet.status.segredo,undefined);packet.status.bateria_v=0;
  assert.equal(m.api.getAutonomyTelemetry().status.bateria_v,4.1);
  assert.equal(m.reads(),reads);assert.equal(m.writes(),writes);assert.equal(m.intervals.length,timers);
  m.emit({...status,bateria_v:4.09});
  assert.equal(m.api.getAutonomyTelemetry().status.usb_conectado,undefined);
  await m.api.disconnectBle();assert.equal(m.api.getAutonomyTelemetry(),null);
  await m.api.connectBle();assert.equal(m.api.getAutonomyTelemetry(),null);
  m.emit(status);m.oldDisconnect();assert.equal(m.api.getAutonomyTelemetry(),null);
});

test('JSON incompleto não chega ao monitor; freshness só existe depois de leitura real', async () => {
  const m = await setup();
  m.emit({ estado: 'seguro' });
  assert.equal(m.statuses.length, 0);
  m.emit(status); assert.equal(m.statuses[0].rssiFresh, false);
  await m.intervals[0]();
  m.emit(status); assert.equal(m.statuses[1].rssiFresh, true);
  await m.api.disconnectBle();
});

const w1Status = { ...status, fw: 'xiao-p5-r4-d1-k2-w1', rssi_raw: -62, distancia_m: 1 };
async function readyW1(options = {}) {
  const m = await setup({ testBuild: true, development: true, ...options });
  await m.intervals[0](); m.emit(w1Status);
  return m;
}

test('injeção W1 bloqueada em release Teste, em oficial dev e sem __DEV__', async () => {
  for (const options of [{ testBuild: true }, { testBuild: false, development: true }, {}]) {
    const m = await readyW1({ development: false, ...options });
    assert.equal(m.api.RSSI_WATCHDOG_EXPERIMENT_AVAILABLE, false);
    assert.throws(() => m.api.startRssiWatchdogExperiment(), /indisponível/);
    assert.equal(m.api.deferRssiRecoveryForWatchdogExperiment(), false);
    await m.intervals[0](); assert.equal(m.writes(), 2);
    await m.api.disconnectBle();
  }
});

test('injeção W1 exige status fresco seguro, tag exata e proteção ativa', async () => {
  const m = await readyW1();
  for (const override of [{ fw: 'xiao-p5-r4-d1-k2' }, { monitoramento_ativo: false },
    { panico_ativo: true }, { rssi: -90 }, { estado: 'atencao' }]) {
    m.emit({ ...w1Status, ...override });
    assert.throws(() => m.api.startRssiWatchdogExperiment(), /Retome a proteção/);
  }
  m.emit(w1Status); m.advance(2501);
  assert.throws(() => m.api.startRssiWatchdogExperiment(), /Retome a proteção/);
  await m.api.disconnectBle();
});

test('injeção W1 suspende escrita 15 s sem GATT falso nem freshness inventada e retoma automaticamente', async () => {
  const m = await readyW1();
  m.api.startRssiWatchdogExperiment();
  assert.throws(() => m.api.startRssiWatchdogExperiment(), /Aguarde/);
  await m.intervals[0](); m.emit(w1Status);
  assert.equal(m.writes(), 1); assert.equal(m.reads(), 1);
  assert.equal(m.statuses.at(-1).rssiFresh, false);
  assert.equal(m.api.isBleConnected(), true); assert.equal(m.cancelled(), 0);
  m.advance(8000); m.emit({ ...w1Status, estado: 'panico', panico_ativo: true });
  assert.equal(m.api.getRssiWatchdogExperiment().panicAfterMs, 8000);
  assert.equal(m.api.getRssiWatchdogExperiment().notifications, 2);
  assert.equal(m.api.deferRssiRecoveryForWatchdogExperiment(), true);
  m.advance(6999); await m.intervals[0](); assert.equal(m.writes(), 1);
  m.advance(1); await m.intervals[0]();
  assert.equal(m.writes(), 2); assert.equal(m.api.getRssiWatchdogExperiment().resumed, true);
  m.emit({ ...w1Status, estado: 'panico', panico_ativo: true });
  assert.equal(m.statuses.at(-1).rssiFresh, true);
  assert.equal(m.statuses.at(-1).panico_ativo, true); // Retomar leituras não simula reset/ACK.
  m.advance(3000);
  assert.equal(m.api.deferRssiRecoveryForWatchdogExperiment(), false);
  assert.equal(m.api.getRssiWatchdogExperiment().active, false);
  assert.equal(m.cancelled(), 0); assert.deepEqual(m.connections, [true]);
  await m.api.disconnectBle();
});

test('injeção W1 não atravessa pausa, desconexão ou sessão nova e pode ser interrompida', async () => {
  for (const action of ['cancel', 'disconnect', 'remoteDisconnect', 'standby']) {
    const m = await readyW1(); m.api.startRssiWatchdogExperiment();
    if (action === 'cancel') m.api.cancelRssiWatchdogExperiment();
    if (action === 'standby') m.emit({ ...w1Status, monitoramento_ativo: false });
    if (action === 'disconnect') { await m.api.disconnectBle(); await m.api.connectBle(); }
    if (action === 'remoteDisconnect') { m.oldDisconnect(); await m.api.connectBle(); }
    assert.equal(m.api.deferRssiRecoveryForWatchdogExperiment(), false);
    assert.equal(m.api.getRssiWatchdogExperiment().active, false);
    assert.ok(m.api.getRssiWatchdogExperiment().interrupted);
    await m.intervals.at(-1)(); assert.equal(m.writes(), 2);
    await m.api.disconnectBle();
  }
});

test('injeção W1 não deixa leitura iniciada antes do clique vazar como leitura fresca', async () => {
  const m = await readyW1();
  let resolveRead;
  m.device.readRSSI = () => new Promise(resolve => { resolveRead = resolve; });
  const pending = m.intervals[0]();
  m.api.startRssiWatchdogExperiment();
  resolveRead({ rssi: -62 }); await pending;
  assert.equal(m.writes(), 1); m.emit(w1Status);
  assert.equal(m.statuses.at(-1).rssiFresh, false);
  await m.api.disconnectBle();
});

test('conexão terminada depois de cancelar não publica estado conectado', async () => {
  const m = await setup({ pendingConnect: true });
  const rejected = assert.rejects(m.connection, /cancelada/);
  await m.api.disconnectBle();
  m.finishConnect(); await m.flush(); await rejected;
  assert.equal(m.api.isBleConnected(), false);
  assert.deepEqual(m.connections, []);
});

test('leitura RSSI que nunca retorna tem timeout e limpa conexão', async () => {
  const m = await setup({ hangingRead: true });
  const reading = m.intervals[0](); await m.flush();
  assert.equal(m.reads(), 1);
  [...m.timers.values()].find(t => t.ms === 2000).callback();
  await m.flush(); await reading;
  assert.equal(m.api.isBleConnected(), false);
  assert.deepEqual(m.connections, [true, false]);
  assert.equal(m.cancelled(), 1);
});

test('retorno de listener antigo não apaga a conexão nova', async () => {
  const m = await setup();
  const old = m.oldDisconnect;
  // Guarda o callback real, pois o dispositivo simulado é reutilizado.
  let oldCallback;
  const original = m.device.onDisconnected;
  m.device.onDisconnected = cb => { oldCallback = cb; return original(cb); };
  await m.api.disconnectBle(); await m.api.connectBle();
  const stale = oldCallback;
  await m.api.disconnectBle(); await m.api.connectBle();
  stale(null, m.device);
  assert.equal(m.api.isBleConnected(), true);
  await m.api.disconnectBle();
});

test('reset só conclui quando o estado seguro é confirmado pela placa', async () => {
  const m = await setup();
  let finished = false;
  const resetting = m.api.resetarAlarmeBle().then(() => { finished = true; });
  await m.flush(); assert.equal(finished, false);
  m.emit({ ...status, estado: 'panico', panico_ativo: true });
  await m.flush(); assert.equal(finished, false);
  m.emit(status); await resetting;
  assert.equal(finished, true);
  await m.api.disconnectBle();
});

test('status anterior à conclusão da escrita não confirma reset pendente', async () => {
  const m = await setup();
  let finishWrite;
  m.device.writeCharacteristicWithResponseForService = () => new Promise(resolve => { finishWrite = resolve; });
  let finished = false;
  const resetting = m.api.resetarAlarmeBle().then(() => { finished = true; });
  m.emit(status); await m.flush();
  assert.equal(finished, false);
  finishWrite(); await m.flush();
  assert.equal(finished, false);
  m.emit(status); await resetting;
  assert.equal(finished, true);
  await m.api.disconnectBle();
});

test('teste: leituras usam pulso nativo sem duplicar temporizador e removem listener ao sair', async () => {
  const m = await setup({ testBuild: true, nativeTicks: true });
  assert.equal(m.intervals.length, 0);
  m.nativeTick(); await m.flush();
  assert.equal(m.reads(), 1);
  m.emit(status); assert.equal(m.statuses.at(-1).rssiFresh, true);
  await m.api.disconnectBle();
  assert.equal(m.nativeTickCount(), 0);
  m.nativeTick(); await m.flush();
  assert.equal(m.reads(), 1);
});

test('teste: timeout iniciado antes de desbloquear não cancela a conexão atual', async () => {
  const m = await setup({ testBuild: true, hangingRead: true });
  m.appState('background');
  const reading = m.intervals[0](); await m.flush();
  m.appState('active');
  [...m.timers.values()].find(t => t.ms === 2000).callback();
  await reading; await m.flush();
  assert.equal(m.api.isBleConnected(), true);
  assert.equal(m.cancelled(), 0);
  await m.api.disconnectBle();
});

test('teste: resposta de reset requer sinal recente forte e firmware com guarda de proximidade', async () => {
  const m = await setup({ testBuild: true });
  let finished = false;
  const resetting = m.api.resetarAlarmeBle().then(value => { finished = true; return value; });
  await m.flush();
  m.emit({ ...status, fw: 'xiao-p5-teste', rssi_raw: -62, distancia_m: 1 });
  await m.flush(); assert.equal(finished, false); // Ainda nao houve leitura local RSSI.
  await m.intervals[0]();
  m.emit({ ...status, fw: 'xiao-p4-teste', rssi_raw: -62, distancia_m: 1 });
  m.emit({ ...status, fw: 'xiao-p5-teste', rssi: -94, rssi_raw: -94, distancia_m: 9 });
  await m.flush(); assert.equal(finished, false);
  m.emit({ ...status, fw: 'xiao-p5-teste', rssi_raw: -62, distancia_m: 1 });
  const acknowledged = await resetting;
  assert.equal(acknowledged.rssi, -62); assert.equal(acknowledged.rssiFresh, true);
  await m.api.disconnectBle();
});
