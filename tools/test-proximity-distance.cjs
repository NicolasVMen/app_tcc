// Reproduz a análise da escala; não substitui validação física independente.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root,
  'docs/testes/dados/proximidade-elevada-2026-10-06.json'), 'utf8'));
const header = fs.readFileSync(path.join(root,
  'firmware/xiao_escolta_ble/ProximityDistance.h'), 'utf8');
const signalHeader = fs.readFileSync(path.join(root,
  'firmware/xiao_escolta_ble/ProximitySignal.h'), 'utf8');
const cppTests = fs.readFileSync(path.join(__dirname, 'test-proximity-signal.cpp'), 'utf8');
const constant = (source, name) => {
  const found = source.match(new RegExp(`\\b${name} = (-?[\\d.]+)f?;`));
  assert.ok(found, `Constante ${name} não encontrada`);
  return Number(found[1]);
};
// A regressão histórica continua testando o perfil legado, que não foi promovido.
const reference = constant(header, 'RSSI_REF_1M_LEGADO');
const exponent = constant(header, 'N_PROPAGACAO_LEGADO');
const alpha = constant(signalHeader, 'ALFA');
const windowSize = constant(signalHeader, 'JANELA');
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)]
    + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2;
};
const distance = rssi => 10 ** ((reference - rssi) / (10 * exponent));

// Ajuste inverso: o valor previsto é log10(distância), a variável de entrada
// é o RSSI filtrado realmente exportado. Cada distância tem 30 amostras.
function fit(trials) {
  const points = trials.flatMap(trial => trial.originalFilteredRssi.map(rssi => ({
    x: rssi, y: Math.log10(trial.realM),
  })));
  const xMean = mean(points.map(p => p.x));
  const yMean = mean(points.map(p => p.y));
  const slope = points.reduce((sum, p) => sum + (p.x - xMean) * (p.y - yMean), 0)
    / points.reduce((sum, p) => sum + (p.x - xMean) ** 2, 0);
  return { reference: xMean - yMean / slope, exponent: -1 / (10 * slope) };
}

// Simulação somente dos 30 instantâneos disponíveis, reiniciada por ensaio.
// Não inventa as leituras intermediárias nem o aquecimento não exportado.
function replay(trial) {
  const window = [];
  let filtered;
  return trial.phoneRssi.map(rssi => {
    window.push(rssi);
    if (window.length > windowSize) window.shift();
    const middle = median(window);
    filtered = filtered === undefined ? middle : alpha * middle + (1 - alpha) * filtered;
    return filtered;
  });
}

const summaries = fixture.trials.map(trial => {
  const simulated = replay(trial).map(distance);
  const error = values => mean(values.map(value => Math.abs(value - trial.realM)));
  return { realM: trial.realM, originalMean: mean(trial.originalEstimatedM),
    replayMean: mean(simulated), replayMin: Math.min(...simulated),
    replayMax: Math.max(...simulated), originalMae: error(trial.originalEstimatedM),
    replayMae: error(simulated) };
});

test('calibração legada reproduz os coeficientes das quatro coletas históricas', () => {
  const fitted = fit(fixture.trials);
  assert.equal(Number(fitted.reference.toFixed(2)), reference);
  assert.equal(Number(fitted.exponent.toFixed(2)), exponent);
  assert.deepEqual(fixture.trials.map(t => t.realM), [1, 3, 5, 7]);
  for (const trial of fixture.trials) {
    for (const field of ['phoneRssi', 'originalFilteredRssi', 'originalEstimatedM', 'timeOffsetsMs']) {
      assert.equal(trial[field].length, 30);
      assert.ok(trial[field].every(Number.isFinite));
    }
    assert.equal(trial.timeOffsetsMs[0], 0);
    assert.ok(trial.timeOffsetsMs.every((t, i, times) => i === 0 || t > times[i - 1]));
  }
});

test('RSSI e horários analisados são os mesmos verificados pelo C++ real', () => {
  for (const trial of fixture.trials) {
    for (const [prefix, field] of [['rssi', 'phoneRssi'], ['ms', 'timeOffsetsMs']]) {
      const array = cppTests.match(new RegExp(`${prefix}${trial.realM}\\[\\] = \\{([^}]+)\\}`));
      assert.ok(array);
      assert.deepEqual(array[1].split(',').map(Number), trial[field]);
    }
  }
});

test('replay numérico confere com as médias verificadas no compilador C++', () => {
  const expectedMeans = [-68.97260446, -83.93789302, -83.77631088, -90.28487747];
  fixture.trials.forEach((trial, index) => {
    assert.ok(Math.abs(mean(replay(trial)) - expectedMeans[index]) < 0.00001);
  });
});

test('escala não limita a estimativa a 7/15 m e permanece monotônica', () => {
  assert.equal(distance(reference), 1);
  assert.ok(distance(-110) > 15);
  assert.ok(distance(-60) < 1);
  for (let rssi = -125; rssi < -1; rssi++) {
    assert.ok(distance(rssi) > distance(rssi + 1));
  }
  assert.match(header, /return powf\(10\.0f, expoenteDistancia\(rssi\)\)/);
});

test('regressão do replay registra melhora modesta, sem esconder piora a 3 m', () => {
  const oldMae = mean(summaries.map(s => s.originalMae));
  const newMae = mean(summaries.map(s => s.replayMae));
  assert.ok(oldMae > 0.97 && oldMae < 0.99);
  assert.ok(newMae > 0.92 && newMae < 0.95);
  assert.ok(summaries[1].replayMae > summaries[1].originalMae);
  assert.ok(summaries[2].replayMae < summaries[2].originalMae);
  assert.ok(summaries[3].replayMae < summaries[3].originalMae);
});

if (process.argv.includes('--report')) {
  console.log('Ajuste nos valores filtrados originais:', fit(fixture.trials));
  console.table(summaries);
  console.log('Erro absoluto médio original/replay (m):',
    mean(summaries.map(s => s.originalMae)), mean(summaries.map(s => s.replayMae)));
  console.log('Retirando uma distância por vez do ajuste (não é validação independente):');
  console.table(fixture.trials.map((trial, index) => {
    const model = fit(fixture.trials.filter((_, i) => i !== index));
    return { realM: trial.realM, meanEstimated: mean(trial.originalFilteredRssi.map(
      rssi => 10 ** ((model.reference - rssi) / (10 * model.exponent)))) };
  }));
}
