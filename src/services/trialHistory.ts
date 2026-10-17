import { accountStorageFor } from './accountStorage';
import { isStoredTrial, TrialRun } from '../utils/proximityTrial';

export const TRIAL_HISTORY_KEY = '@escolta_proximity_trials_v1';
export const MAX_TRIAL_RUNS = 100;

/** Uma instância por conta. Falha de leitura nunca autoriza substituir o original. */
export class TrialHistoryStore {
  private readonly storage;
  private ready = false;
  constructor(owner: string) { this.storage = accountStorageFor(owner); }

  async load(): Promise<TrialRun[]> {
    this.ready = false;
    const raw = await this.storage.getItem(TRIAL_HISTORY_KEY);
    const stored: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(stored) || !stored.every(isStoredTrial)) {
      throw new Error('Histórico de ensaios ilegível. O conteúdo original foi preservado.');
    }
    this.ready = true;
    return stored.slice(-MAX_TRIAL_RUNS);
  }

  save(runs: TrialRun[]): Promise<void> {
    if (!this.ready) return Promise.reject(new Error('Carregue o histórico original antes de salvar uma coleta.'));
    if (!runs.every(isStoredTrial)) return Promise.reject(new Error('Ensaio inválido; o histórico original não foi alterado.'));
    // A fila central já serializa. O proprietário e o JSON são capturados AGORA.
    return this.storage.setItem(TRIAL_HISTORY_KEY, JSON.stringify(runs.slice(-MAX_TRIAL_RUNS)));
  }
}
