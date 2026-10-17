import { summarizeTrial, TrialRun, trialsToCsv } from './proximityTrial';

export type TrialExportScope = 'history' | 'latest';
export type TrialExportFormat = 'samples' | 'summary';
export type TrialExportOptions = { scope: TrialExportScope; format: TrialExportFormat };

function cell(value: unknown) {
  const text = value == null ? '' : String(value);
  const safe = typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

const rounded = (value: number | null | undefined) => value == null ? null : Number(value.toFixed(3));
const iso = (time: number | null) => time == null ? '' : new Date(time).toISOString();

/** Resumo separado: não arredonda nem substitui as amostras originais. */
export function trialsSummaryToCsv(runs: TrialRun[]) {
  const rows: unknown[][] = [[
    'ensaio', 'inicio_utc', 'fim_utc', 'resultado', 'distancia_real_m', 'condicao',
    'amostras_coletadas', 'rssi_celular_medio_dbm', 'rssi_celular_minimo_dbm', 'rssi_celular_maximo_dbm',
    'rssi_filtrado_medio_dbm', 'rssi_filtrado_mediana_dbm', 'rssi_filtrado_minimo_dbm', 'rssi_filtrado_maximo_dbm',
    'distancia_estimada_media_m', 'distancia_estimada_minima_m', 'distancia_estimada_maxima_m',
    'erro_absoluto_medio_m', 'amostras_em_atencao', 'amostras_com_panico',
    'firmware', 'modelo_celular', 'sistema', 'altura_m', 'versao_app',
  ]];
  for (const run of runs) {
    const s = summarizeTrial(run);
    const firmware = [...new Set([run.metadata?.firmware, ...run.samples.map(p => p.firmware)]
      .filter((value): value is string => typeof value === 'string' && value.length > 0))].join(' | ');
    rows.push([
      run.id, iso(run.startedAt), iso(run.endedAt), run.stopReason, run.distanceM, run.condition,
      run.samples.length, rounded(s.phone?.mean), s.phone?.min, s.phone?.max,
      rounded(s.filtered?.mean), s.filtered?.median, s.filtered?.min, s.filtered?.max,
      rounded(s.estimated?.mean), s.estimated?.min, s.estimated?.max, rounded(s.meanAbsoluteError),
      s.warningSamples, s.panicSamples, firmware, run.metadata?.phone, run.metadata?.platform,
      run.metadata?.heightM, run.metadata?.app,
    ]);
  }
  return rows.map(row => row.map(cell).join(';')).join('\r\n');
}

export function buildTrialExport(runs: TrialRun[], options: TrialExportOptions, now = Date.now()) {
  if (!runs.length) throw new Error('Não há ensaios guardados para exportar.');
  if (!['history', 'latest'].includes(options.scope) || !['samples', 'summary'].includes(options.format)) {
    throw new Error('Opção de exportação inválida.');
  }
  // Ordenação em cópia: não altera o histórico nem deixa de incluir incompletos.
  const ordered = [...runs].sort((a, b) => a.startedAt - b.startedAt);
  const selected = options.scope === 'latest' ? ordered.slice(-1) : ordered;
  const date = new Date(now);
  const part = (number: number, width = 2) => String(number).padStart(width, '0');
  const stamp = `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`
    + `_${part(date.getHours())}-${part(date.getMinutes())}-${part(date.getSeconds())}-${part(date.getMilliseconds(), 3)}`;
  const scopeName = options.scope === 'latest' ? 'ultimo-ensaio' : 'historico';
  const formatName = options.format === 'samples' ? 'amostras' : 'resumo';
  return {
    filename: `Escolta_${stamp}_${scopeName}_${formatName}.csv`,
    // BOM facilita a leitura dos acentos no Excel; tabela mantém ; e datas UTC.
    content: '\uFEFF' + (options.format === 'samples' ? trialsToCsv(selected) : trialsSummaryToCsv(selected)),
    runCount: selected.length,
    sampleCount: selected.reduce((total, run) => total + run.samples.length, 0),
  };
}
