// Ponte real transpilada; Android/Expo simulados, sem acionar o telefone.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function loadBridge(overrides = {}, permissions = true) {
  const calls = { arm: [], cancel: 0, silence: 0, resume: 0, start: 0, update: 0 };
  let silenced = false;
  const native = {
    startAsync: async () => { calls.start++; },
    updateAsync: async () => { calls.update++; },
    armEmergencyAsync: async (...args) => { calls.arm.push(args); },
    cancelEmergencyAsync: async () => { calls.cancel++; },
    silenceEmergencyAsync: async () => { calls.silence++; silenced = true; return true; },
    resumeEmergencyAsync: async () => { calls.resume++; silenced = false; return true; },
    isEmergencySilencedAsync: async () => silenced,
    isEmergencyActiveAsync: async () => true,
    isAlarmPlayingAsync: async () => true,
    ...overrides,
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/backgroundSentinel.ts'), 'utf8');
  const context = {
    exports: {}, setTimeout: callback => { queueMicrotask(callback); return 1; },
    require: name => {
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === 'expo-modules-core') return { requireOptionalNativeModule: () => native };
      if (name === '../utils/asyncTimeout') return { withTimeout: async operation => operation };
      if (name === './blePermissions') return { hasBlePermissions: async () => permissions };
      if (name === './nativeIdentity') return { IS_TEST_BUILD: overrides.testBuild !== false, VALIDATED_MONITOR_ENABLED: overrides.validatedMonitor ?? overrides.testBuild !== false };
      throw new Error(name);
    },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, context);
  return { api: context.exports, calls, native };
}

test('sirene imediata exige confirmação de áudio, independentemente de notificações', async () => {
  const m = loadBridge();
  assert.equal(await m.api.armBackgroundEmergency('Criança', 0, false, true, 'Botão físico'), true);
  assert.equal(m.calls.arm[0][2], false);
  assert.equal(m.calls.arm[0][4], 'Botão físico');
});

test('módulo antigo não é tratado como sirene corrigida', async () => {
  const m = loadBridge({ isAlarmPlayingAsync: undefined });
  assert.equal(await m.api.armBackgroundEmergency('Criança', 0, true, true), false);
  assert.equal(m.calls.arm.length, 0);
});

test('áudio não iniciado cancela solicitação nativa antes de liberar fallback', async () => {
  const m = loadBridge({ isAlarmPlayingAsync: async () => false });
  assert.equal(await m.api.armBackgroundEmergency('Criança', 0, true, true), false);
  assert.equal(m.calls.cancel, 1);
});

test('falha do comando nativo é cancelada e reportada ao fallback', async () => {
  const m = loadBridge({ armEmergencyAsync: async () => { throw new Error('Android indisponível'); } });
  await assert.rejects(m.api.armBackgroundEmergency('Criança', 0, true, true), /indisponível/);
  assert.equal(m.calls.cancel, 1);
});

test('cancelamento durante resposta de áudio impede sucesso tardio', async () => {
  let resolvePlaying;
  const m = loadBridge({ isAlarmPlayingAsync: () => new Promise(resolve => { resolvePlaying = resolve; }) });
  const result = m.api.armBackgroundEmergency('Criança', 0, true, true);
  while (!resolvePlaying) await Promise.resolve();
  await m.api.cancelBackgroundEmergency();
  resolvePlaying(true);
  assert.equal(await result, false);
});

test('estado de emergência sem reprodução não silencia fallback', async () => {
  const m = loadBridge({ isAlarmPlayingAsync: async () => false });
  assert.equal(await m.api.isBackgroundEmergencyActive(), false);
  assert.equal(await m.api.isBackgroundEmergencyLatched(), true);
});

test('silêncio explícito para a sirene nativa sem cancelar a emergência', async () => {
  const m = loadBridge({ isAlarmPlayingAsync: async () => false });
  assert.equal(await m.api.silenceBackgroundEmergency(), true);
  assert.equal(await m.api.isBackgroundEmergencySilenced(), true);
  assert.equal(m.calls.silence, 1);
  assert.equal(m.calls.cancel, 0);
  assert.equal(await m.api.isBackgroundEmergencyLatched(), true);
});

