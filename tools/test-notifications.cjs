const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function setup(internalTools = false) {
  const channels = new Map(), scheduled = [];
  const notification = {
    AndroidImportance: { LOW: 1, DEFAULT: 3, HIGH: 4, MAX: 5 },
    AndroidNotificationVisibility: { PRIVATE: 0, PUBLIC: 1 },
    AndroidNotificationPriority: { DEFAULT: 0, HIGH: 1, MAX: 2 },
    setNotificationHandler() {},
    setNotificationChannelAsync: async (id, channel) => channels.set(id, channel),
    getPermissionsAsync: async () => ({ granted: true }),
    scheduleNotificationAsync: async request => { scheduled.push(request); return 'test'; },
  };
  const context = { exports: {}, require: name => {
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === 'expo-notifications') return notification;
    if (name === './nativeIdentity') return { INTERNAL_TOOLS_ENABLED: internalTools };
    throw new Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/notificationService.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return { api: context.exports, channels, scheduled };
}

test('bateria usa canal silencioso sem vibração quando preferência está desligada', async () => {
  const m = setup(); await m.api.showBatteryNotification(20, false, false);
  const channel = m.channels.get(m.scheduled[0].trigger.channelId);
  assert.equal(channel.enableVibrate, false);
  assert.equal(channel.sound, null);
  assert.equal(m.scheduled[0].content.sound, false);
});

test('uso normal não cria canal de testes nem permite disparo manual de diagnóstico', async () => {
  const m = setup();
  await m.api.prepareNotifications(false);
  assert.equal(m.channels.has('escolta_diagnosticos'), false);
  await assert.rejects(m.api.showDiagnosticNotification(), /interna indisponível/);
  assert.equal(m.scheduled.length, 0);
  assert.equal(m.channels.has('escolta_emergencias_v3'), true);
});

test('opt-in interno mantém a notificação de diagnóstico isolada da emergência', async () => {
  const m = setup(true);
  await m.api.showDiagnosticNotification();
  assert.equal(m.scheduled.length, 1);
  assert.equal(m.scheduled[0].trigger.channelId, 'escolta_diagnosticos');
  assert.equal(m.scheduled[0].content.data.tipo, 'diagnostico');
  assert.equal(m.scheduled[0].content.sound, false);
});

test('bateria usa canal com vibração sem alterar canal silencioso existente', async () => {
  const m = setup();
  await m.api.showBatteryNotification(10, true, true);
  await m.api.showBatteryNotification(20, false, false);
  assert.notEqual(m.scheduled[0].trigger.channelId, m.scheduled[1].trigger.channelId);
  assert.equal(m.channels.get(m.scheduled[0].trigger.channelId).enableVibrate, true);
  assert.equal(m.channels.get(m.scheduled[1].trigger.channelId).enableVibrate, false);
});
