import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage, { subscribeAccountStorage } from '../services/accountStorage';
import * as Location from 'expo-location';
import { validTelemetry } from '../utils/telemetry';
import { withTimeout } from '../utils/asyncTimeout';
import { canSendEmergencyEmail, sendExperimentalEmail } from '../services/emergencyEmail';
import { ensureBlePermissions } from '../services/blePermissions';
import { INTERNAL_TOOLS_ENABLED, VALIDATED_MONITOR_ENABLED } from '../services/nativeIdentity';
import { hasCurrentSafeSignal, isSafeResetAcknowledgement, isSafetyConfirmationFirmware } from '../utils/safetyConfirmation';

import {
  connectBle,
  disconnectBle,
  deferRssiRecoveryForWatchdogExperiment,
  Esp32Status,
  EstadoEsp32,
  isBleConnected,
  resetarAlarmeBle,
  setMonitoringModeBle,
  setBleCallbacks,
} from '../services/bleApi';
import { useAppPreferences, type AppPreferences } from '../context/AppPreferencesContext';
import type { MonitorHooks } from '../utils/monitorScope';
import {
  armBackgroundEmergency,
  cancelBackgroundEmergency,
  isBackgroundEmergencyActive,
  isBackgroundEmergencyLatched,
  notifyBackgroundConnectionRestored,
  startBackgroundSentinel,
  stopBackgroundSentinel,
  updateBackgroundSentinel,
  subscribeBackgroundProtectionTick,
} from '../services/backgroundSentinel';
import {
  dismissEmergencyNotification,
  prepareNotifications,
  showBatteryNotification,
  showEmergencyNotification,
} from '../services/notificationService';

const ALERTS_STORAGE_KEY = '@escolta_alerts_history';
const PROFILE_STORAGE_KEY = '@escolta_user_profile';
const MONITORING_INTENT_STORAGE_KEY = '@escolta_monitoring_intent';
const MAX_SAVED_ALERTS = 200;
const RECONNECT_INTERVAL_MS = 8000;
const EMERGENCY_GRACE_MS = 5000;
// Atenção confirmada mantém vibração breve; sirene/vibração crítica ficam
// reservadas ao pânico, ao botão e à perda sustentada do vínculo.
const ALERT_OUTPUTS_ENABLED = true;

export type NivelSinal = 'seguro' | 'aviso' | 'panico' | 'desconectado';

export interface AlertItem {
  id: string;
  type: 'panico' | 'aviso' | 'info';
  title: string;
  time: string;
  desc: string;
}

export interface Esp32MonitorState {
  somHabilitado: boolean;
  somCarregado: boolean;
  rssiAtual: number;
  versaoFirmware: string | null;
  distanciaEstimada: number | null;
  bateriaPercentual: number | null;
  bateriaTensao: number | null;
  bateriaCarregando: boolean;
  dispositivoUsbConectado: boolean;
  modoPanico: boolean;
  nivelSinal: NivelSinal;
  conectado: boolean;
  reconectando: boolean;
  aguardandoConfirmacao: boolean;
  segurancaConfirmadaSemVinculo: boolean;
  notificacoesAutorizadas: boolean | null;
  ultimaAtualizacao: Date | null;
  dadosValidos: boolean;
  falhaTecnica: string | null;
  alertas: AlertItem[];
  isScanning: boolean;
  scanError: string | null;
  emEspera: boolean;
  alterandoEspera: boolean;
  sincronizandoProtecao: boolean;
}

function nivelDoEstado(estado: EstadoEsp32 | undefined, rssi: number): NivelSinal {
  switch (estado) {
    case 'seguro': return 'seguro';
    case 'atencao': return 'aviso';
    case 'perigo':
    case 'panico': return 'panico';
    default:
      if (rssi > -70) return 'seguro';
      if (rssi > -85) return 'aviso';
      return 'panico';
  }
}

function currentTime() {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

async function persistAlerts(alertas: AlertItem[]) {
  try {
    await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alertas.slice(0, MAX_SAVED_ALERTS)));
  } catch {}
}

async function loadAlerts(): Promise<AlertItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((a): a is AlertItem =>
        a && typeof a === 'object' && typeof a.id === 'string' && typeof a.time === 'string'
        && typeof a.title === 'string' && typeof a.desc === 'string' && ['panico', 'aviso', 'info'].includes(a.type)
      ).slice(0, MAX_SAVED_ALERTS);
    }
  } catch {}
  return [{
    id: `${Date.now()}-init`,
    type: 'info',
    title: 'Sentinela iniciada',
    time: currentTime(),
    desc: 'O monitoramento do Escolta foi iniciado.',
  }];
}

