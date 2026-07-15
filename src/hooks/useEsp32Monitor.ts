// ============================================================
// useEsp32Monitor — Hook de monitoramento contínuo via BLE
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { connectBle, disconnectBle, isBleConnected, setBleCallbacks } from '../services/bleApi';
import { Esp32Status, EstadoEsp32 } from '../services/esp32Api';

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
      if (rssi > -65) return 'seguro';
      if (rssi > -80) return 'aviso';
      return 'panico';
  }
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
    alertas: [
      { id: Date.now().toString() + '-init', type: 'info', title: 'Monitor Iniciado', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: 'O sistema BLE foi iniciado.' }
    ],
    isScanning: false,
    scanError: null,
  });

  const jaAlertouRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  const previousNivelRef = useRef<NivelSinal>('desconectado');
  const previousPanicoRef = useRef<boolean>(false);

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
    };
  }, []);

  const conectar = async () => {
    if (isBleConnected()) return;
    setState(prev => ({ ...prev, isScanning: true, scanError: null }));
    try {
      await connectBle();
      setState(prev => ({ ...prev, isScanning: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isScanning: false, scanError: err.message }));
    }
  };

  useEffect(() => {
    const onStatusUpdate = (data: Esp32Status) => {
      const panico = data.panico_ativo;
      const nivel = nivelDoEstado(data.estado, data.rssi);

      if (panico && !jaAlertouRef.current) {
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
        if (soundRef.current) soundRef.current.playAsync().catch(() => {});
        jaAlertouRef.current = true;
      }
      
      if (!panico && jaAlertouRef.current) {
        if (soundRef.current) soundRef.current.stopAsync().catch(() => {});
        jaAlertouRef.current = false;
      }

      const newAlerts: AlertItem[] = [];
      const hrAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (panico && !previousPanicoRef.current) {
        newAlerts.push({ id: Date.now().toString() + '-pan', type: 'panico', title: 'Alarme de Pânico', time: hrAtual, desc: `Sinal extremamente baixo. RSSI: ${data.rssi} dBm` });
      } else if (!panico && nivel === 'aviso' && previousNivelRef.current === 'seguro') {
        newAlerts.push({ id: Date.now().toString() + '-av', type: 'aviso', title: 'Sinal Fraco (Atenção)', time: hrAtual, desc: `O dispositivo está se afastando. RSSI: ${data.rssi} dBm` });
      } else if (nivel === 'seguro' && (previousNivelRef.current === 'aviso' || previousPanicoRef.current)) {
        newAlerts.push({ id: Date.now().toString() + '-seg', type: 'info', title: 'Zona Segura Restabelecida', time: hrAtual, desc: `O sinal voltou a ficar forte. RSSI: ${data.rssi} dBm` });
      }

      previousPanicoRef.current = panico;
      previousNivelRef.current = nivel;

      setState(prev => ({
        ...prev,
        somHabilitado: data.som_on,
        rssiAtual: data.rssi,
        distanciaEstimada: typeof data.distancia_m === 'number' ? data.distancia_m : null,
        modoPanico: panico,
        nivelSinal: nivel,
        conectado: true,
        ultimaAtualizacao: new Date(),
        alertas: newAlerts.length > 0 ? [...newAlerts, ...prev.alertas] : prev.alertas
      }));
    };

    const onConnectionChange = (isConnected: boolean) => {
      if (!isConnected) {
        setState(prev => {
          let disconnectedAlerts: AlertItem[] = [];
          if (previousNivelRef.current !== 'desconectado') {
            disconnectedAlerts.push({
              id: Date.now().toString() + '-desc', type: 'panico', title: 'Conexão Perdida', 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
              desc: 'O dispositivo BLE foi desconectado!'
            });
            previousNivelRef.current = 'desconectado';
          }
          return {
            ...prev, conectado: false, nivelSinal: 'desconectado',
            alertas: disconnectedAlerts.length > 0 ? [...disconnectedAlerts, ...prev.alertas] : prev.alertas
          };
        });
        
        // Pára o som de pânico se desconectou (ou continua, dependendo da regra de negócios)
        // Por segurança, vamos deixar tocando caso seja uma desconexão não esperada
      }
    };

    setBleCallbacks(onStatusUpdate, onConnectionChange);
  }, []);

  return { ...state, conectar };
}
