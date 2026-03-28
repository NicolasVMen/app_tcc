// ============================================================
// useEsp32Monitor — Hook de monitoramento contínuo da ESP32
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { fetchStatus, type Esp32Status } from '../services/esp32Api';

export type NivelSinal = 'seguro' | 'aviso' | 'panico' | 'desconectado';

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
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jaAlertouRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Inicializa o som de alerta uma única vez
  useEffect(() => {
    let unmounted = false;
    async function loadSound() {
      try {
        // Carrega um som de alerta online como placeholder
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://cdn.freesound.org/previews/383/383049_6470876-lq.mp3' } 
        );
        await sound.setIsLoopingAsync(true);
        if (!unmounted) {
          soundRef.current = sound;
        } else {
          sound.unloadAsync();
        }
      } catch (err) {
        console.warn('Erro ao carregar som de alerta:', err);
      }
    }
    loadSound();

    return () => {
      unmounted = true;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const atualizarStatus = useCallback(async () => {
    try {
      const data: Esp32Status = await fetchStatus();

      const nivel = calcularNivelSinal(data.rssi);
      const panico = data.panico_ativo || nivel === 'panico';

      // Vibrar e tocar som no pânico (apenas na primeira transição)
      if (panico && !jaAlertouRef.current) {
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
        if (soundRef.current) {
          soundRef.current.playAsync().catch(() => {});
        }
        jaAlertouRef.current = true;
      }
      
      // Se parou o pânico, desliga o som
      if (!panico && jaAlertouRef.current) {
        if (soundRef.current) {
          soundRef.current.stopAsync().catch(() => {});
        }
        jaAlertouRef.current = false;
      }

      setState({
        ssidSalvo: data.modo_casa ? 'Wi-Fi Casa' : 'ESCOLTA_MODO_RUA',
        configurado: data.configurado,
        modoEstacao: data.modo_casa,
        somHabilitado: data.som_on,
        rssiAtual: data.rssi,
        modoPanico: panico,
        nivelSinal: nivel,
        conectado: true,
        ultimaAtualizacao: new Date(),
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        conectado: false,
        nivelSinal: 'desconectado',
      }));
    }
  }, []);

  useEffect(() => {
    // Primeira chamada imediata
    atualizarStatus();

    // Polling a cada 2s
    intervalRef.current = setInterval(atualizarStatus, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [atualizarStatus]);

  return { ...state, atualizarStatus };
}
