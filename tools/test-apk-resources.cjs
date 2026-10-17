const test = require('node:test');
const assert = require('node:assert/strict');
const { resourcePaths, inspectResourcePaths } = require('./auditoria/apk-resources.cjs');
const item = (name, file) => `resource 0x7f100001 com.nicolasvmen.escoltaunitau.teste:${name}: t=0x03 d=0x96 (s=0x8 r=0x00)\n  (string8) "${file}"`;

test('APK otimizado: áudio resolve pelo nome lógico, não por res/raw fixo', () => {
  const result = inspectResourcePaths(item('raw/escolta_alerta', 'res/Ow.wav'));
  assert.deepEqual(result.nativeAlarm, ['res/Ow.wav']);
  assert.deepEqual(result.fallbackAlarm, []);
});

test('APK: declaração sem arquivo, recurso ausente ou nome parecido não aprovam áudio', () => {
  for (const table of ['', 'spec resource 0x7f100001 pkg:raw/escolta_alerta: flags=0x0',
    item('raw/escolta_alerta_old', 'res/old.wav'), item('drawable/escolta_alerta', 'res/file.wav')]) {
    assert.deepEqual(inspectResourcePaths(table).nativeAlarm, []);
  }
});

test('APK: preserva variantes válidas, elimina duplicata e recusa caminho fora de recursos', () => {
  const table = ['res/one.wav', 'res/two.wav', 'res/one.wav', '../secret', 'res/../secret', 'assets/sound.wav']
    .map(file => item('raw/escolta_alerta', file)).join('\r\n');
  assert.deepEqual(resourcePaths(table, 'raw', 'escolta_alerta'), ['res/one.wav', 'res/two.wav']);
});

test('APK: ícone Google, fonte Ionicons e fallback possuem resoluções independentes', () => {
  const result = inspectResourcePaths([
    item('raw/assets_alert_tone', 'res/ti.wav'),
    item('raw/node_modules_expo_vectoricons_build_vendor_reactnativevectoricons_fonts_ionicons', 'res/CU.ttf'),
    item('drawable/assets_googleg', 'res/7x.png'),
  ].join('\n'));
  assert.deepEqual(result.fallbackAlarm, ['res/ti.wav']);
  assert.deepEqual(result.ionicons, ['res/CU.ttf']);
  assert.deepEqual(result.googleIcon, ['res/7x.png']);
  assert.deepEqual(result.nativeAlarm, []);
});
