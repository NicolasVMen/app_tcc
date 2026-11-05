// Observação passiva: não contém comandos BLE, alarmes ou estimativa de corrente.
export const AUTONOMY_FORMAT = 1;
export const AUTONOMY_SAMPLE_MS = 60000;
export const AUTONOMY_GAP_MS = 5000;
export const AUTONOMY_MAX_ROWS = 3000;
export type StudyPhase = 'uso_normal' | 'protegido' | 'atencao' | 'emergencia' | 'espera';
export interface StudyClock { wall: number; mono: number }
export interface StudyObservation {
  connected: boolean; standby: boolean; panic: boolean; signal: string;
  telemetryAt: number | null; firmware: string | null;
  voltage: number | null; percent: number | null; usb: boolean | null; charging: boolean | null;
  soundEnabled: boolean | null; vibration: boolean; notifications: boolean;
  boardState: string | null; boardPanic: boolean | null; boardActive: boolean | null;
}
export interface StudyRow {
  sequence: number; wall: number; mono: number; elapsedMs: number;
  event: string; phase: StudyPhase; state: string; fresh: boolean;
  voltage: number | null; percent: number | null; usb: boolean | null; charging: boolean | null;
  soundEnabled: boolean | null; buzzerPolicy: string; telemetryAt: number | null;
  firmware: string | null; vibration: boolean; notifications: boolean;
  gapMs: number;
  appEmergency:boolean; boardState:string|null; boardPanic:boolean|null; boardActive:boolean|null;
  connected:boolean;
}
export interface StudyRun {
  format: 1; id: string; startedAt: number; endedAt: number | null; reason: string | null;
  app: string; phone: string; platform: string;
  rows: StudyRow[]; observedBatteryMs: Record<string, number>; observedUsbMs: number; unobservedMs: number;
}
const PHASES: StudyPhase[] = ['uso_normal','protegido','atencao','emergencia','espera'];
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const range = (v: unknown, min: number, max: number): v is number => finite(v) && v >= min && v <= max;
const boolOrNull = (v: unknown) => v === null || typeof v === 'boolean';
const clean = (s: string, max = 100) => s.replace(/[\r\n\t]/g, ' ').slice(0, max);

export function validStudyClock(c: StudyClock) {
  return range(c.wall, 1, 8640000000000000) && range(c.mono, 0, Number.MAX_SAFE_INTEGER);
}
export function hasFreshStudyData(o: StudyObservation, c: StudyClock) {
  return o.connected && finite(o.telemetryAt) && c.wall >= o.telemetryAt
    && c.wall - o.telemetryAt <= AUTONOMY_GAP_MS;
}
export function studyState(o: StudyObservation, c: StudyClock) {
  if (!o.connected) return o.panic ? 'emergencia_sem_vinculo' : 'sem_vinculo';
  if (!hasFreshStudyData(o, c)) return 'sem_telemetria_recente';
  if (o.boardActive===false) return 'espera';
  if (o.boardActive!==true) return 'sincronizando';
  if (o.boardPanic===true || o.boardState==='panico' || o.boardState==='perigo') return 'emergencia';
  return o.boardState==='seguro' ? 'protegido' : o.boardState==='atencao' ? 'atencao' : 'sincronizando';
}
function buzzerPolicy(o: StudyObservation, fresh: boolean) {
  // Inferência documentada de política, não captura de áudio/corrente do buzzer.
  if (!fresh || !['xiao-p5-r4-d1-k2','xiao-p5-r4-d1-k2-w1'].includes(o.firmware ?? '')) return 'nao_observavel';
  if (o.boardActive===false) return 'previsto_desligado';
  if (o.boardActive!==true || o.boardPanic===null) return 'nao_observavel';
  if (o.boardPanic===true) return 'previsto_bipe_emergencia';
  if (o.boardState==='atencao' && o.soundEnabled === true) return 'previsto_bipe_atencao';
  if (o.soundEnabled === null) return 'nao_observavel';
  return 'previsto_desligado';
}

