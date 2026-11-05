import { AutonomySession, buildAutonomyCsv, hasFreshStudyData, interruptStoredStudy,
  isStoredStudy, StudyClock, StudyObservation, StudyPhase, StudyRun } from '../utils/autonomyStudy';

export const AUTONOMY_STORAGE_KEY = '@escolta_autonomy_v1';
export const AUTONOMY_MAX_RUNS = 10;
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
type View = { ready: boolean; error: string | null; active: boolean; runs: StudyRun[] };

/** Captura o storage da conta na construção. Nunca grava sobre leitura inválida. */
export class AutonomyRecorder {
  private view: View = { ready:false, error:null, active:false, runs:[] };
  private engine: AutonomySession | null = null;
  private disposed = false;
  private loaded = false;
  private clearing = false;
  private loading: Promise<void> | null = null;
  private storageFailed = false;
  private writes: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(private readonly storage: Storage, private readonly clock: () => StudyClock,
    private readonly observation: () => StudyObservation,
    private readonly metadata: { app:string; phone:string; platform:string }) {}

  getSnapshot = () => this.view;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(next: Partial<View> = {}) {
    this.view = { ...this.view, active:!!this.engine && this.engine.run.endedAt===null, ...next };
    // Falha de uma tela de diagnóstico não pode interromper o monitor principal.
    this.listeners.forEach(fn => { try { fn(); } catch {} });
  }
  load(): Promise<void> {
    if (this.disposed || this.loaded) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading=this.loadOnce().finally(()=>{ this.loading=null; });
    return this.loading;
  }
  private async loadOnce() {
    try {
      const raw = await this.storage.getItem(AUTONOMY_STORAGE_KEY);
      if (this.disposed) return;
      const parsed: unknown = raw===null ? [] : JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length>AUTONOMY_MAX_RUNS || !parsed.every(isStoredStudy)) {
        throw new Error('Histórico de autonomia ilegível. O original foi preservado.');
      }
      const interrupted = parsed.some(r=>r.endedAt===null);
      this.loaded = true;
      this.publish({ ready:true, error:null, runs:parsed.map(interruptStoredStudy) });
      if (interrupted) this.persist();
    } catch (e) {
      this.publish({ ready:false, error:e instanceof Error ? e.message : 'Não foi possível carregar a coleta. Nenhum dado foi substituído.' });
    }
  }
  private persist() {
    if (!this.loaded || this.storageFailed) return;
    // A string e o proprietário do storage são capturados antes da fila.
    const raw=JSON.stringify(this.view.runs);
    this.writes = this.writes.then(()=>{
      if (!this.storageFailed) return this.storage.setItem(AUTONOMY_STORAGE_KEY,raw);
    }).catch(()=>{
      // Não deixar snapshots já enfileirados sobrescreverem a evidência da falha.
      this.storageFailed=true;
      this.finishSafely('falha_de_gravacao');
      this.publish({ error:'Gravação não confirmada. A coleta parou; exporte os dados em memória antes de fechar o aplicativo.' });
    });
  }
  private finishSafely(reason:string) {
    if (!this.engine || this.engine.run.endedAt!==null) return;
    try { this.engine.finish(reason,this.clock()); }
    catch {
      const last=this.engine.run.rows[this.engine.run.rows.length-1];
      // O último instante comprovado é preferível a inventar duração após falha.
      if (last) this.engine.finish(reason,{wall:last.wall,mono:last.mono});
    }
  }
  start() {
    if (this.disposed || this.clearing || !this.loaded || !this.view.ready || this.view.error) throw new Error('Carregue o histórico sem erros antes de iniciar.');
    if (this.engine?.run.endedAt===null) throw new Error('Já existe uma coleta em andamento.');
    if (this.view.runs.length>=AUTONOMY_MAX_RUNS) throw new Error('Exporte as coletas e libere o histórico antes de iniciar outra.');
    const c=this.clock(),o=this.observation();
    if (!hasFreshStudyData(o,c) || o.voltage===null || !Number.isFinite(o.voltage) || o.voltage<2 || o.voltage>5.5
      || o.percent===null || !Number.isFinite(o.percent) || o.percent<0 || o.percent>100) throw new Error('Conecte a placa e aguarde telemetria recente com tensão e percentual.');
    this.engine = new AutonomySession(c,this.metadata,`${c.wall}-${Math.random().toString(36).slice(2,10)}`);
    this.engine.observe(o,c);
    this.publish({ runs:[...this.view.runs,this.engine.run] });
    this.persist();
  }
  observe = () => {
    if (this.disposed || !this.engine || this.engine.run.endedAt!==null || this.view.error) return;
    try {
      if (this.engine.observe(this.observation(),this.clock())) { this.publish(); this.persist(); }
    } catch {
      this.publish({ error:'O registro encontrou uma falha de relógio/dados. Exporte os dados já observados.' });
      this.finishSafely('falha_do_registro');
      this.publish(); this.persist();
    }
  };
  markPhase(phase: StudyPhase) {
    if (!this.engine || this.engine.run.endedAt!==null || this.view.error) throw new Error('Inicie uma coleta sem erros antes de marcar a etapa.');
    this.engine.markPhase(phase,this.clock(),this.observation()); this.publish(); this.persist();
  }
  stop(reason='encerrado_pelo_responsavel') {
    if (!this.engine || this.engine.run.endedAt!==null) return;
    this.engine.finish(reason,this.clock()); this.publish(); this.persist();
  }
  export(summary=false) {
    // Permite resgatar a memória mesmo após uma falha de gravação.
    return buildAutonomyCsv(this.view.runs,summary);
  }
  async clear() {
    if (this.clearing || !this.loaded || !this.view.ready || this.view.error || this.view.active) throw new Error('Não é possível excluir durante coleta ou erro. Exporte antes de excluir.');
    this.clearing=true;
    try {
      await this.writes;
      if (this.view.error) throw new Error('A gravação anterior falhou; exporte os dados em memória.');
      await this.storage.setItem(AUTONOMY_STORAGE_KEY,'[]');
      this.engine=null; this.publish({ runs:[] });
    } finally { this.clearing=false; }
  }
  dispose() {
    if (this.disposed) return;
    this.finishSafely('sessao_da_conta_encerrada');
    if (this.engine) { this.publish(); this.persist(); }
    this.disposed=true; this.listeners.clear();
  }
  async flush() { await this.writes; }
}
