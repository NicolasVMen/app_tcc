// ============================================================
// BLE API Service — Comunicação com a placa via Bluetooth
// ============================================================

import { BleManager, Device, BleError } from 'react-native-ble-plx';
import { AppState, Platform } from 'react-native';
import { Buffer } from 'buffer';
import { TrialPacket, validRssi } from '../utils/proximityTrial';
import { validTelemetry } from '../utils/telemetry';
import { withTimeout } from '../utils/asyncTimeout';
import { ensureBlePermissions } from './blePermissions';
import { subscribeBackgroundProtectionTick } from './backgroundSentinel';
import { DEV_RSSI_WATCHDOG_EXPERIMENT_ENABLED, VALIDATED_MONITOR_ENABLED } from './nativeIdentity';
import { isSafeResetAcknowledgement } from '../utils/safetyConfirmation';

export type EstadoEsp32 = 'seguro' | 'atencao' | 'perigo' | 'panico';

export interface Esp32Status {
  rssi: number;             // RSSI já filtrado pela placa (mediana + EMA na XIAO p1/p2)
  fw?: string;              // identificação enviada pela placa, não pelo app
  modo_casa?: boolean;
  som_on?: boolean;
  monitoramento_ativo?: boolean;
  panico_ativo: boolean;
  configurado?: boolean;
  rssiFresh?: boolean;      // calculado localmente, nunca confiado ao JSON remoto
  // ---- Campos novos (firmware com filtragem) ----
  rssi_raw?: number;        // RSSI cru, sem filtro (debug/gráfico)
  rssi_filtrado?: number;   // RSSI filtrado com casa decimal
  distancia_m?: number | null; // estimativa em metros; null enquanto não houver leitura válida
  estado?: EstadoEsp32;     // decisão de estado feita na própria placa
  bateria_pct?: number;     // percentual estimado pela tensão da Li-Po
  bateria_v?: number;       // tensão medida pelo ADC interno da XIAO
  carregando?: boolean;     // estado indicado pelo circuito carregador
  usb_conectado?: boolean;  // presença física de alimentação USB na XIAO
  // ---- Preparado para GPS (evolução futura) ----
  gps_fix?: boolean;
  lat?: number;
  lng?: number;
}

export const SERVICE_UUID = "e5c1f4a0-1234-4b5c-9abc-def012345678";
export const CHAR_STATUS_UUID = "e5c1f4a1-1234-4b5c-9abc-def012345678";
export const CHAR_SOM_UUID = "e5c1f4a2-1234-4b5c-9abc-def012345678";
export const CHAR_RESET_UUID = "e5c1f4a3-1234-4b5c-9abc-def012345678";
export const CHAR_RSSI_UUID = "e5c1f4a4-1234-4b5c-9abc-def012345678";
export const CHAR_CONTROLE_UUID = "e5c1f4a5-1234-4b5c-9abc-def012345678";

// Singleton do BleManager
const bleManager = new BleManager();
let connectedDevice: Device | null = null;
let rssiInterval: NodeJS.Timeout | null = null;
let connectionPromise: Promise<void> | null = null;
let session = 0;
let cancelPending: (() => void) | null = null;
let monitorSubscription: { remove(): void } | null = null;
let disconnectSubscription: { remove(): void } | null = null;
let stopNativePolling: (() => void) | null = null;
let pollingAppStateSubscription: { remove(): void } | null = null;
let pendingDevice: Device | null = null;
let rssiSampleId = 0;
let lastRssiRead: { id: number; at: number; value: number } | null = null;
const telemetryObservers = new Set<(packet: TrialPacket) => void>();

// Injeção manual, limitada e exclusivamente no cliente de desenvolvimento Teste.
// __DEV__ é false no APK release, inclusive no candidato paralelo .teste.
export const RSSI_WATCHDOG_EXPERIMENT_AVAILABLE = DEV_RSSI_WATCHDOG_EXPERIMENT_ENABLED === true;
let experimentStatus: { value: Esp32Status; at: number } | null = null;
let watchdogExperiment: {
  generation: number; device: Device; startedAt: number; skipUntil: number; recoverUntil: number;
  notifications: number; panicAfterMs: number | null; resumed: boolean; interrupted: string | null;
} | null = null;

function experimentIsCurrent() {
  return RSSI_WATCHDOG_EXPERIMENT_AVAILABLE && watchdogExperiment !== null
    && watchdogExperiment.generation === session && watchdogExperiment.device === connectedDevice
    && watchdogExperiment.interrupted === null;
}

