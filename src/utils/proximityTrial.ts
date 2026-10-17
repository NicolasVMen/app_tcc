// Observação do protótipo: não altera calibração nem decisões de alarme.
export const TRIAL_SAMPLES = 30;
export const SETTLE_MS = 10000;
export const MAX_SAMPLE_AGE_MS = 2000;
export const MAX_GAP_MS = 5000;

export interface TrialPacket {
  receivedAt: number;
  sampleId: number;
  readAt: number;
  phoneRssi: number;
  rawRssi: number | null;
  filteredRssi: number;
  estimatedM: number | null;
  state: string;
  panic: boolean;
  active: boolean;
  firmware?: string;
}

export interface TrialRun {
  id: string;
  distanceM: number;
  condition: string;
  startedAt: number;
  endedAt: number | null;
  stopReason: string | null;
  samples: TrialPacket[];
  metadata?: { firmware: string | null; phone: string; platform: string; heightM: number | null; app: string };
}

export function validRssi(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -126 && value < 0;
}

export function isFreshPacket(packet: TrialPacket, now: number) {
  return validRssi(packet.phoneRssi) && validRssi(packet.filteredRssi)
    && packet.sampleId > 0 && packet.readAt <= packet.receivedAt
    && packet.receivedAt <= now && now - packet.receivedAt <= MAX_SAMPLE_AGE_MS
    && packet.receivedAt - packet.readAt <= MAX_SAMPLE_AGE_MS;
}

export function canStartTrial({ loaded, connected, standby, foreground, collecting, packet, now }: {
  loaded: boolean; connected: boolean; standby: boolean; foreground: boolean;
  collecting: boolean; packet: TrialPacket | null; now: number;
}): boolean {
  // O alerta é uma observação do ensaio, não um impedimento à medição.
  return loaded && connected && !standby && foreground && !collecting
    && packet !== null && packet.active && isFreshPacket(packet, now);
}

export function createTrial(distanceM: number, condition: string, now: number, metadata?: TrialRun['metadata']): TrialRun {
  if (!Number.isFinite(distanceM) || distanceM <= 0) throw new Error('Distância real inválida.');
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    distanceM, condition, startedAt: now, endedAt: null, stopReason: null, samples: [], metadata,
  };
}

export function appendTrialPacket(run: TrialRun, packet: TrialPacket): TrialRun {
  if (run.endedAt !== null || !packet.active || !isFreshPacket(packet, packet.receivedAt)
    || packet.readAt < run.startedAt + SETTLE_MS) return run;
  const previous = run.samples[run.samples.length - 1];
  if (previous && packet.receivedAt - previous.receivedAt > MAX_GAP_MS) {
    return { ...run, endedAt: packet.receivedAt, stopReason: 'interrompido: lacuna entre amostras' };
  }
  // Não conta a mesma leitura do celular, nem notificações em rajada.
  if (previous && (packet.sampleId <= previous.sampleId
    || packet.receivedAt - previous.receivedAt < 800)) return run;
  const samples = [...run.samples, packet];
  return {
    ...run, samples,
    endedAt: samples.length >= TRIAL_SAMPLES ? packet.receivedAt : null,
    stopReason: samples.length >= TRIAL_SAMPLES ? 'concluído' : null,
  };
}

export function statistics(values: number[]) {
  if (!values.length) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    count: values.length, mean,
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    min: sorted[0], max: sorted[sorted.length - 1],
    stdDev: Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length),
  };
}

export function summarizeTrial(run: TrialRun) {
  return {
    phone: statistics(run.samples.map(sample => sample.phoneRssi)),
    filtered: statistics(run.samples.map(sample => sample.filteredRssi)),
    estimated: statistics(run.samples.map(sample => sample.estimatedM)
      .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0)),
    meanAbsoluteError: statistics(run.samples.map(sample => sample.estimatedM)
      .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0)
      .map(value => Math.abs(value - run.distanceM)))?.mean ?? null,
    panicSamples: run.samples.filter(sample => sample.panic).length,
    warningSamples: run.samples.filter(sample => sample.state === 'atencao').length,
  };
}

export function isStoredTrial(value: unknown): value is TrialRun {
  if (!value || typeof value !== 'object') return false;
  const run = value as TrialRun;
  const validTime = (time: unknown): time is number => typeof time === 'number'
    && Number.isFinite(time) && time > 0 && time < 8640000000000000;
  return typeof run.id === 'string' && Number.isFinite(run.distanceM) && run.distanceM > 0
    && typeof run.condition === 'string' && validTime(run.startedAt)
    && validTime(run.endedAt) && run.endedAt >= run.startedAt
    && typeof run.stopReason === 'string' && Array.isArray(run.samples)
    && run.samples.length <= TRIAL_SAMPLES && run.samples.every(sample => sample
      && validTime(sample.receivedAt) && validTime(sample.readAt)
      && Number.isInteger(sample.sampleId) && sample.sampleId > 0
      && validRssi(sample.phoneRssi) && validRssi(sample.filteredRssi)
      && (sample.rawRssi === null || validRssi(sample.rawRssi))
      && (sample.estimatedM === null || (Number.isFinite(sample.estimatedM) && sample.estimatedM >= 0))
      && typeof sample.state === 'string' && typeof sample.panic === 'boolean'
      && typeof sample.active === 'boolean');
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  // Protege também notas abertas ao importar em uma planilha.
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value === 'string' ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function trialsToCsv(runs: TrialRun[]): string {
  const rows: unknown[][] = [[
    'ensaio', 'inicio', 'fim', 'resultado', 'distancia_real_m', 'condicao',
    'amostra', 'recebido_em', 'rssi_lido_em', 'rssi_id', 'rssi_celular_dbm',
    'rssi_bruto_placa_dbm', 'rssi_filtrado_placa_dbm', 'distancia_estimada_m',
    'erro_estimativa_m', 'estado_placa', 'panico_ativo',
    'firmware', 'modelo_celular', 'sistema', 'altura_m', 'versao_app',
  ]];
  for (const run of runs) {
    const base = [run.id, new Date(run.startedAt).toISOString(),
      run.endedAt == null ? '' : new Date(run.endedAt).toISOString(),
      run.stopReason, run.distanceM, run.condition];
    if (!run.samples.length) rows.push([...base, ...Array(11).fill(null),
      run.metadata?.firmware, run.metadata?.phone, run.metadata?.platform,
      run.metadata?.heightM, run.metadata?.app]);
    run.samples.forEach((sample, index) => rows.push([
      ...base, index + 1, new Date(sample.receivedAt).toISOString(),
      new Date(sample.readAt).toISOString(), sample.sampleId, sample.phoneRssi,
      sample.rawRssi, sample.filteredRssi, sample.estimatedM,
      sample.estimatedM == null ? null : sample.estimatedM - run.distanceM,
      sample.state, sample.panic, sample.firmware ?? run.metadata?.firmware,
      run.metadata?.phone, run.metadata?.platform, run.metadata?.heightM, run.metadata?.app,
    ]));
  }
  return rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
