const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const plugin = require('./plugins/with-test-build.cjs');
function identity(native, development = false, internalTools) {
  const context = { exports: {}, __DEV__: development, process: { env: { EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS: internalTools } }, require: name => {
    assert.equal(name, 'expo-modules-core');
    return { requireOptionalNativeModule: () => native };
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/nativeIdentity.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
}

test('identidade: injeção RSSI só existe em Teste de desenvolvimento, nunca release ou oficial validada', () => {
  for (const development of [true, false]) {
    for (const isTestBuild of [true, false]) {
      const result = identity({ isTestBuild, validatedMonitorEnabled: true }, development, 'true');
      assert.equal(result.DEV_RSSI_WATCHDOG_EXPERIMENT_ENABLED, development && isTestBuild);
    }
  }
});

test('identidade: ferramentas internas ficam desligadas por padrão e só aceitam opt-in explícito', () => {
  for (const setting of [undefined, '', 'false', 'TRUE', '1']) {
    const result = identity({ isTestBuild: true }, true, setting);
    assert.equal(result.INTERNAL_TOOLS_ENABLED, false);
    assert.equal(result.DEV_RSSI_WATCHDOG_EXPERIMENT_ENABLED, false);
  }
  assert.equal(identity({ isTestBuild: true }, true, 'true').INTERNAL_TOOLS_ENABLED, true);
});

test('identidade: oficial padrão e módulo antigo não são promovidos automaticamente', () => {
  for (const native of [null, {}, { isTestBuild: false }, { isTestBuild: false, validatedMonitorEnabled: 'true' }]) {
    const result = identity(native);
    assert.equal(result.IS_TEST_BUILD, false);
    assert.equal(result.VALIDATED_MONITOR_ENABLED, false);
    assert.equal(result.APP_SCHEME, 'escolta');
  }
});

test('identidade: teste existente mantém correções mesmo antes da nova constante nativa', () => {
  const result = identity({ isTestBuild: true });
  assert.equal(result.VALIDATED_MONITOR_ENABLED, true);
  assert.equal(result.APP_DISPLAY_NAME, 'Escolta Teste');
  assert.equal(result.APP_SCHEME, 'escolta-teste');
});

test('identidade: futura oficial opt-in usa monitor corrigido sem trocar identidade ou Firebase', () => {
  const result = identity({ isTestBuild: false, validatedMonitorEnabled: true });
  assert.equal(result.IS_TEST_BUILD, false);
  assert.equal(result.VALIDATED_MONITOR_ENABLED, true);
  assert.equal(result.APP_DISPLAY_NAME, 'Escolta UNITAU');
  assert.equal(result.APP_SCHEME, 'escolta');
  const app = fs.readFileSync('App.tsx', 'utf8');
  assert.match(app, /VALIDATED_MONITOR_ENABLED \? usePersistentEsp32Monitor\(\) : useEsp32Monitor\(\)/);
  for (const file of ['src/services/bleApi.ts', 'src/services/backgroundSentinel.ts', 'src/hooks/useEsp32Monitor.ts']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /VALIDATED_MONITOR_ENABLED/);
    assert.doesNotMatch(source, /IS_TEST_BUILD/);
  }
});

test('identidade: opt-in nativo persistente no plugin e sem duplicar metadata', () => {
  const gradle = plugin.configureGradle('');
  assert.match(gradle, /escoltaValidatedMonitor = escoltaTestBuild \|\| project\.findProperty\('escoltaValidatedMonitor'\) == 'true'/);
  const model = { manifest: { application: [{ $: {} }] } };
  plugin.configureManifest(model); plugin.configureManifest(model);
  const values = model.manifest.application[0]['meta-data'];
  assert.equal(values.length, 1);
  assert.equal(values[0].$['android:name'], 'escolta.validated_monitor');
  assert.equal(values[0].$['android:value'], '${escoltaValidatedMonitor}');
  const native = fs.readFileSync('modules/escolta-auth/android/src/main/java/expo/modules/escoltaauth/EscoltaAuthModule.kt', 'utf8');
  assert.match(native, /getBoolean\("escolta\.validated_monitor", false\)/);
});

test('identidade: pulso e WakeLock seguem a mesma política nativa, inclusive oficial opt-in', () => {
  const base = 'modules/escolta-sentinela/android/src/main/java/expo/modules/escoltasentinela/';
  const policy = fs.readFileSync(base + 'ValidatedMonitorPolicy.kt', 'utf8');
  assert.match(policy, /packageName\.endsWith\("\.teste"\)/);
  assert.match(policy, /getBoolean\("escolta\.validated_monitor", false\)/);
  assert.match(policy, /getOrDefault\(false\)/);
  const bridge = fs.readFileSync(base + 'EscoltaSentinelaModule.kt', 'utf8');
  const service = fs.readFileSync(base + 'EscoltaSentinelaService.kt', 'utf8');
  assert.equal((bridge.match(/ValidatedMonitorPolicy\.isEnabled\(it\)/g) || []).length, 2);
  assert.match(service, /if \(ValidatedMonitorPolicy\.isEnabled\(this\) && !heartbeatStarted\)/);
  assert.doesNotMatch(bridge, /endsWith\("\.teste"\)/);
  // Os esquemas de deep link mantêm a identidade: a restrição removida é só do recurso.
  assert.match(service, /packageName\.endsWith\("\.teste"\).*escolta-teste:\/\/central/);
  assert.equal(identity({ isTestBuild: false, validatedMonitorEnabled: true }).VALIDATED_MONITOR_ENABLED, true);
  assert.equal(identity({ isTestBuild: false, validatedMonitorEnabled: false }).VALIDATED_MONITOR_ENABLED, false);
});