function interruptWatchdogExperiment(reason: string) {
  if (watchdogExperiment && watchdogExperiment.interrupted === null
      && Date.now() < watchdogExperiment.recoverUntil) watchdogExperiment.interrupted = reason;
}

export function getRssiWatchdogExperiment() {
  if (!RSSI_WATCHDOG_EXPERIMENT_AVAILABLE || !watchdogExperiment) return null;
  const now = Date.now();
  const active = experimentIsCurrent() && now < watchdogExperiment.recoverUntil;
  return {
    active, paused: active && now < watchdogExperiment.skipUntil,
    remainingSeconds: active ? Math.max(0, Math.ceil((watchdogExperiment.skipUntil - now) / 1000)) : 0,
    notifications: watchdogExperiment.notifications,
    panicAfterMs: watchdogExperiment.panicAfterMs,
    resumed: watchdogExperiment.resumed,
    interrupted: watchdogExperiment.interrupted,
  };
}

export function startRssiWatchdogExperiment(): void {
  if (!RSSI_WATCHDOG_EXPERIMENT_AVAILABLE) throw new Error('Simulação indisponível nesta versão.');
  if (getRssiWatchdogExperiment()?.active) throw new Error('Aguarde o término da simulação atual.');
  const status = experimentStatus;
  if (!connectedDevice || !status || Date.now() - status.at > 2500
      || status.value.fw !== 'xiao-p5-r4-d1-k2-w1'
      || !isSafeResetAcknowledgement(status.value) || controlConfirmation) {
    throw new Error('Retome a proteção, aproxime os dispositivos e aguarde Protegido com leitura recente do firmware W1.');
  }
  const now = Date.now();
  watchdogExperiment = { generation: session, device: connectedDevice, startedAt: now,
    skipUntil: now + 15000, recoverUntil: now + 18000,
    notifications: 0, panicAfterMs: null, resumed: false, interrupted: null };
  // Não apresentar uma leitura antiga como atual enquanto as escritas estão suspensas.
  lastRssiRead = null;
}

export function cancelRssiWatchdogExperiment(): void {
  interruptWatchdogExperiment('Simulação interrompida pelo responsável.');
}

function skipRssiForWatchdogExperiment() {
  return experimentIsCurrent() && Date.now() < watchdogExperiment!.skipUntil;
}

/** Adia SOMENTE a recuperação por RSSI antigo, nunca por falta de telemetria/GATT. */
export function deferRssiRecoveryForWatchdogExperiment(): boolean {
  return experimentIsCurrent() && Date.now() < watchdogExperiment!.recoverUntil;
}

/** Observador adicional: não substitui os callbacks responsáveis pela proteção. */
export function subscribeProximityTelemetry(observer: (packet: TrialPacket) => void) {
  telemetryObservers.add(observer);
  return () => { telemetryObservers.delete(observer); };
}
type ControlConfirmation = {
  writeComplete: boolean;
  matches: (status: Esp32Status) => boolean;
  resolve: (status: Esp32Status) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};
let controlConfirmation: ControlConfirmation | null = null;

// Callbacks que a interface pode registrar
type StatusCallback = (status: Esp32Status) => void;
type ConnectionCallback = (isConnected: boolean) => void;

let onStatusUpdate: StatusCallback | null = null;
let onConnectionChange: ConnectionCallback | null = null;

// Função auxiliar para converter string pra Base64
const stringToBase64 = (str: string) => Buffer.from(str, 'utf-8').toString('base64');
const base64ToString = (b64: string) => Buffer.from(b64, 'base64').toString('utf-8');

/** Configura os callbacks para a UI */
export function setBleCallbacks(statusCb: StatusCallback, connCb: ConnectionCallback) {
  onStatusUpdate = statusCb;
  onConnectionChange = connCb;
  return () => {
    if (onStatusUpdate === statusCb) onStatusUpdate = null;
    if (onConnectionChange === connCb) onConnectionChange = null;
  };
}