/** Uma execução por processo. Reinício é interrupção, nunca continuidade inventada. */
export class AutonomySession {
  readonly run: StudyRun;
  private phase: StudyPhase = 'uso_normal';
  private previous: { c: StudyClock; o: StudyObservation; fresh: boolean; key: string } | null = null;
  private readonly originMono: number;
  private lastRowMono: number;
  private lastTelemetry: number | null = null;
  constructor(c: StudyClock, metadata: { app: string; phone: string; platform: string }, id: string) {
    if (!validStudyClock(c) || !id) throw new Error('Relógio ou identificação da coleta inválidos.');
    this.originMono = this.lastRowMono = c.mono;
    this.run = { format: 1, id: clean(id), startedAt: c.wall, endedAt: null, reason: null,
      app: clean(metadata.app), phone: clean(metadata.phone), platform: clean(metadata.platform),
      rows: [], observedBatteryMs: {}, observedUsbMs:0, unobservedMs: 0 };
  }
  observe(o: StudyObservation, c: StudyClock, marker?: string): boolean {
    if (this.run.endedAt !== null) return false;
    if (!validStudyClock(c)) throw new Error('Relógio da coleta indisponível.');
    const previous = this.previous;
    if (previous && c.mono < previous.c.mono) {
      this.finish('relogio_monotonico_reiniciado', previous.c);
      return true;
    }
    const fresh = hasFreshStudyData(o, c);
    const state = studyState(o, c);
    const key = JSON.stringify([state, o.connected, o.standby, o.panic,
      fresh ? o.usb : null, fresh ? o.charging : null, fresh ? o.soundEnabled : null,
      o.firmware, o.vibration, o.notifications,o.boardState,o.boardPanic,o.boardActive]);
    let gapMs = 0;
    let event = marker || (!previous ? 'inicio' : key !== previous.key ? 'mudanca' : 'amostra');
    if (!marker && previous && key!==previous.key) {
      const was=studyState(previous.o,previous.c);
      event = state==='emergencia' && was!=='emergencia' ? 'inicio_emergencia'
        : was==='emergencia' && state!=='emergencia' ? 'saida_emergencia_observada'
        : state==='atencao' && was!=='atencao' ? 'inicio_atencao'
        : was==='atencao' && state==='protegido' ? 'retorno_protegido' : 'mudanca';
    }
    if (previous) {
      const dt = c.mono - previous.c.mono;
      const civilDt = c.wall - previous.c.wall;
      const continuous = dt <= AUTONOMY_GAP_MS && Math.abs(civilDt - dt) <= 2000;
      if (!continuous) { gapMs = dt; event = (Math.abs(civilDt-dt)>2000 ? 'relogio_civil_alterado' : 'lacuna')+'|'+event; }
      if (continuous && fresh && previous.fresh && !o.usb && o.usb !== null
          && previous.o.usb === false && !o.charging && o.charging !== null
          && previous.o.charging === false && previous.o.firmware === o.firmware) {
        const label = studyState(previous.o, previous.c);
        this.run.observedBatteryMs[label] = (this.run.observedBatteryMs[label] ?? 0) + dt;
      } else if (continuous && fresh && previous.fresh && o.usb===true && previous.o.usb===true) {
        this.run.observedUsbMs+=dt;
      } else {
        this.run.unobservedMs += dt;
      }
    }
    const isNewTelemetry = fresh && o.telemetryAt !== this.lastTelemetry;
    const record = !previous || marker || key !== previous.key || gapMs > 0
      || (isNewTelemetry && c.mono - this.lastRowMono >= AUTONOMY_SAMPLE_MS);
    this.previous = { c: { ...c }, o: { ...o }, fresh, key };
    if (fresh) this.lastTelemetry = o.telemetryAt;
    if (!record) return false;
    const numericData = fresh && range(o.voltage, 2, 5.5) && range(o.percent, 0, 100);
    this.run.rows.push({ sequence: this.run.rows.length+1, wall:c.wall, mono:c.mono,
      elapsedMs:c.mono-this.originMono, event:clean(event,60), phase:this.phase, state,
      fresh, voltage:numericData ? o.voltage : null, percent:numericData ? o.percent : null,
      usb:fresh ? o.usb : null, charging:fresh ? o.charging : null,
      soundEnabled:fresh ? o.soundEnabled : null, buzzerPolicy:buzzerPolicy(o,fresh),
      telemetryAt:fresh ? o.telemetryAt : null, firmware:o.firmware ? clean(o.firmware) : null,
      vibration:o.vibration, notifications:o.notifications, gapMs,appEmergency:o.panic,connected:o.connected,
      boardState:fresh?o.boardState:null,boardPanic:fresh?o.boardPanic:null,boardActive:fresh?o.boardActive:null });
    this.lastRowMono = c.mono;
    if (this.run.rows.length >= AUTONOMY_MAX_ROWS) {
      this.run.endedAt = c.wall; this.run.reason = 'limite_de_registros';
    }
    return true;
  }
  markPhase(phase: StudyPhase, c: StudyClock, o: StudyObservation) {
    if (!PHASES.includes(phase)) throw new Error('Etapa inválida.');
    if (this.run.endedAt !== null) throw new Error('A coleta já terminou.');
    this.phase = phase;
    this.observe(o,c,'etapa_marcada');
  }
  finish(reason: string, c: StudyClock) {
    if (this.run.endedAt !== null) return;
    if (this.previous) this.observe(this.previous.o,c,'fim');
    this.run.endedAt = validStudyClock(c) ? c.wall : this.run.startedAt;
    this.run.reason = clean(reason,60);
  }
}

