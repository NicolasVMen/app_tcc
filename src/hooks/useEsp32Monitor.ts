import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import {
  connectBle,
  disconnectBle,
  Esp32Status,
  EstadoEsp32,
  isBleConnected,
  resetarAlarmeBle,
  setMonitoringModeBle,
  setBleCallbacks,
} from '../services/bleApi';
import { useAppPreferences } from '../context/AppPreferencesContext';
import {
  armBackgroundEmergency,
  cancelBackgroundEmergency,
  isBackgroundEmergencyActive,
  notifyBackgroundConnectionRestored,
  startBackgroundSentinel,
  stopBackgroundSentinel,
  updateBackgroundSentinel,
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
// Operacao normal: sirene, vibracao, notificacao critica e canal experimental
// de e-mail acompanham os estados de alerta conforme as preferencias do app.
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
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
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
    if (raw) return JSON.parse(raw) as AlertItem[];
  } catch {}
  return [{
    id: `${Date.now()}-init`,
    type: 'info',
    title: 'Sentinela iniciada',
    time: currentTime(),
    desc: 'O monitoramento do protótipo foi iniciado.',
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
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const [state, setState] = useState<Esp32MonitorState>({
    somHabilitado: true,
    somCarregado: false,
    rssiAtual: 0,
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
    alertas: [],
    isScanning: false,
    scanError: null,
    emEspera: false,
    alterandoEspera: false,
    sincronizandoProtecao: false,
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const isConnectedRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const emergencyRef = useRef(false);
  const reconnectingRef = useRef(false);
  const previousNivelRef = useRef<NivelSinal>('desconectado');
  const childNameRef = useRef('A criança');
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const shuttingDownRef = useRef(false);
  const standbyRef = useRef(false);
  const standbyTransitionRef = useRef(false);
  const desiredMonitoringActiveRef = useRef(true);
  const batteryAlertLevelRef = useRef<0 | 10 | 20>(0);
  const telemetryReceivedRef = useRef(false);
  const [monitoringIntentReady, setMonitoringIntentReady] = useState(false);

  const restoreBackgroundEmergencyState = useCallback(async () => {
    if (!ALERT_OUTPUTS_ENABLED) {
      await cancelBackgroundEmergency().catch(() => false);
      return false;
    }
    const active = await isBackgroundEmergencyActive().catch(() => false);
    if (!active || !mountedRef.current) return false;
    emergencyRef.current = true;
    reconnectingRef.current = false;
    previousNivelRef.current = 'panico';
    setState(previous => ({
      ...previous,
      modoPanico: true,
      nivelSinal: 'panico',
      reconectando: false,
      aguardandoConfirmacao: true,
      segurancaConfirmadaSemVinculo: false,
    }));
    return true;
  }, []);

  const addAlert = useCallback((alert: Omit<AlertItem, 'id' | 'time'>) => {
    const complete: AlertItem = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: currentTime(),
    };
    setState(previous => {
      const alertas = [complete, ...previous.alertas].slice(0, MAX_SAVED_ALERTS);
      persistAlerts(alertas);
      return { ...previous, alertas };
    });
  }, []);

  const stopLocalAlarm = useCallback(() => {
    Vibration.cancel();
    soundRef.current?.stopAsync().catch(() => {});
  }, []);

  const startLocalAlarm = useCallback(() => {
    if (!ALERT_OUTPUTS_ENABLED) return;
    if (preferencesRef.current.vibrationEnabled) {
      Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
    }
    soundRef.current?.playAsync().catch(() => {});
  }, []);

  const notifyEmergencyContact = useCallback(async (reason: string) => {
    if (!ALERT_OUTPUTS_ENABLED) return;
    if (!preferencesRef.current.notificationsEnabled) return;
    try {
      const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return;
      const profile = JSON.parse(raw);
      if (!profile.emailEmergencia) return;

      const locationLine = preferencesRef.current.shareLocation
        ? await getResponsiblePhoneLocation()
        : 'Compartilhamento de localização desativado pelo responsável.';
      const message = [
        'EMERGÊNCIA — Escolta UNITAU (protótipo acadêmico)',
        '',
        `${childNameRef.current}: ${reason}`,
        locationLine,
        '',
        'Verifique a situação e tente contato imediato com o responsável.',
      ].join('\n');

      // Canal experimental do protótipo. Em uma evolução, o envio deve passar por backend autenticado.
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_oepr28p',
          template_id: 'template_4wi1j79',
          user_id: 'o4hSlYAVWUIATAbWp',
          template_params: {
            to_email: profile.emailEmergencia,
            message,
            child_name: childNameRef.current,
          },
        }),
      });
    } catch {
      addAlert({
        type: 'aviso',
        title: 'Aviso externo não confirmado',
        desc: 'A emergência local continua ativa, mas o canal experimental de e-mail não confirmou o envio.',
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

  useEffect(() => {
    mountedRef.current = true;
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
    loadAlerts().then(alertas => {
      if (mountedRef.current) setState(previous => ({ ...previous, alertas }));
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
    }).catch(() => {
      if (mountedRef.current) setState(previous => ({ ...previous, somCarregado: false }));
    });

    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, [restoreBackgroundEmergencyState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        // O serviço Android pode declarar emergência enquanto o JavaScript está
        // suspenso. Ao voltar, o estado nativo sempre prevalece sobre a última UI.
        restoreBackgroundEmergencyState().catch(() => false);
      }
    });
    return () => subscription.remove();
  }, [restoreBackgroundEmergencyState]);

  useEffect(() => {
    const onStatusUpdate = (data: Esp32Status) => {
      const firstValidStatus = !telemetryReceivedRef.current;
      telemetryReceivedRef.current = true;
      const deviceStandby = data.monitoramento_ativo === false;
      const shouldResumeAutomatically = deviceStandby
        && desiredMonitoringActiveRef.current
        && !standbyTransitionRef.current;
      standbyRef.current = deviceStandby;
      const measuredLevel = nivelDoEstado(data.estado, data.rssi);
      const batteryPercent = typeof data.bateria_pct === 'number'
        ? Math.max(0, Math.min(100, Math.round(data.bateria_pct)))
        : null;
      const deviceEmergency = !deviceStandby && (data.panico_ativo || measuredLevel === 'panico');
      isConnectedRef.current = true;
      wasConnectedRef.current = true;

      if (deviceEmergency && !emergencyRef.current) {
        const reason = data.panico_ativo
          ? 'O dispositivo acionou o protocolo de emergência.'
          : 'A estimativa de proximidade ultrapassou o limite configurado.';
        // O serviço nativo toca mesmo com o app minimizado ou a tela bloqueada.
        // A UI e o registro são ativados imediatamente para impedir duplicidade.
        activateEmergency(reason, true);
        if (ALERT_OUTPUTS_ENABLED) {
          armBackgroundEmergency(
            childNameRef.current,
            0,
            preferencesRef.current.notificationsEnabled,
            preferencesRef.current.vibrationEnabled
          ).then(started => {
            if (started) return;
            startLocalAlarm();
            if (preferencesRef.current.notificationsEnabled) {
              showEmergencyNotification(childNameRef.current, reason).catch(() => {});
            }
          }).catch(() => {
            startLocalAlarm();
            if (preferencesRef.current.notificationsEnabled) {
              showEmergencyNotification(childNameRef.current, reason).catch(() => {});
            }
          });
        } else {
          cancelBackgroundEmergency().catch(() => {});
          dismissEmergencyNotification().catch(() => {});
        }
      } else if (measuredLevel === 'aviso' && previousNivelRef.current === 'seguro') {
        if (ALERT_OUTPUTS_ENABLED && preferencesRef.current.vibrationEnabled) {
          Vibration.vibrate([0, 250, 120, 250]);
        }
        addAlert({
          type: 'aviso',
          title: 'Alcance reduzido',
          desc: `${childNameRef.current} pode estar se afastando. Aproxime-se e observe o ambiente.`,
        });
      } else if (measuredLevel === 'seguro' && previousNivelRef.current === 'aviso') {
        addAlert({
          type: 'info',
          title: 'Cobertura restabelecida',
          desc: 'A estimativa voltou à faixa segura do protótipo.',
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
              showBatteryNotification(batteryPercent, critical).catch(() => {});
            }
          }
        }
      }

      previousNivelRef.current = emergencyRef.current ? 'panico' : measuredLevel;
      setState(previous => ({
        ...previous,
        somHabilitado: data.som_on,
        rssiAtual: data.rssi,
        distanciaEstimada: typeof data.distancia_m === 'number' ? data.distancia_m : null,
        bateriaPercentual: batteryPercent,
        bateriaTensao: typeof data.bateria_v === 'number' ? data.bateria_v : null,
        bateriaCarregando: data.carregando === true,
        dispositivoUsbConectado: data.usb_conectado === true,
        modoPanico: deviceStandby ? false : emergencyRef.current,
        nivelSinal: deviceStandby ? 'desconectado' : emergencyRef.current ? 'panico' : measuredLevel,
        emEspera: deviceStandby && !shouldResumeAutomatically,
        sincronizandoProtecao: shouldResumeAutomatically,
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
      const hadConnection = wasConnectedRef.current;
      isConnectedRef.current = connected;
      if (connected) {
        telemetryReceivedRef.current = false;
        notifyBackgroundConnectionRestored().catch(() => {});
        wasConnectedRef.current = true;
        reconnectingRef.current = false;
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
          addAlert({
            type: 'info',
            title: 'Vínculo restabelecido',
            desc: emergencyRef.current
              ? 'A conexão voltou. Confirme presencialmente que a criança está segura.'
              : 'A Sentinela recuperou a conexão antes de iniciar uma emergência.',
          });
        }
        setState(previous => ({
          ...previous,
          conectado: true,
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
        nivelSinal: emergencyRef.current ? 'panico' : 'desconectado',
        distanciaEstimada: null,
      }));

      if (standbyRef.current || standbyTransitionRef.current || shuttingDownRef.current) return;
      if (!hadConnection || emergencyRef.current) return;
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
      graceTimerRef.current = setTimeout(() => {
        graceTimerRef.current = null;
        if (!isConnectedRef.current) {
          activateEmergency(
            'Não foi possível restabelecer o vínculo após a tentativa automática.',
            ALERT_OUTPUTS_ENABLED && preferencesRef.current.notificationsEnabled
          );
        }
      }, EMERGENCY_GRACE_MS);
    };

    setBleCallbacks(onStatusUpdate, onConnectionChange);
  }, [activateEmergency, addAlert, conectar, retomarProtecao, stopLocalAlarm]);

  useEffect(() => {
    if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
    if (!monitoringIntentReady || !preferences.autoConnect || standbyRef.current) return;

    if (!isConnectedRef.current) conectar();
    reconnectIntervalRef.current = setInterval(() => {
      if (!standbyRef.current && !isConnectedRef.current && !isBleConnected()) conectar();
    }, RECONNECT_INTERVAL_MS);

    return () => {
      if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    };
  }, [conectar, monitoringIntentReady, preferences.autoConnect]);

  const confirmarSeguranca = useCallback(async () => {
    let hardwareResetConfirmed = true;
    if (isBleConnected()) {
      try {
        await resetarAlarmeBle();
      } catch {
        hardwareResetConfirmed = false;
        isConnectedRef.current = false;
        await disconnectBle().catch(() => {});
      }
    }
    stopLocalAlarm();
    await cancelBackgroundEmergency();
    await dismissEmergencyNotification();
    emergencyRef.current = false;
    previousNivelRef.current = isConnectedRef.current ? 'seguro' : 'desconectado';
    setState(previous => ({
      ...previous,
      modoPanico: false,
      aguardandoConfirmacao: false,
      nivelSinal: isConnectedRef.current ? 'seguro' : 'desconectado',
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
    if (!hardwareResetConfirmed) {
      addAlert({
        type: 'aviso',
        title: 'Comando não confirmado pela placa',
        desc: 'A confirmação no celular foi concluída. A Sentinela reiniciará o vínculo para sincronizar o dispositivo.',
      });
    }
    updateBackgroundSentinel(
      isConnectedRef.current ? 'Sentinela ativa' : 'Sentinela sem cobertura',
      isConnectedRef.current
        ? 'Monitorando o vínculo com o dispositivo Escolta'
        : 'O dispositivo ainda não foi localizado. A Sentinela segue procurando.'
    ).catch(() => {});
    if (!hardwareResetConfirmed && preferencesRef.current.autoConnect) conectar();
  }, [addAlert, conectar, stopLocalAlarm]);

  const continuarEmAlerta = useCallback(() => {
    if (!ALERT_OUTPUTS_ENABLED) return;
    if (!emergencyRef.current) return;
    // Se o serviço nativo já mantém a sirene, iniciar também o áudio do Expo
    // sobreporia dois sons. O fallback local só é usado quando ele não está ativo.
    isBackgroundEmergencyActive()
      .then(active => { if (!active) startLocalAlarm(); })
      .catch(() => startLocalAlarm());
  }, [startLocalAlarm]);

  const limparAlertas = useCallback(async () => {
    await AsyncStorage.removeItem(ALERTS_STORAGE_KEY);
    setState(previous => ({ ...previous, alertas: [] }));
  }, []);

  const testarAlertaLocal = useCallback(async () => {
    if (!ALERT_OUTPUTS_ENABLED) {
      throw new Error('Os disparos estão temporariamente desativados durante o teste de autonomia.');
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
  };
}
