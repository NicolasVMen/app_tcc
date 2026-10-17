const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { report, selfTest } = require('./comparar-alarmes-3-5m.cjs');

test('K1: simulacao reproduzivel mantem dados desfavoraveis e limite conhecido de 5 m', () => {
  selfTest();
  const r = report();
  assert.equal(r.candidates.length, 11);
  assert.deepEqual(r.counts, { training:360, comparison:210, controls:120 });
  const k1 = r.fixedLimitsComparison.find(p => p.profile === 'Kalman-Q1-R4');
  assert.ok(Math.abs(k1.common - 6 / 7) < 1e-10);
  assert.equal(k1.commonDetails.find(d => d.realM === 5).final, 0);
  assert.equal(k1.commonDetails.find(d => d.realM === 4).final, 1);
});
test('K1: opt-in nao substitui perfil legado, D1 nem potencia por padrao', () => {
  const h = fs.readFileSync('firmware/xiao_escolta_ble/ProximitySignal.h', 'utf8');
  assert.match(h, /ESCOLTA_TESTE_KALMAN_K1 != 1/);
  for (const macro of ['ESCOLTA_TESTE_PROXIMIDADE_4DB','ESCOLTA_TESTE_CONFIRMACAO_PROXIMA',
    'ESCOLTA_TESTE_DISTANCIA_RADIO4','ESCOLTA_TESTE_RADIO_TX_DBM']) assert.ok(h.includes(`!defined(${macro})`));
  assert.match(h, /KALMAN_Q_POR_SEGUNDO = 1\.0f/);
  assert.match(h, /KALMAN_R = 4\.0f/);
  assert.match(h, /float\(intervaloMs\) \/ 1000\.0f/);
  assert.match(h, /#elif defined\(ESCOLTA_TESTE_PROXIMIDADE_4DB\)/);
  const sketch = fs.readFileSync('firmware/xiao_escolta_ble/xiao_escolta_ble.ino', 'utf8');
  assert.match(sketch, /VERSAO_FIRMWARE = "xiao-p5-r4-d1-k1"/);
  assert.doesNotMatch(sketch, /#define\s+ESCOLTA_TESTE_KALMAN_K1/);
});

test('K2: opt-in separado preserva K1 e identifica alteracao somente do vermelho', () => {
  const h = fs.readFileSync('firmware/xiao_escolta_ble/ProximitySignal.h', 'utf8');
  assert.match(h, /ESCOLTA_TESTE_KALMAN_K2 != 1 \|\| !defined\(ESCOLTA_TESTE_KALMAN_K1\)/);
  assert.match(h, /#if defined\(ESCOLTA_TESTE_KALMAN_K2\)\s+constexpr int PERIGO_ENTRA = -90;\s+constexpr int PERIGO_SAI = -86;\s+#else\s+constexpr int PERIGO_ENTRA = -85;/);
  const sketch = fs.readFileSync('firmware/xiao_escolta_ble/xiao_escolta_ble.ino', 'utf8');
  assert.match(sketch, /VERSAO_FIRMWARE = "xiao-p5-r4-d1-k2"/);
  assert.match(sketch, /profile=k2 q_per_s=1 r=4 yellow=-77 red=-90 hold_ms=4000/);
  assert.doesNotMatch(sketch, /#define\s+ESCOLTA_TESTE_KALMAN_K2/);
});
