// Experimento OFFLINE: lê CSVs; nunca modifica o app, o firmware ou a placa.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseCsv, loadTrials } = require('./calibrar-distancia-radio4.cjs');
const base = path.join(__dirname, '../docs/testes/dados');
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const target = m => m < 3 ? 0 : m < 5 ? 1 : 2;
const median = xs => {
  const a = [...xs].sort((a, b) => a - b), n = a.length;
  return n % 2 ? a[n >> 1] : (a[n / 2 - 1] + a[n / 2]) / 2;
};
const profiles = [
  { name: 'mediana5-EMA030', kind: 'ema' },
  ...[0.1, 0.5, 1, 2].flatMap(q => [4, 16].map(r => ({
    name: `Kalman-Q${q}-R${r}`, kind: 'kalman', q, r,
  }))),
  ...[0.5, 2].map(q => ({ name: `mediana5-Kalman-Q${q}-R16`, kind: 'kalman', q, r: 16, median: true })),
];
const current = { yellow: -82, red: -90, hold: 4000 };
function readTrials(name) {
  const groups = new Map();
  for (const row of parseCsv(fs.readFileSync(path.join(base, name), 'utf8'))) {
    if (!groups.has(row.ensaio)) groups.set(row.ensaio, []);
    groups.get(row.ensaio).push(row);
  }
  return [...groups].map(([id, rows]) => {
    const realM = Number(rows[0].distancia_real_m);
    const samples = rows.map(row => ({
      t: Date.parse(row.rssi_lido_em), raw: Number(row.rssi_bruto_placa_dbm),
      recorded: Number(row.rssi_filtrado_placa_dbm),
    })).sort((a, b) => a.t - b.t);
    assert(Number.isFinite(realM) && realM > 0);
    assert(samples.every((s, i) => Number.isFinite(s.t) && s.raw < 0 && s.raw >= -126
      && (i === 0 || s.t > samples[i - 1].t)));
    return { id, realM, result: rows[0].resultado, firmware: rows[0].firmware,
      condition: rows[0].condicao, samples: samples.map(s => ({ ...s, t: s.t - samples[0].t })) };
  });
}
function filter(samples, profile) {
  let window = [], value, p = profile.r, last;
  return samples.map(s => {
    if (last !== undefined && s.t - last > 2500) { window = []; value = undefined; p = profile.r; }
    const dt = last === undefined ? 1 : (s.t - last) / 1000;
    last = s.t;
    window.push(s.raw);
    if (window.length > 5) window.shift();
    const z = profile.kind === 'ema' || profile.median ? median(window) : s.raw;
    if (value === undefined) value = z;
    else if (profile.kind === 'ema') value = Math.fround(Math.fround(0.3 * z) + Math.fround(0.7 * value));
    else {
      p += profile.q * dt; // Q em dB²/s; R em dB². Hipóteses, não parâmetros medidos.
      const k = p / (p + profile.r);
      value += k * (z - value);
      p *= 1 - k;
    }
    return { t: s.t, value };
  });
}
function simulate(samples, limits) {
  let state = 0, candidate = 0, since = 0, count = 0, quantity = 0, last;
  let panic = false, firstYellowMs = null, firstRedMs = null;
  const series = samples.map(s => {
    if (last !== undefined && s.t - last > 2500) { quantity = 0; count = 0; }
    last = s.t;
    quantity++;
    if (quantity >= 5) {
      const goal = state === 0
        ? (s.value <= limits.red ? 2 : s.value <= limits.yellow ? 1 : 0)
        : state === 1 ? (s.value <= limits.red ? 2 : s.value > limits.yellow + 5 ? 0 : 1)
          : (s.value > limits.red + 4 ? 1 : 2);
      if (goal === state) { count = 0; candidate = state; }
      else {
        if (!count || candidate !== goal) { candidate = goal; since = s.t; count = 1; }
        else count++;
        const wait = goal === 2 ? limits.hold : goal === 0 || state === 2 ? 2000 : limits.hold;
        if (count >= 3 && s.t - since >= wait) {
          state = candidate; count = 0;
        }
      }
    }
    if (state === 1 && firstYellowMs === null) firstYellowMs = s.t;
    if (state === 2) { panic = true; if (firstRedMs === null) firstRedMs = s.t; }
    return { t: s.t, state: panic ? 2 : state };
  });
  // Só a cauda de 10 s participa do escore; partida sempre verde sem histórico.
  const end = samples.at(-1).t;
  const tail = series.filter(s => s.t > end - 10000);
  return { tail, firstYellowMs, firstRedMs, final: series.at(-1).state };
}
function evaluate(trials, profile, limits) {
  const perDistance = new Map();
  trials.forEach(t => perDistance.set(t.realM, (perDistance.get(t.realM) ?? 0) + 1));
  const details = trials.map(trial => {
    const out = simulate(trial.filtered[profile.name], limits), wanted = target(trial.realM);
    return { id: trial.id, realM: trial.realM, wanted, final: out.final,
      correct: mean(out.tail.map(s => Number(s.state === wanted))),
      tooLow: mean(out.tail.map(s => Number(s.state < wanted))),
      tooHigh: mean(out.tail.map(s => Number(s.state > wanted))),
      firstYellowMs: out.firstYellowMs, firstRedMs: out.firstRedMs,
      tailStates: [0, 1, 2].map(state => out.tail.filter(s => s.state === state).length) };
  });
  const score = key => details.reduce((sum, d) => sum + d[key] / perDistance.get(d.realM), 0) / perDistance.size;
  return { profile: profile.name, limits, correct: score('correct'), tooLow: score('tooLow'), tooHigh: score('tooHigh'), details };
}
function prepare(trials) {
  return trials.map(t => ({ ...t, filtered: Object.fromEntries(profiles.map(p => [p.name, filter(t.samples, p)])) }));
}
function search(trials, profile) {
  let best;
  for (let yellow = -90; yellow <= -65; yellow++) {
    for (let red = -100; red < yellow; red++) {
      const result = evaluate(trials, profile, { yellow, red, hold: 4000 });
      if (!best || result.correct > best.correct + 1e-12
        || Math.abs(result.correct - best.correct) < 1e-12 && result.tooLow < best.tooLow - 1e-12
        || Math.abs(result.correct - best.correct) < 1e-12 && Math.abs(result.tooLow - best.tooLow) < 1e-12
          && Math.abs(yellow - current.yellow) + Math.abs(red - current.red)
            < Math.abs(best.limits.yellow - current.yellow) + Math.abs(best.limits.red - current.red)) best = result;
    }
  }
  return best;
}
function selfTest() {
  assert.equal(target(2), 0); assert.equal(target(3), 1); assert.equal(target(5), 2);
  const constant = raw => Array.from({ length: 31 }, (_, i) => ({ t: i * 500, raw }));
  assert.equal(simulate(filter(constant(-69), profiles[0]), current).final, 0);
  assert.equal(simulate(filter(constant(-85), profiles[0]), current).firstYellowMs, 6000);
  assert.equal(simulate(filter(constant(-95), profiles[0]), current).firstRedMs, 6000);
  const spike = constant(-69); spike[12].raw = -110; spike[13].raw = -110;
  assert.equal(simulate(filter(spike, profiles[0]), current).final, 0);
  const gap = Array.from({ length: 5 }, (_, i) => ({ t: i * 500, value: -95 }));
  gap.push({ t: 20000, value: -95 });
  assert.equal(simulate(gap, current).firstRedMs, null);
  const latch = constant(-95).concat(constant(-60).map(s => ({ ...s, t: s.t + 16000 })));
  assert.equal(simulate(filter(latch, profiles[0]), current).final, 2);
  for (const profile of profiles) assert(filter(constant(-80), profile).every(s => s.value === -80));
  const header = fs.readFileSync(path.join(__dirname, '../firmware/xiao_escolta_ble/ProximitySignal.h'), 'utf8');
  assert.match(header, /ATENCAO_ENTRA = -82/); assert.match(header, /PERIGO_ENTRA = -90/);
  assert.match(header, /JANELA = 5/); assert.match(header, /ALFA = 0\.30f/);
  assert.match(header, /RETORNO_MS = 2000/); assert.match(header, /MAX_LACUNA_MS = 2500/);
}
function report() {
  selfTest();
  const old = readTrials('Escolta_2026-10-15_23-24-03-581_historico_amostras.csv');
  const fittingIds = new Set(loadTrials().map(t => t.id));
  const training = prepare(old.filter(t => fittingIds.has(t.id)));
  const comparison = prepare(readTrials('Escolta_2026-10-17_14-50-10-790_historico_amostras.csv'));
  const controls = prepare(old.filter(t => !fittingIds.has(t.id) && t.firmware === 'xiao-p5-r4' && t.result === 'concluído'));
  assert.equal(training.length, 12); assert.equal(comparison.length, 7); assert.equal(controls.length, 4);
  assert([...training, ...comparison, ...controls].every(t => t.samples.length === 30));
  const results = profiles.map(p => {
    const selected = search(training, p);
    return { training: selected, comparison: evaluate(comparison, p, selected.limits),
      controls: evaluate(controls, p, selected.limits) };
  });
  return {
    notes: [
      'Replay aproximado de RSSI bruto exportado ~1 Hz, não dos dados completos ~2 Hz do firmware. Não inventa intermediários.',
      'Estado/filtro iniciam do zero em cada ensaio; pânico retido até fim. Não reproduz estado real nem ACK humano.',
      'Avalia cauda final de 10 s, com pesos iguais por distância e divididos entre repetições.',
      'Alvos convencionados: <3 m verde, >=3 e <5 amarelo, >=5 vermelho; não medição física independente.',
      'Busca só nas 12 séries de 15/10; limites congelados comparados em 17/10 e quatro controles 1 m de 14/10.',
      'Todos os dados já foram vistos: separação cronológica retrospectiva, não ensaio cego/prospectivo.',
      'Histerese +5/+4 dB, confirmação 4 s e retorno 2 s fixos. Não otimiza tempo com séries estacionárias.',
      'Tempo até disparo contado da primeira amostra exportada, não de cruzar 3/5 m durante caminhada.',
      'Kalman escalar com passeio aleatório; Q/R hipotéticos. Não cria nova informação de distância.',
      'Antes de +4 dBm há potência/condições diferentes: séries antigas são contexto, não misturadas ao ajuste.',
    ],
    counts: { training: 360, comparison: 210, controls: 120 },
    baseline: { training: evaluate(training, profiles[0], current),
      comparison: evaluate(comparison, profiles[0], current), controls: evaluate(controls, profiles[0], current) },
    fixedLimitsComparison: profiles.map(p => ({ profile: p.name,
      current: evaluate(comparison, p, current).correct,
      commonTraining: evaluate(training, p, { yellow: -77, red: -85, hold: 4000 }).correct,
      common: evaluate(comparison, p, { yellow: -77, red: -85, hold: 4000 }).correct,
      commonControl: evaluate(controls, p, { yellow: -77, red: -85, hold: 4000 }).correct,
      commonDetails: evaluate(comparison, p, { yellow: -77, red: -85, hold: 4000 }).details,
    })),
    candidates: results,
  };
}
module.exports = { target, filter, simulate, evaluate, selfTest, report };
if (require.main === module) console.log(JSON.stringify(report(), null, 2));
