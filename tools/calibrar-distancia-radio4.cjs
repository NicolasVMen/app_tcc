// Análise reproduzível; somente leitura, não altera firmware nem grava placa.
const fs = require('node:fs');
const path = require('node:path');
const source = path.join(__dirname, '../docs/testes/dados/Escolta_2026-10-15_23-24-03-581_historico_amostras.csv');
const IDS = [
  '1792113925393-hlwypj', '1792114055852-814ist', '1792114147958-ury944',
  '1792114233105-f8kh2l', '1792114371348-kocox0', '1792114474426-nxh5ed',
  '1792114570555-rv32zb', '1792114652286-3l0sym', '1792114728992-puf9cs',
  '1792114788988-s0bqk9', '1792115514383-udl0zk', '1792115576597-s8utx4',
];
function parseCsv(text) {
  const rows = [], row = [];
  let value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i === 0 && ch === '\uFEFF') continue;
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === ';' || ch === '\n' || ch === '\r')) {
      row.push(value); value = '';
      if (ch !== ';') {
        rows.push(row.splice(0));
        if (ch === '\r' && text[i + 1] === '\n') i++;
      }
    } else value += ch;
  }
  if (quoted) throw new Error('CSV com aspas incompletas.');
  if (value || row.length) { row.push(value); rows.push(row); }
  const header = rows.shift();
  if (!header) throw new Error('CSV sem cabeçalho.');
  return rows.map(cells => {
    if (cells.length !== header.length) throw new Error('CSV com quantidade de colunas inválida.');
    return Object.fromEntries(header.map((key, i) => [key, cells[i]]));
  });
}
function loadTrials() {
  const rows = parseCsv(fs.readFileSync(source, 'utf8'));
  return IDS.map(id => {
    const samples = rows.filter(row => row.ensaio === id);
    if (samples.length !== 30 || samples.some(row => row.resultado !== 'concluído' || row.firmware !== 'xiao-p5-r4')) {
      throw new Error(`Ensaio de ajuste incompleto/incompatível: ${id}`);
    }
    return { id, realM: Number(samples[0].distancia_real_m), samples: samples.map(row => ({
      rssi: Number(row.rssi_filtrado_placa_dbm), originalEstimatedM: Number(row.distancia_estimada_m),
    })) };
  });
}
function fit(trials) {
  const perDistance = new Map();
  trials.forEach(trial => perDistance.set(trial.realM, (perDistance.get(trial.realM) ?? 0) + 1));
  const points = trials.flatMap(trial => trial.samples.map(sample => ({
    x: sample.rssi, y: Math.log10(trial.realM),
    w: 1 / (perDistance.get(trial.realM) * trial.samples.length),
  })));
  const sum = get => points.reduce((total, p) => total + get(p), 0);
  const weights = sum(p => p.w), x = sum(p => p.w * p.x) / weights, y = sum(p => p.w * p.y) / weights;
  const slope = sum(p => p.w * (p.x - x) * (p.y - y)) / sum(p => p.w * (p.x - x) ** 2);
  if (!Number.isFinite(slope) || slope >= 0) throw new Error('Ajuste não identifica propagação monotônica válida.');
  return { reference: x - y / slope, exponent: -1 / (10 * slope) };
}
const estimate = (rssi, model) => 10 ** ((model.reference - rssi) / (10 * model.exponent));
const mean = values => values.reduce((total, value) => total + value, 0) / values.length;
function report() {
  const trials = loadTrials(), model = fit(trials);
  return { source: path.basename(source), samples: 360, fitted: model,
    warning: 'Erro no conjunto usado no ajuste; não é validação física independente.',
    trials: trials.map(trial => ({ id: trial.id, realM: trial.realM,
      oldMeanM: mean(trial.samples.map(p => p.originalEstimatedM)),
      newMeanM: mean(trial.samples.map(p => estimate(p.rssi, model))),
      oldMaeM: mean(trial.samples.map(p => Math.abs(p.originalEstimatedM - trial.realM))),
      newMaeM: mean(trial.samples.map(p => Math.abs(estimate(p.rssi, model) - trial.realM))),
    })) };
}
module.exports = { parseCsv, loadTrials, fit, estimate, report };
if (require.main === module) console.log(JSON.stringify(report(), null, 2));