/** Inicia escaneamento e conecta ao ESCOLTA_BLE */
async function startConnection(): Promise<void> {
  const generation = ++session;
  const ensureCurrent = () => {
    if (generation !== session) throw new Error('Tentativa de conexão cancelada.');
  };
  await ensureBlePermissions();
  ensureCurrent();

  const state = await bleManager.state();
  ensureCurrent();
  if (state !== 'PoweredOn') {
    throw new Error('Bluetooth não está ativado no celular.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let connecting = false;
    let scanTimeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      bleManager.stopDeviceScan();
      if (scanTimeout) clearTimeout(scanTimeout);
      cancelPending = null;
      callback();
    };
    cancelPending = () => finish(() => reject(new Error('Tentativa de conexão cancelada.')));

    scanTimeout = setTimeout(() => {
      finish(() => reject(new Error('Dispositivo não encontrado após 10 segundos')));
    }, 10000);

    // Escaneia por dispositivos
    bleManager.startDeviceScan(null, null, async (error: BleError | null, device: Device | null) => {
      if (error) {
        finish(() => reject(error));
        return;
      }

      if (!settled && !connecting && generation === session && device && device.name === 'ESCOLTA_BLE') {
        connecting = true;
        bleManager.stopDeviceScan();
        if (scanTimeout) clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          session++;
          device.cancelConnection().catch(() => {});
          finish(() => reject(new Error('A conexão Bluetooth excedeu 15 segundos.')));
        }, 15000);
        pendingDevice = device;

        try {
          // Conecta e descobre serviços
          const connected = await device.connect();
          ensureCurrent();
          // Aumenta o MTU para não cortar o JSON (default é 23 bytes)
          if (Platform.OS === 'android') {
            try {
              await connected.requestMTU(512);
            } catch (e) {
              console.warn('Erro ao solicitar MTU maior', e);
            }
          }
          await connected.discoverAllServicesAndCharacteristics();
          ensureCurrent();
          connectedDevice = connected;
          pendingDevice = null;
          lastRssiRead = null;
          experimentStatus = null;

          if (onConnectionChange) onConnectionChange(true);

          // Escuta o Notify do status
          monitorSubscription = connected.monitorCharacteristicForService(
            SERVICE_UUID,
            CHAR_STATUS_UUID,
            (monitorError, characteristic) => {
              if (generation !== session || connectedDevice !== connected) return;
              if (monitorError) {
                console.warn('Erro no monitoramento:', monitorError);
                return;
              }
              if (characteristic?.value) {
                const jsonStr = base64ToString(characteristic.value);
                try {
                  const parsed: unknown = JSON.parse(jsonStr);
                  if (!validTelemetry(parsed)) return;
                  const status = { ...(parsed as Esp32Status), rssiFresh: Boolean(
                    lastRssiRead && Date.now() - lastRssiRead.at <= 2500 && validRssi((parsed as Esp32Status).rssi)
                  ) };
                  if (RSSI_WATCHDOG_EXPERIMENT_AVAILABLE) {
                    experimentStatus = { value: status, at: Date.now() };
                    if (experimentIsCurrent() && Date.now() < watchdogExperiment!.recoverUntil) {
                      const experiment = watchdogExperiment!;
                      experiment.notifications++;
                      if (status.monitoramento_ativo === false) interruptWatchdogExperiment('Placa entrou em espera.');
                      if (status.fw !== 'xiao-p5-r4-d1-k2-w1') interruptWatchdogExperiment('Identificação do firmware mudou.');
                      if (status.panico_ativo && experiment.panicAfterMs === null) {
                        experiment.panicAfterMs = Date.now() - experiment.startedAt;
                      }
                    }
                  }
                  if (
                    controlConfirmation &&
                    controlConfirmation.writeComplete &&
                    controlConfirmation.matches(status)
                  ) {
                    const pending = controlConfirmation;
                    controlConfirmation = null;
                    clearTimeout(pending.timeout);
                    pending.resolve(status);
                  }
                  if (onStatusUpdate) onStatusUpdate(status);
                  if (lastRssiRead && validRssi(status.rssi)) {
                    const packet: TrialPacket = {
                      receivedAt: Date.now(), sampleId: lastRssiRead.id,
                      readAt: lastRssiRead.at, phoneRssi: lastRssiRead.value,
                      rawRssi: validRssi(status.rssi_raw) ? status.rssi_raw : null,
                      filteredRssi: status.rssi,
                      estimatedM: typeof status.distancia_m === 'number'
                        && Number.isFinite(status.distancia_m) && status.distancia_m >= 0
                        ? status.distancia_m : null,
                      state: status.estado ?? 'indisponivel',
                      panic: status.panico_ativo === true || status.estado === 'panico',
                      active: status.monitoramento_ativo !== false,
                      firmware: status.fw,
                    };
                    telemetryObservers.forEach(observer => {
                      try { observer(packet); } catch (error) { console.warn('Erro no ensaio:', error); }
                    });
                  }
                } catch (e) {
                  console.warn('Erro ao parsear JSON BLE:', e);
                }
              }
            }
          );

          // Inicia loop que lê o RSSI do celular e manda pra placa
          if (rssiInterval) clearInterval(rssiInterval);
          let readingRssi = false;
          let pollingEpoch = 0;
          let previousAppState = AppState.currentState;
          if (VALIDATED_MONITOR_ENABLED) {
            pollingAppStateSubscription = AppState.addEventListener('change', nextState => {
              if (nextState === 'active' && previousAppState !== 'active') {
                // Uma rejeição antiga, entregue ao desbloquear, não encerra o vínculo atual.
                pollingEpoch++;
                lastRssiRead = null;
              }
              previousAppState = nextState;
            });
          }
          const pollSignal = async () => {
            if (connectedDevice === connected && !readingRssi) {
              if (skipRssiForWatchdogExperiment()) return;
              readingRssi = true;
              const operationEpoch = pollingEpoch;
              try {
                const dev = await withTimeout(connected.readRSSI(), 2000, 'Leitura RSSI sem resposta.');
                const readAt = Date.now();
                if (operationEpoch !== pollingEpoch || generation !== session) return;
                if (skipRssiForWatchdogExperiment()) return;
                if (validRssi(dev.rssi) && connectedDevice === connected) {
                  const b64 = stringToBase64(dev.rssi.toString());
                  await withTimeout(connected.writeCharacteristicWithResponseForService(
                    SERVICE_UUID,
                    CHAR_RSSI_UUID,
                    b64
                  ), 2000, 'Envio RSSI sem resposta.');
                  if (connectedDevice === connected && operationEpoch === pollingEpoch && !skipRssiForWatchdogExperiment()) {
                    lastRssiRead = { id: ++rssiSampleId, at: readAt, value: dev.rssi };
                    if (experimentIsCurrent() && Date.now() >= watchdogExperiment!.skipUntil
                        && Date.now() < watchdogExperiment!.recoverUntil) watchdogExperiment!.resumed = true;
                  }
                }
              } catch (e) {
                // Uma operação pendente não pode congelar silenciosamente o fluxo.
                if (generation === session && connectedDevice === connected && operationEpoch === pollingEpoch) {
                  await disconnectBle().catch(() => {});
                }
              } finally {
                readingRssi = false;
              }
            }
          };
          stopNativePolling = subscribeBackgroundProtectionTick(() => { void pollSignal(); });
          rssiInterval = stopNativePolling ? null : setInterval(pollSignal, 500);

          // Adiciona listener de desconexão
          disconnectSubscription = connected.onDisconnected((error, disconnectedDevice) => {
            if (generation !== session || connectedDevice !== connected) return;
            interruptWatchdogExperiment('Vínculo GATT interrompido: este ensaio não comprova o watchdog W1.');
            session++;
            connectedDevice = null;
            lastRssiRead = null;
            experimentStatus = null;
            if (rssiInterval) clearInterval(rssiInterval);
            stopNativePolling?.();
            stopNativePolling = null;
            pollingAppStateSubscription?.remove();
            pollingAppStateSubscription = null;
            monitorSubscription?.remove();
            monitorSubscription = null;
            disconnectSubscription?.remove();
            disconnectSubscription = null;
            if (controlConfirmation) {
              const pending = controlConfirmation;
              controlConfirmation = null;
              clearTimeout(pending.timeout);
              pending.reject(new Error('A conexão foi interrompida antes da confirmação da placa.'));
            }
            if (onConnectionChange) onConnectionChange(false);
          });

          finish(resolve);
        } catch (connError) {
          if (generation === session) {
            pendingDevice = null;
            device.cancelConnection().catch(() => {});
          }
          finish(() => reject(connError));
        }
      }
    });

  });
}