export function isStoredStudy(value: unknown): value is StudyRun {
  const r = value as StudyRun;
  return !!r && typeof r==='object' && r.format===1 && typeof r.id==='string'
    && range(r.startedAt,1,8640000000000000) && (r.endedAt===null || range(r.endedAt,1,8640000000000000))
    && (r.reason===null || typeof r.reason==='string')
    && ['app','phone','platform'].every(k=>typeof r[k as keyof StudyRun]==='string')
    && !!r.observedBatteryMs && typeof r.observedBatteryMs==='object' && !Array.isArray(r.observedBatteryMs)
    && Object.values(r.observedBatteryMs).every(v=>range(v,0,Number.MAX_SAFE_INTEGER))
    && range(r.observedUsbMs,0,Number.MAX_SAFE_INTEGER) && range(r.unobservedMs,0,Number.MAX_SAFE_INTEGER)
    && Array.isArray(r.rows) && r.rows.length<=AUTONOMY_MAX_ROWS && r.rows.every((row,i)=>
      !!row && row.sequence===i+1 && range(row.wall,1,8640000000000000)
      && range(row.mono,0,Number.MAX_SAFE_INTEGER) && range(row.elapsedMs,0,Number.MAX_SAFE_INTEGER)
      && typeof row.event==='string' && PHASES.includes(row.phase) && typeof row.state==='string'
      && typeof row.fresh==='boolean' && (row.voltage===null || range(row.voltage,2,5.5))
      && (row.percent===null || range(row.percent,0,100)) && boolOrNull(row.usb)
      && boolOrNull(row.charging) && boolOrNull(row.soundEnabled) && typeof row.buzzerPolicy==='string'
      && (row.telemetryAt===null || range(row.telemetryAt,1,8640000000000000))
      && (row.firmware===null || typeof row.firmware==='string')
      && typeof row.vibration==='boolean' && typeof row.notifications==='boolean'
      && typeof row.appEmergency==='boolean' && typeof row.connected==='boolean' && (row.boardState===null || typeof row.boardState==='string')
      && boolOrNull(row.boardPanic) && boolOrNull(row.boardActive)
      && range(row.gapMs,0,Number.MAX_SAFE_INTEGER));
}
export function interruptStoredStudy(run: StudyRun): StudyRun {
  if (run.endedAt!==null) return run;
  // Limite inferior conhecido. Não contar tempo entre último registro e reabertura.
  return { ...run, endedAt:run.rows[run.rows.length-1]?.wall ?? run.startedAt, reason:'registro_interrompido_entre_execucoes' };
}
const csvCell = (v: unknown) => {
  let text = v===null || v===undefined ? '' : String(v);
  if (typeof v==='string' && /^[=+@\-\t\r]/.test(text)) text = "'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
};
export function buildAutonomyCsv(runs: StudyRun[], summary = false) {
  if (!runs.length || !runs.every(isStoredStudy)) throw new Error('Não há coleta válida para exportar.');
  const rows: unknown[][] = summary
    ? [['coleta','inicio_utc','fim_utc','motivo','estado_observado','tempo_observado_em_bateria_ms','tempo_observado_com_usb_ms','tempo_sem_observacao_ms','versao_app','celular','sistema','aviso']]
    : [['coleta','inicio_utc','fim_utc','motivo_fim','registro','recebido_utc','decorrido_monotonico_ms','evento','etapa_informada','estado_observado','telemetria_recente','telemetria_recebida_utc','tensao_v','percentual_estimado','usb','carregando','som_habilitado','buzzer_previsto_nao_medido','vibracao_habilitada','notificacao_habilitada','lacuna_ms','firmware','versao_app','celular','sistema','emergencia_app','estado_placa','panico_placa','monitoramento_placa','conectado']];
  for (const run of runs) {
    const start=new Date(run.startedAt).toISOString(),end=run.endedAt===null?'':new Date(run.endedAt).toISOString();
    if (summary) {
      for (const [state,ms] of Object.entries(run.observedBatteryMs)) {
        rows.push([run.id,start,end,run.reason,state,ms,0,0,run.app,run.phone,run.platform,
          'Duração entre observações; não mede corrente, mAh ou audibilidade. USB excluído. Tempos sem observação não são estado seguro.']);
      }
      rows.push([run.id,start,end,run.reason,'usb_e_periodos_sem_observacao',0,run.observedUsbMs,run.unobservedMs,run.app,run.phone,run.platform,'USB e lacunas não contam como descarga. Nenhuma corrente ou capacidade foi medida.']);
    } else {
      for (const row of run.rows) rows.push([run.id,start,end,run.reason,row.sequence,new Date(row.wall).toISOString(),
        row.elapsedMs,row.event,row.phase,row.state,row.fresh,row.telemetryAt===null?'':new Date(row.telemetryAt).toISOString(),
        row.voltage,row.percent,row.usb,row.charging,row.soundEnabled,row.buzzerPolicy,row.vibration,row.notifications,
        row.gapMs,row.firmware,run.app,run.phone,run.platform,row.appEmergency,row.boardState,row.boardPanic,row.boardActive,row.connected]);
    }
  }
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