test('APK sem API nativa de silêncio não declara a sirene parada', async () => {
  const m = loadBridge({ silenceEmergencyAsync: undefined });
  assert.equal(await m.api.silenceBackgroundEmergency(), false);
  assert.equal(m.calls.cancel, 0);
});

test('som nativo ainda tocando impede confirmação falsa do silêncio', async () => {
  const m = loadBridge();
  await assert.rejects(m.api.silenceBackgroundEmergency(), /não confirmou/);
  assert.equal(m.calls.cancel, 0);
});

test('retomar sirene nativa exige áudio confirmado e preserva a emergência', async () => {
  let muted = true, playing = false;
  const m = loadBridge({
    isEmergencySilencedAsync: async () => muted,
    isAlarmPlayingAsync: async () => playing,
    resumeEmergencyAsync: async () => { m.calls.resume++; muted = false; playing = true; return true; },
  });
  assert.equal(await m.api.resumeBackgroundEmergency(), true);
  assert.equal(m.calls.resume, 1);
  assert.equal(m.calls.arm.length, 0);
  assert.equal(m.calls.cancel, 0);
  assert.equal(await m.api.isBackgroundEmergencyLatched(), true);
});

test('retomar sirene não declara sucesso sem confirmação do áudio Android', async () => {
  const m = loadBridge({ isEmergencySilencedAsync: async () => false, isAlarmPlayingAsync: async () => false });
  await assert.rejects(m.api.resumeBackgroundEmergency(), /não confirmou/);
  assert.equal(m.calls.cancel, 0);
});

test('build nativa anterior sem API de retomada não finge que religou a sirene', async () => {
  const m = loadBridge({ resumeEmergencyAsync: undefined });
  assert.equal(await m.api.resumeBackgroundEmergency(), false);
});

test('sem autorização BLE a ponte não chama nenhum início nativo, inclusive build antiga', async () => {
  const m = loadBridge({}, false);
  assert.equal(await m.api.startBackgroundSentinel(), false);
  assert.equal(await m.api.updateBackgroundSentinel('Título', 'Mensagem'), false);
  assert.equal(await m.api.armBackgroundEmergency('Criança', 0, true, true), false);
  assert.equal(m.calls.start, 0);
  assert.equal(m.calls.update, 0);
  assert.equal(m.calls.arm.length, 0);
  await m.api.cancelBackgroundEmergency();
  assert.equal(m.calls.cancel, 1); // Permissão negada não bloqueia o cancelamento.
});

test('com BLE autorizado a ponte mantém início e atualização do monitoramento', async () => {
  const m = loadBridge();
  assert.equal(await m.api.startBackgroundSentinel(), true);
  assert.equal(await m.api.updateBackgroundSentinel('Título', 'Mensagem'), true);
  assert.equal(m.calls.start, 1);
  assert.equal(m.calls.update, 1);
});

test('pulso nativo só é usado no teste novo; oficial e APK antigo retornam fallback', () => {
  let delivered = 0, listener, removed = false;
  const m = loadBridge({ protectionHeartbeatAvailable: true,
    addListener: (event, fn) => { assert.equal(event, 'onProtectionHeartbeat'); listener = fn; return { remove: () => { removed = true; } }; },
  });
  const stop = m.api.subscribeBackgroundProtectionTick(() => delivered++);
  listener({ emittedAt: Date.now() - 60000 });
  assert.equal(delivered, 0);
  listener({ emittedAt: Date.now() });
  assert.equal(delivered, 1);
  stop(); assert.equal(removed, true);
  const official = loadBridge({ testBuild: false, protectionHeartbeatAvailable: true,
    addListener: () => { throw new Error('Oficial não deve ativar o experimento'); },
  });
  assert.equal(official.api.subscribeBackgroundProtectionTick(() => {}), null);
  assert.equal(loadBridge().api.subscribeBackgroundProtectionTick(() => {}), null);
});

test('oficial opt-in preserva pulso de segundo plano sem depender do nome teste', () => {
  let delivered = 0, callback;
  const m = loadBridge({ testBuild: false, validatedMonitor: true, protectionHeartbeatAvailable: true,
    addListener: (_event, listener) => { callback = listener; return { remove: () => {} }; },
  });
  const stop = m.api.subscribeBackgroundProtectionTick(() => delivered++);
  assert.equal(typeof stop, 'function');
  callback({ emittedAt: Date.now() });
  assert.equal(delivered, 1);
  stop();
});
