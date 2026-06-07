// ============================================================
// useEsp32Monitor — Hook de monitoramento contínuo da ESP32
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { fetchStatus, type Esp32Status } from '../services/esp32Api';

export type NivelSinal = 'seguro' | 'aviso' | 'panico' | 'desconectado';

export interface AlertItem {
  id: string;
  type: 'panico' | 'aviso' | 'info';
  title: string;
  time: string;
  desc: string;
}

export interface Esp32MonitorState {
  ssidSalvo: string | null;
  configurado: boolean;
  modoEstacao: boolean;
  somHabilitado: boolean;
  rssiAtual: number;
  modoPanico: boolean;
  nivelSinal: NivelSinal;
  conectado: boolean;
  ultimaAtualizacao: Date | null;
  alertas: AlertItem[];
}

const POLLING_INTERVAL = 2000; // 2 segundos

function calcularNivelSinal(rssi: number): NivelSinal {
  if (rssi > -65) return 'seguro';
  if (rssi > -80) return 'aviso';
  return 'panico';
}

export function useEsp32Monitor() {
  const [state, setState] = useState<Esp32MonitorState>({
    ssidSalvo: null,
    configurado: false,
    modoEstacao: false,
    somHabilitado: true,
    rssiAtual: 0,
    modoPanico: false,
    nivelSinal: 'desconectado',
    conectado: false,
    ultimaAtualizacao: null,
    alertas: [
      { id: Date.now().toString() + '-init', type: 'info', title: 'Monitor Iniciado', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: 'O sistema de checagem do ESP32 foi iniciado no app.' }
    ],
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jaAlertouRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Guardamos o estado anterior para não encher a lista de alertas repetidos
  const previousNivelRef = useRef<NivelSinal>('desconectado');
  const previousPanicoRef = useRef<boolean>(false);

  useEffect(() => {
    let unmounted = false;
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/alert_tone.wav')
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
    };
  }, []);

  const atualizarStatus = useCallback(async () => {
    try {
      const data: Esp32Status = await fetchStatus();
      const nivel = calcularNivelSinal(data.rssi);
      const panico = data.panico_ativo || nivel === 'panico';

      if (panico && !jaAlertouRef.current) {
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
        if (soundRef.current) soundRef.current.playAsync().catch(() => {});
        jaAlertouRef.current = true;
      }
      
      if (!panico && jaAlertouRef.current) {
        if (soundRef.current) soundRef.current.stopAsync().catch(() => {});
        jaAlertouRef.current = false;
      }

      // ==== Sistema Baseado em Eventos para Histórico (Alerts) ====
      const newAlerts: AlertItem[] = [];
      const hrAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (panico && !previousPanicoRef.current) {
        newAlerts.push({ id: Date.now().toString() + '-pan', type: 'panico', title: 'Alarme de Pânico', time: hrAtual, desc: `Sinal extremamente baixo ou desconectado. RSSI: ${data.rssi} dBm` });
      } else if (!panico && nivel === 'aviso' && previousNivelRef.current === 'seguro') {
        newAlerts.push({ id: Date.now().toString() + '-av', type: 'aviso', title: 'Sinal Fraco (Atenção)', time: hrAtual, desc: `O dispositivo está se afastando da zona segura. RSSI: ${data.rssi} dBm` });
      } else if (nivel === 'seguro' && (previousNivelRef.current === 'aviso' || previousPanicoRef.current)) {
        newAlerts.push({ id: Date.now().toString() + '-seg', type: 'info', title: 'Zona Segura Restabelecida', time: hrAtual, desc: `O sinal voltou a ficar forte e perto! RSSI: ${data.rssi} dBm` });
      }

      previousPanicoRef.current = panico;
      previousNivelRef.current = nivel;

      setState(prev => ({
        ssidSalvo: data.modo_casa ? 'Wi-Fi Casa' : 'ESCOLTA_MODO_RUA',
        configurado: data.configurado,
        modoEstacao: data.modo_casa,
        somHabilitado: data.som_on,
        rssiAtual: data.rssi,
        modoPanico: panico,
        nivelSinal: nivel,
        conectado: true,
        ultimaAtualizacao: new Date(),
        alertas: newAlerts.length > 0 ? [...newAlerts, ...prev.alertas] : prev.alertas
      }));
    } catch (error) {
      setState(prev => {
        let disconnectedAlerts: AlertItem[] = [];
        if (previousNivelRef.current !== 'desconectado') {
          disconnectedAlerts.push({
            id: Date.now().toString() + '-desc', type: 'panico', title: 'Conexão Perdida', 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            desc: 'A ESP32 parou de responder ou saiu do alcance do Wi-Fi!'
          });
          previousNivelRef.current = 'desconectado';
        }
        return {
          ...prev, conectado: false, nivelSinal: 'desconectado',
          alertas: disconnectedAlerts.length > 0 ? [...disconnectedAlerts, ...prev.alertas] : prev.alertas
        };
      });
    }
  }, []);

  useEffect(() => {
    atualizarStatus();
    intervalRef.current = setInterval(atualizarStatus, POLLING_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [atualizarStatus]);

  return { ...state, atualizarStatus };
}
