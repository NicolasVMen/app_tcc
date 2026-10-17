const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
// Os static_assert reais são compilados por tools/test-proximity-signal.ps1.
test('injeção manual W1 é restrita ao dev Teste e nunca inicia ao abrir diagnóstico', () => {
  const identity = fs.readFileSync('src/services/nativeIdentity.ts', 'utf8');
  assert.match(identity, /typeof __DEV__ !== 'undefined' && __DEV__ && IS_TEST_BUILD/);
  assert.match(identity, /process\.env\.EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS === 'true'/);
  assert.match(identity, /DEV_RSSI_WATCHDOG_EXPERIMENT_ENABLED = INTERNAL_TOOLS_ENABLED/);
  const ble = fs.readFileSync('src/services/bleApi.ts', 'utf8');
  assert.match(ble, /RSSI_WATCHDOG_EXPERIMENT_AVAILABLE = DEV_RSSI_WATCHDOG_EXPERIMENT_ENABLED === true/);
  const screen = fs.readFileSync('src/screens/SystemDiagnosticsModal.tsx', 'utf8');
  assert.match(screen, /RSSI_WATCHDOG_EXPERIMENT_AVAILABLE && <RssiWatchdogExperimentPanel/);
  const panel = fs.readFileSync('src/screens/RssiWatchdogExperimentPanel.tsx', 'utf8');
  const effect = panel.split('useEffect(() => {')[1].split('}, []);')[0];
  assert.doesNotMatch(effect, /startRssiWatchdogExperiment\(/);
  assert.match(panel, /Alert.alert\(/);
  assert.match(panel, /emergência real/);
});
test('watchdog W1: é opt-in K2, não substitui os limites de distância nem a perda real', () => {
  const source = fs.readFileSync('firmware/xiao_escolta_ble/xiao_escolta_ble.ino', 'utf8');
  assert.match(source, /ESCOLTA_TESTE_WATCHDOG_RSSI != 1 \|\| !defined\(ESCOLTA_TESTE_KALMAN_K2\)/);
  assert.match(source, /VERSAO_FIRMWARE = "xiao-p5-r4-d1-k2-w1"/);
  assert.match(source, /if \(emEspera\) watchdogRssi\.desarmar\(\);\s*else watchdogRssi\.armar\(millis\(\)\)/);
  const connect = source.split('void aoConectar')[1].split('void aoDesconectar')[0];
  assert.match(connect, /watchdogRssi\.armar\(millis\(\)\)/);
  assert.doesNotMatch(connect, /modoPanico\s*=\s*false|restaurarEstadoSeguro\(\)/);
  const process = source.split('void processarSinal')[1].split('void atualizarBuzzer')[0];
  assert.ok(process.indexOf('if (!conectado)') < process.indexOf('watchdogRssi.expirou'));
  assert.ok(process.indexOf('watchdogRssi.recebeu') < process.indexOf('watchdogRssi.expirou'));
  assert.match(process, /watchdogRssi\.expirou\(millis\(\)\) && !modoPanico/);
  assert.ok(process.indexOf('watchdogRssi.expirou') < process.indexOf('if (!rssiAtualizado) return'));
  assert.doesNotMatch(process, /modoPanico\s*=\s*false/);
  assert.match(source, /DEBOUNCE_DESCONEXAO_AMOSTRAS = 10/);
});
test('watchdog W1: confirmação conserva os limites K2 e recusa telemetria antiga', () => {
  const c = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/safetyConfirmation.ts', 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, c);
  const safe = { fw: 'xiao-p5-r4-d1-k2-w1', monitoramento_ativo: true, rssiFresh: true,
    rssi: -76, rssi_raw: -76, distancia_m: 2, estado: 'seguro', panico_ativo: false };
  assert.equal(c.exports.isSafeResetAcknowledgement(safe), true);
  for (const override of [{ rssi: -77 }, { rssi_raw: -77 }, { rssiFresh: false },
    { panico_ativo: true }, { distancia_m: null }, { monitoramento_ativo: false }]) {
    assert.equal(c.exports.isSafeResetAcknowledgement({ ...safe, ...override }), false);
  }
});
