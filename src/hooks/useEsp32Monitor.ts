// ============================================================
// useEsp32Monitor — Hook de monitoramento contínuo via BLE
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectBle, disconnectBle, isBleConnected, setBleCallbacks } from '../services/bleApi';
import { Esp32Status, EstadoEsp32 } from '../services/esp32Api';

const ALERTS_STORAGE_KEY = '@escolta_alerts_history';
const MAX_SAVED_ALERTS = 200; // Limite para não encher o storage

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
  rssiAtual: number;
  distanciaEstimada: number | null;
  modoPanico: boolean;
  nivelSinal: NivelSinal;
  conectado: boolean;
  ultimaAtualizacao: Date | null;
  alertas: AlertItem[];
  isScanning: boolean;
  scanError: string | null;
}

function nivelDoEstado(estado: EstadoEsp32 | undefined, rssi: number): NivelSinal {
  switch (estado) {
    case 'seguro': return 'seguro';
    case 'atencao': return 'aviso';
    case 'perigo':
    case 'panico': return 'panico';
    default:
      // Valores calibrados com base no Experimento TCC
      if (rssi > -70) return 'seguro';
      if (rssi > -85) return 'aviso';
      return 'panico';
  }
}

// Salva alertas no storage de forma segura
async function persistAlerts(alertas: AlertItem[]) {
  try {
    const toSave = alertas.slice(0, MAX_SAVED_ALERTS);
    await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {}
}

// Carrega alertas do storage
async function loadAlerts(): Promise<AlertItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AlertItem[];
  } catch (e) {}
  return [
    {
      id: Date.now().toString() + '-init',
      type: 'info',
      title: 'Monitor Iniciado',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      desc: 'O sistema BLE foi iniciado.'
    }
  ];
}

