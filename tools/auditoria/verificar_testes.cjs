// Gate estrito: TODO conhecido também impede declarar o projeto aprovado.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap',
  'tools/test-monitor-alerts.cjs', 'tools/test-proximity-ble.cjs',
  'tools/test-proximity-distance.cjs', 'tools/test-distance-radio4-d1.cjs',
  'tools/test-proximity-kalman-k1.cjs',
  'tools/test-proximity-trial.cjs', 'tools/test-proximity-export.cjs',
  'tools/test-trial-history.cjs', 'tools/test-communication-watchdog.cjs',
  'tools/test-account-storage.cjs', 'tools/test-ble-recovery.cjs',
  'tools/test-native-alert-bridge.cjs', 'tools/test-notifications.cjs', 'tools/test-auth-email.cjs',
  'tools/test-ble-permissions.cjs', 'tools/test-app-contracts.cjs', 'tools/test-safety-confirmation.cjs',
  'tools/test-persistent-monitor.cjs', 'tools/test-radio-diagnostics.cjs',
  'tools/test-battery-acquisition.cjs', 'tools/test-standalone-build.cjs', 'tools/test-native-identity.cjs',
  'tools/test-user-release.cjs', 'tools/test-metro-config.cjs', 'tools/test-apk-resources.cjs'], {
  cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
});
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.error) console.error(result.error.message);
const pending = /# todo\s+[1-9]\d*/.test(result.stdout || '');
if (pending) console.error('AUDITORIA NÃO APROVADA: existem regressões conhecidas pendentes (TODO).');
process.exitCode = result.status || (result.error || pending ? 1 : 0);