/** Inicia escaneamento e conecta ao ESCOLTA_BLE sem duplicar tentativas concorrentes. */
export async function connectBle(): Promise<void> {
  if (connectedDevice) return;
  if (connectionPromise) return connectionPromise;

  const attempt = startConnection().finally(() => {
    if (connectionPromise === attempt) connectionPromise = null;
  });
  connectionPromise = attempt;
  return attempt;
}

/** Desconecta do dispositivo atual */
export async function disconnectBle(): Promise<void> {
  interruptWatchdogExperiment('Conexão encerrada: este ensaio não comprova o watchdog W1.');
  experimentStatus = null;
  session++;
  cancelPending?.();
  cancelPending = null;
  connectionPromise = null;
  bleManager.stopDeviceScan();
  stopNativePolling?.();
  stopNativePolling = null;
  pollingAppStateSubscription?.remove();
  pollingAppStateSubscription = null;
  const device = connectedDevice || pendingDevice;
  const hadConnection = Boolean(connectedDevice);
  pendingDevice = null;
  monitorSubscription?.remove();
  disconnectSubscription?.remove();
  monitorSubscription = disconnectSubscription = null;
  if (device) {
    connectedDevice = null;
    lastRssiRead = null;
    if (rssiInterval) {
      clearInterval(rssiInterval);
      rssiInterval = null;
    }
    if (controlConfirmation) {
      const pending = controlConfirmation;
      controlConfirmation = null;
      clearTimeout(pending.timeout);
      pending.reject(new Error('Conexão encerrada antes da confirmação.'));
    }
    if (hadConnection) onConnectionChange?.(false);
    await withTimeout(device.cancelConnection(), 2000, 'Desconexão sem resposta.');
  }
}

