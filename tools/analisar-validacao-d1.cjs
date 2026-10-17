// Comparação somente leitura. Não recalibra, não muda alarmes, não acessa telefone.
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv } = require('./calibrar-distancia-radio4.cjs');
const base = path.join(__dirname, '../docs/testes/dados');
const readCsv = name => parseCsv(fs.readFileSync(path.join(base, name), 'utf8'));
const mean = values => values.reduce((sum, v) => sum + v, 0) / values.length;
const stats = values => {
  const avg = mean(values);
  return { mean: avg, min: Math.min(...values), max: Math.max(...values),
    sd: Math.sqrt(mean(values.map(value => (value - avg) ** 2))) };
};
function summarize(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.ensaio)) grouped.set(row.ensaio, []);
    grouped.get(row.ensaio).push(row);
  }
  return [...grouped].map(([id, samples]) => ({
    id, realM: Number(samples[0].distancia_real_m), n: samples.length,
    firmware: samples[0].firmware ?? null, condition: samples[0].condicao,
    result: samples[0].resultado,
    rssi: stats(samples.map(p => Number(p.rssi_filtrado_placa_dbm))),
    estimate: stats(samples.map(p => Number(p.distancia_estimada_m))),
    mae: mean(samples.map(p => Math.abs(Number(p.distancia_estimada_m) - Number(p.distancia_real_m)))),
  }));
}
const current = readCsv('Escolta_2026-10-17_14-50-10-790_historico_amostras.csv');
const previous = readCsv('Escolta_2026-10-15_23-24-03-581_historico_amostras.csv');
// Exportador antigo representava um ensaio interrompido sem amostras somente
// pelos seis metadados iniciais. Completar células vazias APENAS em memória;
// não criar RSSI zero, não modificar a fonte e não incluir esse ensaio nos cálculos.
const groundText = fs.readFileSync(path.join(base, 'primeira-campanha-1-a-10m-2026-10-06-original.csv'), 'utf8');
const ground = parseCsv(groundText.replace(/^"1791335872298-w36yfq";[^\r\n]+/m, line => line + ';""'.repeat(11)));
const elevated = JSON.parse(fs.readFileSync(path.join(base, 'proximidade-elevada-2026-10-06.json'), 'utf8'));
const oldFormula = rssi => 10 ** ((-68.44 - rssi) / 26.5);
const d1Formula = rssi => 10 ** ((-63.386376 - rssi) / 33.77961);
const oldErrors = current.map(row => Math.abs(oldFormula(Number(row.rssi_filtrado_placa_dbm)) - Number(row.distancia_real_m)));
const d1Errors = current.map(row => Math.abs(d1Formula(Number(row.rssi_filtrado_placa_dbm)) - Number(row.distancia_real_m)));
const report = {
  notes: ['Campanhas diferentes não isolam efeito da potência: altura, ambiente e fórmula variam.',
    'CSV inicial sem tag de firmware: não presumir potência medida em cada ensaio.',
    'Linha legada interrompida sem amostras foi completada com células vazias só no leitor, e excluída dos cálculos.',
    'Comparação de fórmulas usa o mesmo RSSI inteiro exportado nas duas; não é reprodução exata do float interno.',
    'A D1 permanece fixa; dados novos não são reaproveitados para retocar e chamar isso de validação.'],
  firstCampaignReportedOnFloor: summarize(ground.filter(row => row.resultado === 'concluído')),
  elevatedBeforePowerExperiment: elevated.trials.map(trial => ({
    id: trial.trialId, realM: trial.realM,
    rssi: stats(trial.originalFilteredRssi), estimate: stats(trial.originalEstimatedM),
  })),
  power4BeforeD1: summarize(previous.filter(row => row.inicio >= '2026-10-16T01:25:00Z'
    && row.firmware === 'xiao-p5-r4' && row.resultado === 'concluído')),
  currentD1: summarize(current),
  sameNewRssiCounterfactual: {
    legacyMaeM: mean(oldErrors), d1MaeM: mean(d1Errors),
    relativeReductionPercent: 100 * (mean(oldErrors) - mean(d1Errors)) / mean(oldErrors),
    actualExportD1MaeM: mean(current.map(row => Math.abs(Number(row.distancia_estimada_m) - Number(row.distancia_real_m)))),
  },
  integrity: [...new Set(current.map(row => row.ensaio))].map(id => {
    const samples = current.filter(row => row.ensaio === id);
    const ids = samples.map(p => Number(p.rssi_id));
    const ages = samples.map(p => Date.parse(p.recebido_em) - Date.parse(p.rssi_lido_em));
    const gaps = samples.slice(1).map((p, i) => Date.parse(p.rssi_lido_em) - Date.parse(samples[i].rssi_lido_em));
    return { id, n: samples.length, distinctIds: new Set(ids).size,
      idsIncreasing: ids.every((value, i) => i === 0 || value > ids[i - 1]),
      validSampleNumbers: samples.every((p, i) => Number(p.amostra) === i + 1),
      minAgeMs: Math.min(...ages), maxAgeMs: Math.max(...ages), maxGapMs: Math.max(...gaps),
      firstAfterStartMs: Date.parse(samples[0].rssi_lido_em) - Date.parse(samples[0].inicio),
    };
  }),
};
if (require.main === module) console.log(JSON.stringify(report, null, 2));
module.exports = report;