async function getResponsiblePhoneLocation(): Promise<string> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return 'Localização do celular responsável não autorizada.';
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return `Localização do celular responsável no início da emergência: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
  } catch {
    return 'Localização do celular responsável indisponível.';
  }
}

export function useEsp32Monitor() {
  const { preferences } = useAppPreferences();
  return runEsp32Monitor({ useCallback, useEffect, useRef, useState }, preferences);
}

/** Same monitor rules; resource lifetime is supplied by React or an account scope. */
export function runEsp32Monitor(hooks: MonitorHooks, preferences: AppPreferences) {
  const { useCallback, useEffect, useRef, useState } = hooks;
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const [state, setState] = useState<Esp32MonitorState>({
    somHabilitado: true,
    somCarregado: false,
    rssiAtual: 0,
    versaoFirmware: null,
    distanciaEstimada: null,
    bateriaPercentual: null,
    bateriaTensao: null,
    bateriaCarregando: false,
    dispositivoUsbConectado: false,
    modoPanico: false,
    nivelSinal: 'desconectado',
    conectado: false,
    reconectando: false,
    aguardandoConfirmacao: false,
    segurancaConfirmadaSemVinculo: false,
    notificacoesAutorizadas: null,
    ultimaAtualizacao: null,
    dadosValidos: false,
    falhaTecnica: null,
    alertas: [],
    isScanning: false,
    scanError: null,
    emEspera: false,
    alterandoEspera: false,
    sincronizandoProtecao: false,
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const localAlarmStartedRef = useRef(false);
  const isConnectedRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const emergencyRef = useRef(false);
  const reconnectingRef = useRef(false);
  const previousNivelRef = useRef<NivelSinal>('desconectado');
  const childNameRef = useRef('A criança');
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const releasedResourcesRef = useRef<Promise<void> | null>(null);
  const shuttingDownRef = useRef(false);
  const standbyRef = useRef(false);
  const standbyTransitionRef = useRef(false);
  const desiredMonitoringActiveRef = useRef(true);
  const batteryAlertLevelRef = useRef<0 | 10 | 20>(0);
  const telemetryReceivedRef = useRef(false);
  const lastTelemetryRef = useRef(0);
  const latestTelemetryRef = useRef<Esp32Status | null>(null);
  const lastFreshSignalRef = useRef(0);
  const connectionStartedRef = useRef(0);
  const foregroundRecoveryUntilRef = useRef(0);
  const alarmGenerationRef = useRef(0);
  const alertsLoadedRef = useRef(false);
  const historyGenerationRef = useRef(0);
  const [monitoringIntentReady, setMonitoringIntentReady] = useState(false);

  const addAlert = useCallback((alert: Omit<AlertItem, 'id' | 'time'>) => {
    if (!mountedRef.current) return;
    const complete: AlertItem = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: currentTime(),
    };
    setState(previous => {
      const alertas = [complete, ...previous.alertas].slice(0, MAX_SAVED_ALERTS);
      if (alertsLoadedRef.current) persistAlerts(alertas);
      return { ...previous, alertas };
    });
  }, []);

  const stopLocalAlarm = useCallback(() => {
    localAlarmStartedRef.current = false;
    Vibration.cancel();
    soundRef.current?.stopAsync().catch(() => {});
  }, []);

  const startLocalAlarm = useCallback(() => {
    if (!ALERT_OUTPUTS_ENABLED) return;
    if (localAlarmStartedRef.current) return;
    if (preferencesRef.current.vibrationEnabled) {
      Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
    }
    const sound = soundRef.current;
    if (sound) {
      localAlarmStartedRef.current = true;
      sound.playAsync().catch(() => {
        localAlarmStartedRef.current = false;
        if (mountedRef.current && emergencyRef.current) setState(previous => ({ ...previous,
          falhaTecnica: 'O áudio do celular falhou. Verifique a criança imediatamente e o volume do aparelho.' }));
      });
    }
  }, []);

  const restoreBackgroundEmergencyState = useCallback(async () => {
    if (!ALERT_OUTPUTS_ENABLED) {
      await cancelBackgroundEmergency().catch(() => false);
      return false;
    }
    const generation = alarmGenerationRef.current;
    const latched = await isBackgroundEmergencyLatched().catch(() => false);
    if ((!latched && !emergencyRef.current) || !mountedRef.current || shuttingDownRef.current || generation !== alarmGenerationRef.current) return false;
    emergencyRef.current = true;
    reconnectingRef.current = false;
    previousNivelRef.current = 'panico';
    setState(previous => ({ ...previous, modoPanico: true, nivelSinal: 'panico',
      reconectando: false, aguardandoConfirmacao: true, segurancaConfirmadaSemVinculo: false }));
    const playing = await isBackgroundEmergencyActive().catch(() => false);
    if (!playing && mountedRef.current && emergencyRef.current && generation === alarmGenerationRef.current) startLocalAlarm();
    return true;
  }, [startLocalAlarm]);

  const notifyEmergencyContact = useCallback(async (reason: string) => {
    if (!ALERT_OUTPUTS_ENABLED) return;
    try {
      const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return;
      const profile = JSON.parse(raw);
      if (!canSendEmergencyEmail(profile)) return;

      const locationLine = preferencesRef.current.shareLocation
        ? await withTimeout(getResponsiblePhoneLocation(), 5000, 'Localização não respondeu.')
          .catch(() => 'Localização do responsável indisponível neste envio.')
        : 'Compartilhamento de localização desativado pelo responsável.';
      const message = [
        'EMERGÊNCIA — Escolta UNITAU',
        '',
        `${childNameRef.current}: ${reason}`,
        locationLine,
        '',
        'Verifique a situação e tente contato imediato com o responsável.',
      ].join('\n');

      // Canal experimental do protótipo. Em uma evolução, o envio deve passar por backend autenticado.
      if (!mountedRef.current || shuttingDownRef.current) return;
      await sendExperimentalEmail({ recipient: profile.emailEmergencia, message, childName: childNameRef.current });
    } catch {
      addAlert({
        type: 'aviso',
        title: 'Aviso externo não confirmado',
        desc: 'A emergência local continua ativa, mas o serviço de e-mail não confirmou o envio.',
      });
    }
  }, [addAlert]);

  const activateEmergency = useCallback((reason: string, notificationHandledNatively = false) => {
    if (emergencyRef.current) return;
    emergencyRef.current = true;
    reconnectingRef.current = false;
    if (!notificationHandledNatively) startLocalAlarm();
    setState(previous => ({
      ...previous,
      modoPanico: true,
      nivelSinal: 'panico',
      reconectando: false,
      aguardandoConfirmacao: true,
      segurancaConfirmadaSemVinculo: false,
    }));
    addAlert({
      type: 'panico',
      title: 'Emergência ativada',
      desc: `${reason} Verifique ${childNameRef.current} imediatamente.`,
    });
    if (!notificationHandledNatively) {
      updateBackgroundSentinel(
        'Emergência ativa — Escolta UNITAU',
        `Verifique ${childNameRef.current} imediatamente.`
      ).catch(() => {});
    }
    if (ALERT_OUTPUTS_ENABLED && preferencesRef.current.notificationsEnabled && !notificationHandledNatively) {
      showEmergencyNotification(childNameRef.current, reason).catch(() => {});
    }
    if (ALERT_OUTPUTS_ENABLED) notifyEmergencyContact(reason);
  }, [addAlert, notifyEmergencyContact, startLocalAlarm]);

  const conectar = useCallback(async () => {
    if (shuttingDownRef.current || standbyRef.current) return;
    try {
      const granted = await prepareNotifications(true);
      if (mountedRef.current) {
        setState(previous => ({ ...previous, notificacoesAutorizadas: granted }));
      }
    } catch {}
    const isReconnection = reconnectingRef.current;
    try {
      // Notificações não autorizam Bluetooth. Conferir antes do serviço nativo.
      await ensureBlePermissions();
    } catch (error) {
      if (mountedRef.current && !shuttingDownRef.current) {
        setState(previous => ({ ...previous, isScanning: false,
          scanError: error instanceof Error ? error.message : 'Não foi possível verificar a permissão de Bluetooth.' }));
      }
      return;
    }
    if (!mountedRef.current || shuttingDownRef.current || standbyRef.current) return;
    await startBackgroundSentinel(
      isBleConnected() ? 'Sentinela ativa' : isReconnection ? 'Vínculo interrompido' : 'Sentinela procurando',
      isBleConnected()
        ? 'Monitorando o vínculo com o dispositivo Escolta'
        : isReconnection
          ? 'A Sentinela está tentando reconectar ao dispositivo Escolta'
          : 'Buscando o dispositivo Escolta próximo'
    ).catch(() => false);
    await restoreBackgroundEmergencyState();
    if (isBleConnected()) return;
    if (mountedRef.current) setState(previous => ({ ...previous, isScanning: true, scanError: null }));
    try {
      await connectBle();
      if (mountedRef.current) setState(previous => ({ ...previous, isScanning: false, scanError: null }));
    } catch (error: any) {
      if (mountedRef.current) {
        setState(previous => ({
          ...previous,
          isScanning: false,
          scanError: error?.message || 'Não foi possível localizar o dispositivo.',
        }));
      }
    }
  }, [restoreBackgroundEmergencyState]);

  const encerrarMonitoramento = useCallback(async () => {
    alarmGenerationRef.current++;
    shuttingDownRef.current = true;
    wasConnectedRef.current = false;
    isConnectedRef.current = false;
    reconnectingRef.current = false;
    emergencyRef.current = false;
    previousNivelRef.current = 'desconectado';
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = null;
    if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
    reconnectIntervalRef.current = null;
    stopLocalAlarm();
    await Promise.allSettled([
      cancelBackgroundEmergency(),
      dismissEmergencyNotification(),
      disconnectBle(),
    ]);
    await stopBackgroundSentinel().catch(() => false);
    if (mountedRef.current) {
      setState(previous => ({
        ...previous,
        modoPanico: false,
        nivelSinal: 'desconectado',
        conectado: false,
        reconectando: false,
        aguardandoConfirmacao: false,
        segurancaConfirmadaSemVinculo: false,
        distanciaEstimada: null,
        isScanning: false,
        sincronizandoProtecao: false,
      }));
    }
  }, [stopLocalAlarm]);

  const colocarEmEspera = useCallback(async () => {
    if (!isBleConnected()) {
      throw new Error('Conecte-se ao dispositivo Escolta para confirmar o modo de espera.');
    }
    standbyTransitionRef.current = true;
    if (mountedRef.current) setState(previous => ({ ...previous, alterandoEspera: true }));
    try {
      await setMonitoringModeBle(false);
      alarmGenerationRef.current++;
      standbyRef.current = true;
      desiredMonitoringActiveRef.current = false;
      await AsyncStorage.setItem(MONITORING_INTENT_STORAGE_KEY, 'standby').catch(() => {});
      wasConnectedRef.current = false;
      isConnectedRef.current = false;
      reconnectingRef.current = false;
      emergencyRef.current = false;
      previousNivelRef.current = 'desconectado';
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
      stopLocalAlarm();
      await Promise.allSettled([
        cancelBackgroundEmergency(),
        dismissEmergencyNotification(),
        disconnectBle(),
      ]);
      await stopBackgroundSentinel().catch(() => false);
      addAlert({
        type: 'info',
        title: 'Sentinela em espera',
        desc: 'O responsável pausou intencionalmente o monitoramento do dispositivo.',
      });
      if (mountedRef.current) {
        setState(previous => ({
          ...previous,
          emEspera: true,
          alterandoEspera: false,
          sincronizandoProtecao: false,
          modoPanico: false,
          nivelSinal: 'desconectado',
          conectado: false,
          reconectando: false,
          aguardandoConfirmacao: false,
          segurancaConfirmadaSemVinculo: false,
          distanciaEstimada: null,
          isScanning: false,
          scanError: null,
        }));
      }
    } finally {
      standbyTransitionRef.current = false;
      if (mountedRef.current) setState(previous => ({ ...previous, alterandoEspera: false }));
    }
  }, [addAlert, stopLocalAlarm]);

  const retomarProtecao = useCallback(async (automaticamente = false) => {
    standbyTransitionRef.current = true;
    shuttingDownRef.current = false;
    if (mountedRef.current) {
      setState(previous => ({
        ...previous,
        emEspera: automaticamente ? false : previous.emEspera,
        alterandoEspera: true,
        sincronizandoProtecao: automaticamente,
        isScanning: true,
        scanError: null,
      }));
    }
    try {
      await connectBle();
      await setMonitoringModeBle(true);
      standbyRef.current = false;
      desiredMonitoringActiveRef.current = true;
      await AsyncStorage.setItem(MONITORING_INTENT_STORAGE_KEY, 'active').catch(() => {});
      wasConnectedRef.current = true;
      isConnectedRef.current = true;
      await startBackgroundSentinel(
        'Sentinela ativa',
        'Monitorando o vínculo com o dispositivo Escolta'
      ).catch(() => false);
      addAlert({
        type: 'info',
        title: 'Proteção retomada',
        desc: 'A placa confirmou a retomada do monitoramento.',
      });
      if (mountedRef.current) {
        setState(previous => ({
          ...previous,
          emEspera: false,
          alterandoEspera: false,
          sincronizandoProtecao: false,
          conectado: true,
          reconectando: false,
          isScanning: false,
          scanError: null,
        }));
      }
    } catch (error) {
      standbyRef.current = true;
      wasConnectedRef.current = false;
      isConnectedRef.current = false;
      await disconnectBle().catch(() => {});
      if (mountedRef.current) {
        setState(previous => ({
          ...previous,
          emEspera: true,
          alterandoEspera: false,
          sincronizandoProtecao: false,
          conectado: false,
          isScanning: false,
          scanError: error instanceof Error ? error.message : 'Não foi possível retomar a proteção.',
        }));
      }
      throw error;
    } finally {
      standbyTransitionRef.current = false;
    }
  }, [addAlert]);

  const prepararLogoff = useCallback(async () => {
    if (!standbyRef.current) {
      if (!isBleConnected()) {
        throw new Error('A placa está sem conexão e não pôde confirmar o modo de espera.');
      }
      standbyTransitionRef.current = true;
      try {
        await setMonitoringModeBle(false);
        standbyRef.current = true;
      } finally {
        standbyTransitionRef.current = false;
      }
    }
    await encerrarMonitoramento();
  }, [encerrarMonitoramento]);

  const liberarRecursosDoMonitor = useCallback(() => {
    if (releasedResourcesRef.current) return releasedResourcesRef.current;
    mountedRef.current = false;
    alarmGenerationRef.current++;
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
    // Resource disposal is not an acknowledgement of safety: it must not
    // cancel the native emergency or fabricate a board reset on account loss.
    releasedResourcesRef.current = Promise.allSettled([
      disconnectBle(),
      soundRef.current?.unloadAsync() ?? Promise.resolve(),
    ]).then(() => {});
    return releasedResourcesRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    releasedResourcesRef.current = null;
    AsyncStorage.getItem(MONITORING_INTENT_STORAGE_KEY).then(value => {
      if (!mountedRef.current) return;
      const intentionalStandby = value === 'standby';
      desiredMonitoringActiveRef.current = !intentionalStandby;
      standbyRef.current = intentionalStandby;
      setState(previous => ({ ...previous, emEspera: intentionalStandby }));
      setMonitoringIntentReady(true);
    }).catch(() => {
      if (mountedRef.current) setMonitoringIntentReady(true);
    });
    restoreBackgroundEmergencyState();
    const historyGeneration = historyGenerationRef.current;
    loadAlerts().then(alertas => {
      if (mountedRef.current && historyGeneration === historyGenerationRef.current) {
        alertsLoadedRef.current = true;
        setState(previous => {
          const merged = [...previous.alertas, ...alertas.filter(a => !previous.alertas.some(b => b.id === a.id))].slice(0, MAX_SAVED_ALERTS);
          persistAlerts(merged);
          return { ...previous, alertas: merged };
        });
      }
    });
    AsyncStorage.getItem(PROFILE_STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const profile = JSON.parse(raw);
        if (profile.nomeCrianca?.trim()) childNameRef.current = profile.nomeCrianca.trim();
      } catch {}
    });

    Audio.Sound.createAsync(require('../../assets/alert_tone.wav')).then(async ({ sound }) => {
      await sound.setIsLoopingAsync(true);
      if (!mountedRef.current) return sound.unloadAsync();
      soundRef.current = sound;
      setState(previous => ({ ...previous, somCarregado: true }));
      // Uma emergência pode começar antes de o arquivo de áudio terminar de carregar.
      const generation = alarmGenerationRef.current;
      if (emergencyRef.current) {
        const active = await withTimeout(isBackgroundEmergencyActive(), 1000, 'Sirene sem resposta.').catch(() => false);
        if (!active && mountedRef.current && emergencyRef.current && generation === alarmGenerationRef.current) startLocalAlarm();
      }
    }).catch(() => {
      if (mountedRef.current) setState(previous => ({ ...previous, somCarregado: false }));
    });

    return () => {
      void liberarRecursosDoMonitor();
    };
  }, [restoreBackgroundEmergencyState, liberarRecursosDoMonitor]);

  useEffect(() => subscribeAccountStorage((key, raw) => {
    if (key !== PROFILE_STORAGE_KEY || !mountedRef.current) return;
    try {
      const profile = raw ? JSON.parse(raw) : null;
      childNameRef.current = typeof profile?.nomeCrianca === 'string' && profile.nomeCrianca.trim()
        ? profile.nomeCrianca.trim() : 'A criança';
    } catch {}
  }), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        if (VALIDATED_MONITOR_ENABLED) {
          foregroundRecoveryUntilRef.current = Date.now() + 6000;
          if (isConnectedRef.current && !standbyRef.current) {
            setState(previous => ({ ...previous, dadosValidos: false, distanciaEstimada: null,
              falhaTecnica: 'Aguardando leitura atual após voltar ao aplicativo.' }));
          }
          if (!isBleConnected() && preferencesRef.current.autoConnect && !standbyRef.current) {
            conectar().catch(() => {});
          }
        }
        // O serviço Android pode declarar emergência enquanto o JavaScript está
        // suspenso. Ao voltar, o estado nativo sempre prevalece sobre a última UI.
        restoreBackgroundEmergencyState().catch(() => false);
      }
    });
    return () => subscription.remove();
  }, [restoreBackgroundEmergencyState, conectar]);

  useEffect(() => {
    let checking = false;
    const interval = setInterval(async () => {
      if (!emergencyRef.current || checking || !mountedRef.current || shuttingDownRef.current) return;
      checking = true;
      try { await restoreBackgroundEmergencyState(); } finally { checking = false; }
    }, 2500);
    return () => clearInterval(interval);
  }, [restoreBackgroundEmergencyState]);

  useEffect(() => {
    const onStatusUpdate = (data: Esp32Status) => {
      if (!mountedRef.current || shuttingDownRef.current) return;
      if (!validTelemetry(data)) {
        latestTelemetryRef.current = null;
        setState(previous => ({ ...previous, dadosValidos: false, distanciaEstimada: null,
          falhaTecnica: 'Mensagem da placa inválida. Aguardando dados válidos.' }));
        return;
      }
      const firstValidStatus = !telemetryReceivedRef.current;
      telemetryReceivedRef.current = true;
      lastTelemetryRef.current = Date.now();
      latestTelemetryRef.current = data;
      const freshSignal = data.rssiFresh !== false && data.rssi < 0 && data.rssi > -127;
      if (freshSignal) lastFreshSignalRef.current = Date.now();
      const deviceStandby = data.monitoramento_ativo === false;
      const shouldResumeAutomatically = deviceStandby
        && desiredMonitoringActiveRef.current
        && !standbyTransitionRef.current;
      standbyRef.current = deviceStandby;
      const measuredLevel = nivelDoEstado(data.estado, data.rssi);
      const batteryPercent = typeof data.bateria_pct === 'number' && Number.isFinite(data.bateria_pct)
        ? Math.max(0, Math.min(100, Math.round(data.bateria_pct)))
        : null;
      const deviceEmergency = !deviceStandby && (data.panico_ativo || measuredLevel === 'panico');
      isConnectedRef.current = true;
      wasConnectedRef.current = true;

      if (freshSignal && !deviceStandby) {
        notifyBackgroundConnectionRestored().catch(() => {});
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
          alarmGenerationRef.current++;
        }
      }

      if (deviceEmergency && !emergencyRef.current) {
        const reason = data.panico_ativo
          ? 'O dispositivo acionou o protocolo de emergência.'
          : 'O sinal fraco sustentado atingiu a condição de alerta da placa.';
        // O serviço nativo toca mesmo com o app minimizado ou a tela bloqueada.
        // A UI e o registro são ativados imediatamente para impedir duplicidade.
        activateEmergency(reason, true);
        const alarmGeneration = ++alarmGenerationRef.current;
        if (ALERT_OUTPUTS_ENABLED) {
          armBackgroundEmergency(
            childNameRef.current,
            0,
            preferencesRef.current.notificationsEnabled,
            preferencesRef.current.vibrationEnabled,
            reason
          ).then(started => {
            if (alarmGeneration !== alarmGenerationRef.current || !emergencyRef.current || !mountedRef.current) return;
            if (started) return;
            startLocalAlarm();
            if (preferencesRef.current.notificationsEnabled) {
              showEmergencyNotification(childNameRef.current, reason).catch(() => {});
            }
          }).catch(() => {
            if (alarmGeneration !== alarmGenerationRef.current || !emergencyRef.current || !mountedRef.current) return;
            startLocalAlarm();
            if (preferencesRef.current.notificationsEnabled) {
              showEmergencyNotification(childNameRef.current, reason).catch(() => {});
            }
          });
        } else {
          cancelBackgroundEmergency().catch(() => {});
          dismissEmergencyNotification().catch(() => {});
        }
      } else if (!deviceStandby && !emergencyRef.current
          && freshSignal && measuredLevel === 'aviso' && previousNivelRef.current === 'seguro') {
        // Mantém a vibração breve de atenção; não inicia sirene de emergência.
        if (ALERT_OUTPUTS_ENABLED && preferencesRef.current.vibrationEnabled) {
          Vibration.vibrate([0, 250, 120, 250]);
        }
        addAlert({
          type: 'aviso',
          title: 'Alcance reduzido',
          desc: 'O sinal BLE ficou mais fraco de forma sustentada. Observe a proximidade e possíveis obstáculos.',
        });
      } else if (!deviceStandby && !emergencyRef.current
          && measuredLevel === 'seguro' && previousNivelRef.current === 'aviso') {
        addAlert({
          type: 'info',
          title: 'Sinal restabelecido',
          desc: 'O sinal Bluetooth voltou à faixa de proximidade do Escolta.',
        });
      }

      if (batteryPercent != null) {
        if (data.carregando === true || batteryPercent > 25) {
          batteryAlertLevelRef.current = 0;
        } else {
          const nextLevel: 0 | 10 | 20 = batteryPercent <= 10 ? 10 : batteryPercent <= 20 ? 20 : 0;
          const shouldNotify = nextLevel !== 0
            && (batteryAlertLevelRef.current === 0 || nextLevel < batteryAlertLevelRef.current);
          if (shouldNotify) {
            batteryAlertLevelRef.current = nextLevel;
            const critical = nextLevel === 10;
            addAlert({
              type: 'aviso',
              title: critical ? 'Bateria crítica' : 'Bateria baixa',
              desc: critical
                ? `O dispositivo está com cerca de ${batteryPercent}%. Recarregue agora para evitar a interrupção do monitoramento.`
                : `O dispositivo está com cerca de ${batteryPercent}%. Recarregue-o assim que possível.`,
            });
            if (ALERT_OUTPUTS_ENABLED && preferencesRef.current.notificationsEnabled) {
              showBatteryNotification(batteryPercent, critical, preferencesRef.current.vibrationEnabled).catch(() => {});
            }
          }
        }
      }

      previousNivelRef.current = emergencyRef.current ? 'panico' : measuredLevel;
      setState(previous => ({
        ...previous,
        somHabilitado: data.som_on ?? previous.somHabilitado,
        rssiAtual: data.rssi,
        versaoFirmware: typeof data.fw === 'string' ? data.fw : null,
        distanciaEstimada: typeof data.distancia_m === 'number'
          && Number.isFinite(data.distancia_m) && data.distancia_m > 0 ? data.distancia_m : null,
        bateriaPercentual: batteryPercent,
        bateriaTensao: typeof data.bateria_v === 'number' && Number.isFinite(data.bateria_v) ? data.bateria_v : null,
        bateriaCarregando: data.carregando === true,
        dispositivoUsbConectado: data.usb_conectado === true,
        modoPanico: deviceStandby ? false : emergencyRef.current,
        nivelSinal: deviceStandby ? 'desconectado' : emergencyRef.current ? 'panico' : measuredLevel,
        emEspera: deviceStandby && !shouldResumeAutomatically,
        sincronizandoProtecao: shouldResumeAutomatically,
        dadosValidos: freshSignal,
        falhaTecnica: freshSignal ? null : 'Bluetooth conectado, mas sem leitura recente do sinal.',
        conectado: true,
        reconectando: false,
        aguardandoConfirmacao: emergencyRef.current,
        segurancaConfirmadaSemVinculo: false,
        ultimaAtualizacao: new Date(),
        isScanning: false,
        scanError: null,
      }));
      if (firstValidStatus && !deviceEmergency && !deviceStandby) {
        updateBackgroundSentinel(
          'Sentinela ativa',
          'Monitorando o vínculo com o dispositivo Escolta'
        ).catch(() => {});
      }
      if (deviceStandby && !standbyTransitionRef.current) {
        emergencyRef.current = false;
        wasConnectedRef.current = false;
        stopLocalAlarm();
        cancelBackgroundEmergency().catch(() => {});
        dismissEmergencyNotification().catch(() => {});
        if (shouldResumeAutomatically) {
          retomarProtecao(true).catch(() => {});
        } else {
          stopBackgroundSentinel().catch(() => false);
          disconnectBle().catch(() => {});
        }
      }
    };

    const onConnectionChange = (connected: boolean) => {
      latestTelemetryRef.current = null;
      const hadConnection = wasConnectedRef.current;
      isConnectedRef.current = connected;
      if (connected) {
        telemetryReceivedRef.current = false;
        lastTelemetryRef.current = 0;
        lastFreshSignalRef.current = 0;
        connectionStartedRef.current = Date.now();
        wasConnectedRef.current = true;
        reconnectingRef.current = false;
        setState(previous => ({
          ...previous,
          conectado: true,
          dadosValidos: false,
          distanciaEstimada: null,
          versaoFirmware: null,
          sincronizandoProtecao: !emergencyRef.current,
          reconectando: false,
          isScanning: false,
          scanError: null,
          segurancaConfirmadaSemVinculo: false,
        }));
        updateBackgroundSentinel(
          emergencyRef.current ? 'Vínculo restabelecido' : 'Sentinela sincronizando',
          emergencyRef.current
            ? 'A conexão voltou. Confirme presencialmente a segurança da criança.'
            : 'Aguardando a primeira atualização válida do dispositivo Escolta'
        ).catch(() => {});
        return;
      }

      telemetryReceivedRef.current = false;
      setState(previous => ({
        ...previous,
        conectado: false,
        dadosValidos: false,
        nivelSinal: emergencyRef.current ? 'panico' : 'desconectado',
        distanciaEstimada: null,
        versaoFirmware: null,
      }));

      if (standbyRef.current || standbyTransitionRef.current || shuttingDownRef.current) return;
      if (VALIDATED_MONITOR_ENABLED && emergencyRef.current) {
        // Reconexão não depende de encerrar o alerta retido.
        if (preferencesRef.current.autoConnect) conectar().catch(() => {});
        return;
      }
      if (!hadConnection || emergencyRef.current) return;
      alarmGenerationRef.current++;
      reconnectingRef.current = true;
      previousNivelRef.current = 'desconectado';
      setState(previous => ({ ...previous, reconectando: true, scanError: null }));
      updateBackgroundSentinel(
        'Vínculo interrompido',
        'A Sentinela está tentando reconectar ao dispositivo Escolta'
      ).catch(() => {});
      if (ALERT_OUTPUTS_ENABLED) {
        armBackgroundEmergency(
          childNameRef.current,
          EMERGENCY_GRACE_MS,
          preferencesRef.current.notificationsEnabled,
          preferencesRef.current.vibrationEnabled
        ).catch(() => {});
      } else {
        cancelBackgroundEmergency().catch(() => {});
        dismissEmergencyNotification().catch(() => {});
      }
      addAlert({
        type: 'aviso',
        title: 'Vínculo interrompido',
        desc: 'A Sentinela iniciou uma tentativa automática de reconexão.',
      });

      if (preferencesRef.current.autoConnect) conectar();
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      graceTimerRef.current = setTimeout(async () => {
        graceTimerRef.current = null;
        const generation = alarmGenerationRef.current;
        if (!isConnectedRef.current || !telemetryReceivedRef.current || Date.now() - lastFreshSignalRef.current > 3000) {
          const nativeActive = await withTimeout(isBackgroundEmergencyActive(), 1000, 'Serviço sem resposta.').catch(() => false);
          if (generation !== alarmGenerationRef.current || shuttingDownRef.current || standbyRef.current || !mountedRef.current) return;
          activateEmergency(
            'Não foi possível recuperar o vínculo com dados válidos após a tentativa automática.',
            nativeActive
          );
        }
      }, EMERGENCY_GRACE_MS);
    };

    return setBleCallbacks(onStatusUpdate, onConnectionChange);
  }, [activateEmergency, addAlert, conectar, retomarProtecao, stopLocalAlarm]);

  useEffect(() => {
    const checkTelemetry = () => {
      if (!mountedRef.current || !isConnectedRef.current || standbyRef.current || shuttingDownRef.current) return;
      const now = Date.now();
      if (!lastTelemetryRef.current || now - lastTelemetryRef.current > 3000 || !lastFreshSignalRef.current || now - lastFreshSignalRef.current > 3000) {
        setState(previous => ({ ...previous, dadosValidos: false, distanciaEstimada: null,
          falhaTecnica: 'Leitura interrompida. Verificando a conexão Bluetooth.' }));
      }
      if (now - (lastTelemetryRef.current || connectionStartedRef.current) > 6000
          || (now - (lastFreshSignalRef.current || connectionStartedRef.current) > 6000
            && !deferRssiRecoveryForWatchdogExperiment())) {
        if (VALIDATED_MONITOR_ENABLED && now < foregroundRecoveryUntilRef.current) return;
        disconnectBle().catch(() => {});
      }
    };
    const stopNativeWatchdog = subscribeBackgroundProtectionTick(checkTelemetry);
    const watchdog = stopNativeWatchdog ? null : setInterval(checkTelemetry, 1000);
    return () => { stopNativeWatchdog?.(); if (watchdog) clearInterval(watchdog); };
  }, []);

  useEffect(() => {
    if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
    if (!monitoringIntentReady || !preferences.autoConnect || standbyRef.current) return;

    if (!isConnectedRef.current) conectar();
    let nextAttemptAt = Date.now() + RECONNECT_INTERVAL_MS;
    const retryConnection = () => {
      if (VALIDATED_MONITOR_ENABLED && Date.now() < nextAttemptAt) return;
      nextAttemptAt = Date.now() + RECONNECT_INTERVAL_MS;
      if (!standbyRef.current && !isConnectedRef.current && !isBleConnected()) conectar();
    };
    const stopNativeReconnect = subscribeBackgroundProtectionTick(retryConnection);
    if (!stopNativeReconnect) reconnectIntervalRef.current = setInterval(retryConnection, RECONNECT_INTERVAL_MS);

    return () => {
      stopNativeReconnect?.();
      if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    };
  }, [conectar, monitoringIntentReady, preferences.autoConnect, VALIDATED_MONITOR_ENABLED ? state.emEspera : null]);

  const confirmarSeguranca = useCallback(async () => {
    if (VALIDATED_MONITOR_ENABLED && !isBleConnected()) {
      throw new Error('O alerta continua ativo: reconecte a placa para ela confirmar o encerramento.');
    }
    if (VALIDATED_MONITOR_ENABLED && !isSafetyConfirmationFirmware(latestTelemetryRef.current?.fw)) {
      throw new Error('Atualize a placa para uma versão compatível com a confirmação por proximidade antes de encerrar o alerta.');
    }
    const freshSafeSignal = () => hasCurrentSafeSignal(latestTelemetryRef.current)
      && Date.now() - lastTelemetryRef.current <= 2500;
    if (VALIDATED_MONITOR_ENABLED && !freshSafeSignal()) {
      throw new Error('O alerta continua ativo. Aproxime a placa e aguarde leituras recentes na faixa segura antes de confirmar.');
    }
    let acknowledgedStatus: Esp32Status | null = null;
    if (isBleConnected()) {
      try {
        acknowledgedStatus = await resetarAlarmeBle();
      } catch {
        addAlert({
          type: 'aviso', title: 'Comando não confirmado pela placa',
          desc: 'O dispositivo não confirmou o encerramento. O alerta foi mantido; verifique a criança e tente novamente.',
        });
        throw new Error('A placa não confirmou o encerramento do alerta.');
      }
    }
    if (VALIDATED_MONITOR_ENABLED && !isBleConnected()) {
      throw new Error('A conexão caiu após a confirmação. O alerta foi mantido; reconecte e tente novamente.');
    }
    if (VALIDATED_MONITOR_ENABLED && (!isSafeResetAcknowledgement(acknowledgedStatus) || !freshSafeSignal())) {
      throw new Error('A placa ainda não confirmou leituras válidas na faixa segura. O alerta foi mantido.');
    }
    // Teste: exige resposta da placa. Oficial: preserva a confirmação presencial
    // sem vínculo que existia antes deste experimento, sem declarar cobertura.
    alarmGenerationRef.current++;
    await cancelBackgroundEmergency();
    if (!VALIDATED_MONITOR_ENABLED) stopLocalAlarm();
    await dismissEmergencyNotification();
    if (VALIDATED_MONITOR_ENABLED && (!isBleConnected() || !freshSafeSignal() || !isSafeResetAcknowledgement(latestTelemetryRef.current))) {
      startLocalAlarm();
      throw new Error('A condição segura mudou durante a confirmação. O alerta continua ativo; aproxime a placa e tente novamente.');
    }
    if (VALIDATED_MONITOR_ENABLED) stopLocalAlarm();
    emergencyRef.current = false;
    const confirmedLevel = VALIDATED_MONITOR_ENABLED && acknowledgedStatus
      ? nivelDoEstado(acknowledgedStatus.estado, acknowledgedStatus.rssi)
      : isConnectedRef.current ? 'seguro' : 'desconectado';
    previousNivelRef.current = confirmedLevel;
    setState(previous => ({
      ...previous,
      modoPanico: false,
      aguardandoConfirmacao: false,
      nivelSinal: confirmedLevel,
      reconectando: false,
      segurancaConfirmadaSemVinculo: !isConnectedRef.current,
    }));
    addAlert({
      type: 'info',
      title: 'Segurança confirmada',
      desc: isConnectedRef.current
        ? `O responsável confirmou presencialmente que ${childNameRef.current} está segura.`
        : `O responsável confirmou que ${childNameRef.current} está segura, mas o dispositivo continua sem vínculo. A Sentinela seguirá procurando.`,
    });
    updateBackgroundSentinel(
      isConnectedRef.current ? 'Sentinela ativa' : 'Sentinela sem cobertura',
      isConnectedRef.current
        ? 'Monitorando o vínculo com o dispositivo Escolta'
        : 'O dispositivo ainda não foi localizado. A Sentinela segue procurando.'
    ).catch(() => {});
  }, [addAlert, startLocalAlarm, stopLocalAlarm]);

  const continuarEmAlerta = useCallback(() => {
    if (!ALERT_OUTPUTS_ENABLED) return;
    if (!emergencyRef.current) return;
    // Se o serviço nativo já mantém a sirene, iniciar também o áudio do Expo
    // sobreporia dois sons. O fallback local só é usado quando ele não está ativo.
    const generation = alarmGenerationRef.current;
    withTimeout(isBackgroundEmergencyActive(), 1000, 'Sirene sem resposta.')
      .catch(() => false)
      .then(active => {
        if (!active && mountedRef.current && emergencyRef.current && generation === alarmGenerationRef.current) startLocalAlarm();
      });
  }, [startLocalAlarm]);

  const limparAlertas = useCallback(async () => {
    historyGenerationRef.current++;
    alertsLoadedRef.current = true;
    setState(previous => ({ ...previous, alertas: [] }));
    await AsyncStorage.setItem(ALERTS_STORAGE_KEY, '[]');
  }, []);

  const testarAlertaLocal = useCallback(async () => {
    if (!INTERNAL_TOOLS_ENABLED) throw new Error('Ferramenta interna indisponível nesta versão.');
    if (!ALERT_OUTPUTS_ENABLED) {
      throw new Error('A saída de som está indisponível.');
    }
    if (emergencyRef.current) {
      throw new Error('Finalize a emergência ativa antes de executar um teste controlado.');
    }
    const sound = soundRef.current;
    if (!sound) throw new Error('A sirene do celular ainda não está pronta.');
    if (AppState.currentState !== 'active') {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          subscription.remove();
          reject(new Error('O aplicativo ainda não recuperou o foco de áudio. Volte à tela e tente novamente.'));
        }, 3000);
        const subscription = AppState.addEventListener('change', nextState => {
          if (nextState !== 'active') return;
          clearTimeout(timeout);
          subscription.remove();
          resolve();
        });
      });
    }
    // O Android pode informar "active" alguns milissegundos antes de devolver o
    // foco de mídia depois de fechar uma interface do sistema.
    await new Promise<void>(resolve => setTimeout(resolve, 250));
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
      });
      await sound.stopAsync().catch(() => {});
      await sound.setPositionAsync(0);
      if (preferencesRef.current.vibrationEnabled) {
        Vibration.vibrate([0, 300, 180, 300, 180, 300]);
      }
      await sound.playAsync();
      await new Promise<void>(resolve => setTimeout(resolve, 2500));
    } finally {
      Vibration.cancel();
      await sound.stopAsync().catch(() => {});
      await sound.setPositionAsync(0).catch(() => {});
    }
  }, []);

  return {
    ...state,
    conectar,
    confirmarSeguranca,
    continuarEmAlerta,
    limparAlertas,
    encerrarMonitoramento,
    colocarEmEspera,
    retomarProtecao,
    prepararLogoff,
    testarAlertaLocal,
    liberarRecursosDoMonitor,
  };
}