/** Liga/desliga o som (buzzer) */
export async function toggleSomBle(ligar: boolean): Promise<void> {
  if (!connectedDevice) throw new Error('Não conectado');
  const valor = ligar ? '1' : '0';
  await withTimeout(connectedDevice.writeCharacteristicWithResponseForService(
    SERVICE_UUID,
    CHAR_SOM_UUID,
    stringToBase64(valor)
  ), 2000, 'O comando de som não foi confirmado.');
}

/** Reseta o alarme (pânico) */
export async function resetarAlarmeBle(): Promise<Esp32Status> {
  if (!connectedDevice) throw new Error('Não conectado');
  if (VALIDATED_MONITOR_ENABLED) return confirmedCommand(CHAR_RESET_UUID, 'reset', isSafeResetAcknowledgement);
  return confirmedCommand(CHAR_RESET_UUID, 'reset', status => status.panico_ativo === false && status.estado === 'seguro');
}

async function confirmedCommand(uuid: string, value: string, matches: (status: Esp32Status) => boolean) {
  const device = connectedDevice;
  if (!device) throw new Error('Não conectado');
  if (controlConfirmation) throw new Error('Aguarde a confirmação do comando anterior.');
  const confirmation = new Promise<Esp32Status>((resolve, reject) => {
    const timeout = setTimeout(() => {
      controlConfirmation = null;
      reject(new Error('A placa não confirmou o estado em até 4 segundos.'));
    }, 4000);
    controlConfirmation = { matches, resolve, reject, timeout, writeComplete: false };
  });
  const commandConfirmation = controlConfirmation as ControlConfirmation | null;
  try {
    // Observa a rejeição da confirmação desde o início, mesmo com a escrita ainda pendente.
    const [confirmedStatus] = await Promise.all([
      confirmation,
      withTimeout(device.writeCharacteristicWithResponseForService(SERVICE_UUID, uuid, stringToBase64(value)), 2000, 'Comando Bluetooth sem resposta.')
        .then(() => { if (commandConfirmation && controlConfirmation === commandConfirmation) commandConfirmation.writeComplete = true; }),
    ]);
    return confirmedStatus;
  } catch (error) {
    const pending = controlConfirmation as ControlConfirmation | null;
    if (pending) {
      clearTimeout(pending.timeout);
      controlConfirmation = null;
      pending.reject(error instanceof Error ? error : new Error('Comando não confirmado.'));
    }
    throw error;
  }
}

/**
 * Pausa ou retoma o monitoramento e só conclui depois que o status da placa
 * confirma a mudança. Isso evita tratar uma desconexão intencional como perigo.
 */
export async function setMonitoringModeBle(active: boolean): Promise<void> {
  if (!active) interruptWatchdogExperiment('Solicitada espera: envio de RSSI liberado imediatamente.');
  await confirmedCommand(CHAR_CONTROLE_UUID, active ? 'retomar' : 'pausar', status => status.monitoramento_ativo === active);
}

/** Verifica se está conectado */
export function isBleConnected(): boolean {
  return connectedDevice !== null;
}
