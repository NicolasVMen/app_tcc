const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv, loadTrials, fit, estimate, report } = require('./calibrar-distancia-radio4.cjs');
const header = fs.readFileSync(path.join(__dirname, '../firmware/xiao_escolta_ble/ProximityDistance.h'), 'utf8');
const sketch = fs.readFileSync(path.join(__dirname, '../firmware/xiao_escolta_ble/xiao_escolta_ble.ino'), 'utf8');
const number = name => Number(header.match(new RegExp(`\\b${name} = (-?[\\d.]+)f;`))[1]);

test('D1 é opt-in restrito a radio4; padrão legado e fórmula permanecem disponíveis', () => {
  for (const macro of ['ESCOLTA_TESTE_CONFIRMACAO_PROXIMA', 'ESCOLTA_TESTE_RADIO_TX_DBM', 'ESCOLTA_TESTE_PROXIMIDADE_4DB']) {
    assert.ok(header.includes(`!defined(${macro})`));
  }
  assert.match(header, /ESCOLTA_TESTE_DISTANCIA_RADIO4 != 1/);
  assert.match(header, /static_assert\(ESCOLTA_TESTE_RADIO_TX_DBM == 4/);
  assert.match(header, /#else\s+constexpr float RSSI_REF_1M = RSSI_REF_1M_LEGADO;/);
  assert.equal(number('RSSI_REF_1M_LEGADO'), -68.44);
  assert.equal(number('N_PROPAGACAO_LEGADO'), 2.65);
  assert.doesNotMatch(sketch, /#define\s+ESCOLTA_TESTE_DISTANCIA_RADIO4/);
});
test('D1 usa todas as 360 amostras dos 12 ensaios selecionados, inclusive ambos de 4 m', () => {
  const trials = loadTrials();
  assert.equal(trials.length, 12);
  assert.equal(trials.reduce((n, t) => n + t.samples.length, 0), 360);
  assert.deepEqual(trials.filter(t => t.realM === 4).map(t => t.id), ['1792114233105-f8kh2l', '1792115514383-udl0zk']);
  const fitted = fit(trials);
  assert.ok(Math.abs(number('RSSI_REF_1M') - fitted.reference) < .000001);
  assert.ok(Math.abs(number('N_PROPAGACAO') - fitted.exponent) < .000001);
});
test('D1 dá peso igual por distância, não peso dobrado a 4/5 m', () => {
  const trials = loadTrials(), original = fit(trials);
  const duplicated = fit([...trials, ...trials.filter(t => t.realM === 4)]);
  assert.ok(Math.abs(original.reference - duplicated.reference) < 1e-10);
  assert.ok(Math.abs(original.exponent - duplicated.exponent) < 1e-10);
});
test('D1 identifica a calibração no CSV por tag exata sem alterar UUIDs/limiares', () => {
  assert.match(sketch, /#if defined\(ESCOLTA_TESTE_DISTANCIA_RADIO4\)\s+const char\* VERSAO_FIRMWARE = "xiao-p5-r4-d1";\s+#else\s+const char\* VERSAO_FIRMWARE = "xiao-p5-r4";/);
  assert.match(sketch, /\[DISTANCE_CAL\] profile=radio4-d1 ref_1m=/);
  assert.match(header, /return powf\(10\.0f, expoenteDistancia\(rssi\)\)/);
  assert.match(header, /if \(!isfinite\(rssi\) \|\| rssi < -126\.0f \|\| rssi >= 0\.0f\) return NAN/);
});
test('D1 registra melhora e piora no ajuste, não finge eliminar inversão de 4 m', () => {
  const analysis = report();
  const first4 = analysis.trials.find(t => t.id === '1792114233105-f8kh2l');
  const repeated4 = analysis.trials.find(t => t.id === '1792115514383-udl0zk');
  const ten = analysis.trials.find(t => t.realM === 10);
  assert.ok(first4.newMeanM > 7 && first4.newMeanM < 7.2);
  assert.ok(repeated4.newMeanM > 3 && repeated4.newMeanM < 3.2);
  assert.ok(ten.newMaeM > ten.oldMaeM); // Não esconder piora a 10 m.
  const model = fit(loadTrials());
  for (let rssi = -125; rssi < -1; rssi++) assert.ok(estimate(rssi, model) > estimate(rssi + 1, model));
});
test('leitor da fixture respeita BOM, aspas, ponto e vírgula e notas com quebra de linha', () => {
  assert.deepEqual(parseCsv('\uFEFF"a";"b"\r\n"1";"nota; com ""aspas""\nlinha"'), [{a:'1',b:'nota; com "aspas"\nlinha'}]);
  assert.throws(() => parseCsv('a;b\n1'), /colunas/);
});