export function useEsp32Monitor() {
  const [state, setState] = useState<Esp32MonitorState>({
    somHabilitado: true,
    rssiAtual: 0,
    distanciaEstimada: null,
    modoPanico: false,
    nivelSinal: 'desconectado',
    conectado: false,
    ultimaAtualizacao: null,
    alertas: [],
    isScanning: false,
    scanError: null,
  });

  const jaAlertouRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previousNivelRef = useRef<NivelSinal>('desconectado');
  const previousPanicoRef = useRef<boolean>(false);
  const autoReconnectRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const childNameRef = useRef<string>('');

  // === CARREGAR HISTÓRICO E NOME DA CRIANÇA ===
  useEffect(() => {
    loadAlerts().then(savedAlerts => {
      setState(prev => ({ ...prev, alertas: savedAlerts }));
    });
    // Carrega nome da criança para usar nos alertas
    AsyncStorage.getItem('@escolta_user_profile').then(raw => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (p.nomeCrianca) childNameRef.current = p.nomeCrianca;
        } catch (e) {}
      }
    });
  }, []);

  // === CARREGAR SOM ===
  useEffect(() => {
    let unmounted = false;
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alert_tone.wav')
        );
        await sound.setIsLoopingAsync(true);
        if (!unmounted) soundRef.current = sound;
        else sound.unloadAsync();
      } catch (err) {}
    }
    loadSound();
    return () => {
      unmounted = true;
      if (soundRef.current) soundRef.current.unloadAsync();
      disconnectBle();
      if (autoReconnectRef.current) clearInterval(autoReconnectRef.current);
    };
  }, []);

  // === CONECTAR ===
  const conectar = useCallback(async () => {
    if (isBleConnected()) return;
    setState(prev => ({ ...prev, isScanning: true, scanError: null }));
    try {
      await connectBle();
      setState(prev => ({ ...prev, isScanning: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isScanning: false, scanError: err.message }));
    }
  }, []);

  // === AUTO-RECONEXÃO (Cão de Guarda) ===
  // Tenta reconectar automaticamente a cada 8 segundos se desconectado
  useEffect(() => {
    autoReconnectRef.current = setInterval(() => {
      if (!isConnectedRef.current && !isBleConnected()) {
        conectar().catch(() => {});
      }
    }, 8000);

    return () => {
      if (autoReconnectRef.current) clearInterval(autoReconnectRef.current);
    };
  }, [conectar]);

  // === CALLBACKS BLE ===
  useEffect(() => {
    const onStatusUpdate = (data: Esp32Status) => {
      const nivel = nivelDoEstado(data.estado, data.rssi);
      const isPanico = data.panico_ativo || nivel === 'panico';

      isConnectedRef.current = true;

      // 1. LÓGICA DE PÂNICO: Vibração contínua + Sirene
      if (isPanico && !jaAlertouRef.current) {
        Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
        if (soundRef.current) soundRef.current.playAsync().catch(() => {});
        jaAlertouRef.current = true;
      }

      // Desligar o Pânico
      if (!isPanico && jaAlertouRef.current) {
        Vibration.cancel();
        if (soundRef.current) soundRef.current.stopAsync().catch(() => {});
        jaAlertouRef.current = false;
      }

      // 2. LÓGICA DE AVISO: Apenas vibração dupla curta, sem som
      if (!isPanico && nivel === 'aviso' && previousNivelRef.current !== 'aviso') {
        Vibration.vibrate([0, 300, 100, 300]);
      }

      const newAlerts: AlertItem[] = [];
      const hrAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const nome = childNameRef.current || 'A criança';

      if (isPanico && !previousPanicoRef.current) {
        newAlerts.push({
          id: Date.now().toString() + '-pan', type: 'panico',
          title: '🚨 Alarme de Pânico', time: hrAtual,
          desc: `${nome} se afastou além do limite seguro! RSSI: ${data.rssi} dBm`
        });

        // 3. LÓGICA DE DISPARO INVISÍVEL NA NUVEM (Telegram/Email)
        AsyncStorage.getItem('@escolta_user_profile').then(raw => {
          if (raw) {
            const prof = JSON.parse(raw);
            const msg = `🚨 ALERTA DE PÂNICO (Escolta UNITAU) 🚨\n\nO colar de segurança de ${nome} ativou o modo pânico. Possível afastamento! Tente contato imediato.`;
            
            if (prof.telefoneEmergencia) {
              fetch(`https://api.telegram.org/bot8936092894:AAFCgwcQ523iMO1Lxe55bgsxv_hIEOGXQyc/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: prof.telefoneEmergencia, text: msg })
              }).catch(() => {});
            }
            if (prof.emailEmergencia) {
              fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  service_id: 'service_oepr28p', template_id: 'template_4wi1j79', user_id: 'o4hSlYAVWUIATAbWp',
                  template_params: { to_email: prof.emailEmergencia, message: msg, child_name: nome }
                })
              }).catch(() => {});
            }
          }
        }).catch(() => {});

      } else if (!isPanico && nivel === 'aviso' && previousNivelRef.current === 'seguro') {
        newAlerts.push({
          id: Date.now().toString() + '-av', type: 'aviso',
          title: 'Sinal Fraco (Atenção)', time: hrAtual,
          desc: `${nome} está se afastando. RSSI: ${data.rssi} dBm`
        });
      } else if (nivel === 'seguro' && (previousNivelRef.current === 'aviso' || previousPanicoRef.current)) {
        newAlerts.push({
          id: Date.now().toString() + '-seg', type: 'info',
          title: 'Zona Segura Restabelecida', time: hrAtual,
          desc: `${nome} voltou para a zona segura. RSSI: ${data.rssi} dBm`
        });
      }

      previousPanicoRef.current = isPanico;
      previousNivelRef.current = nivel;

      setState(prev => {
        const updatedAlerts = newAlerts.length > 0 ? [...newAlerts, ...prev.alertas] : prev.alertas;
        if (newAlerts.length > 0) persistAlerts(updatedAlerts);
        return {
          ...prev,
          somHabilitado: data.som_on,
          rssiAtual: data.rssi,
          distanciaEstimada: typeof data.distancia_m === 'number' ? data.distancia_m : null,
          modoPanico: isPanico,
          nivelSinal: nivel,
          conectado: true,
          ultimaAtualizacao: new Date(),
          alertas: updatedAlerts,
        };
      });
    };

    const onConnectionChange = (isConnected: boolean) => {
      isConnectedRef.current = isConnected;
      if (!isConnected) {
        setState(prev => {
          let disconnectedAlerts: AlertItem[] = [];
          if (previousNivelRef.current !== 'desconectado') {
            const newAlert: AlertItem = {
              id: Date.now().toString() + '-desc', type: 'panico',
              title: 'Conexão Perdida',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              desc: 'O dispositivo BLE foi desconectado! Tentando reconectar...'
            };
            disconnectedAlerts.push(newAlert);
            previousNivelRef.current = 'desconectado';
          }
          const updatedAlerts = disconnectedAlerts.length > 0
            ? [...disconnectedAlerts, ...prev.alertas]
            : prev.alertas;
          if (disconnectedAlerts.length > 0) persistAlerts(updatedAlerts);
          return {
            ...prev, conectado: false, nivelSinal: 'desconectado',
            alertas: updatedAlerts,
          };
        });
      }
    };

    setBleCallbacks(onStatusUpdate, onConnectionChange);
  }, []);

  const limparAlertas = useCallback(async () => {
    const emptyAlerts: AlertItem[] = [];
    await AsyncStorage.removeItem(ALERTS_STORAGE_KEY);
    setState(prev => ({ ...prev, alertas: emptyAlerts }));
  }, []);

  return { ...state, conectar, limparAlertas };
}
