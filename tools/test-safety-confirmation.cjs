const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/safetyConfirmation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { hasCurrentSafeSignal, isSafeResetAcknowledgement, isSafetyConfirmationFirmware } = context.exports;
const safe = { fw: 'xiao-p5-teste', rssi: -70, rssi_raw: -70, rssiFresh: true,
  distancia_m: 1, estado: 'seguro', monitoramento_ativo: true, panico_ativo: false };

test('confirmação exige firmware que preserva filtro, sinal recente e estado seguro', () => {
  assert.equal(isSafeResetAcknowledgement(safe), true);
  for (const fw of [undefined, 'xiao-p2', 'xiao-p4-teste']) {
    assert.equal(hasCurrentSafeSignal({ ...safe, fw }), false);
  }
  for (const invalid of [{ rssiFresh: false }, { monitoramento_ativo: false },
    { rssi: -82 }, { rssi: -95 }, { rssi_raw: -95 }, { rssi_raw: undefined },
    { rssi: 0 }, { rssi: NaN }, { distancia_m: null }, { distancia_m: Infinity }]) {
    assert.equal(hasCurrentSafeSignal({ ...safe, ...invalid }), false);
  }
  assert.equal(isSafeResetAcknowledgement({ ...safe, estado: 'atencao' }), false);
  assert.equal(isSafeResetAcknowledgement({ ...safe, panico_ativo: true }), false);
});

test('K1: tag exata exige cru e filtrado > -77, sem alterar regras das variantes antigas', () => {
  const fw = 'xiao-p5-r4-d1-k1';
  assert.equal(isSafetyConfirmationFirmware(fw), true);
  assert.equal(isSafeResetAcknowledgement({ ...safe, fw }), true);
  for (const invalid of [{rssi: -77}, {rssi: -78}, {rssi_raw: -77}, {rssi_raw: -78},
    {rssiFresh: false}, {monitoramento_ativo: false}, {panico_ativo: true}, {estado: 'atencao'}, {distancia_m:null}]) {
    assert.equal(isSafeResetAcknowledgement({ ...safe, fw, ...invalid }), false);
  }
  assert.equal(isSafeResetAcknowledgement({ ...safe, fw: 'xiao-p5-r4-d1', rssi:-78,rssi_raw:-78 }), true);
  for (const wrong of ['xiao-p5-r4-d1-k10', 'xiao-p5-r4-d1-k1-other', 'xiao-p5-r4-k1']) {
    assert.equal(isSafetyConfirmationFirmware(wrong), false);
  }
});

test('K2: aceita somente tag exata, preserva minimo -77 e exige ACK seguro recente', () => {
  const fw = 'xiao-p5-r4-d1-k2';
  assert.equal(isSafeResetAcknowledgement({ ...safe, fw }), true);
  for (const invalid of [{rssi:-77}, {rssi_raw:-77}, {rssiFresh:false}, {monitoramento_ativo:false},
    {panico_ativo:true}, {estado:'atencao'}, {distancia_m:null}]) {
    assert.equal(isSafeResetAcknowledgement({ ...safe, fw, ...invalid }), false);
  }
  for (const wrong of ['xiao-p5-r4-d1-k20', 'xiao-p5-r4-d1-k2-other']) {
    assert.equal(isSafetyConfirmationFirmware(wrong), false);
  }
});

test('ensaio radio4 preserva validacao estrita e nao aceita outras variantes por prefixo', () => {
  assert.equal(isSafetyConfirmationFirmware('xiao-p5-r4'), true);
  assert.equal(isSafeResetAcknowledgement({ ...safe, fw: 'xiao-p5-r4' }), true);
  assert.equal(isSafeResetAcknowledgement({ ...safe, fw: 'xiao-p5-r4-d1' }), true);
  for (const fw of ['xiao-p5-r8', 'xiao-p5-r40', 'xiao-p5-r4-other', 'xiao-p5-r4-d10', '', null]) {
    assert.equal(isSafetyConfirmationFirmware(fw), false);
  }
  for (const invalid of [{rssi: -82}, {rssi_raw: -95}, {rssiFresh: false},
    {monitoramento_ativo: false}, {panico_ativo: true}, {estado:'atencao'}]) {
    for (const fw of ['xiao-p5-r4', 'xiao-p5-r4-d1']) {
      assert.equal(isSafeResetAcknowledgement({...safe, fw, ...invalid}), false);
    }
  }
});
