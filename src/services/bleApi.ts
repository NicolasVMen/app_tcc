// ============================================================
// BLE API Service — Comunicação com a placa via Bluetooth
// ============================================================

import { BleManager, Device, BleError } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';

export type EstadoEsp32 = 'seguro' | 'atencao' | 'perigo' | 'panico';

export interface Esp32Status {
  rssi: number;             // RSSI já filtrado (EMA) pela placa
  modo_casa: boolean;
  som_on: boolean;
  panico_ativo: boolean;
  configurado: boolean;
  // ---- Campos novos (firmware com filtragem) ----
  rssi_raw?: number;        // RSSI cru, sem filtro (debug/gráfico)
  rssi_filtrado?: number;   // RSSI filtrado com casa decimal
  distancia_m?: number;     // distância estimada (metros)
  estado?: EstadoEsp32;     // decisão de estado feita na própria placa
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

// Singleton do BleManager
const bleManager = new BleManager();
let connectedDevice: Device | null = null;
let rssiInterval: NodeJS.Timeout | null = null;

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
}

/** Inicia escaneamento e conecta ao ESCOLTA_BLE */
export async function connectBle(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    if (
      granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED ||
      granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED
    ) {
      throw new Error('Permissões de Bluetooth negadas.');
    }
  } else if (Platform.OS === 'android' && Platform.Version >= 23) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Permissão de Localização negada.');
    }
  }

  const state = await bleManager.state();
  if (state !== 'PoweredOn') {
    throw new Error('Bluetooth não está ativado no celular.');
  }

  return new Promise((resolve, reject) => {
    // Escaneia por dispositivos
    bleManager.startDeviceScan(null, null, async (error: BleError | null, device: Device | null) => {
      if (error) {
        bleManager.stopDeviceScan();
        reject(error);
        return;
      }

      if (device && device.name === 'ESCOLTA_BLE') {
        bleManager.stopDeviceScan();

        try {
          // Conecta e descobre serviços
          const connected = await device.connect();
          // Aumenta o MTU para não cortar o JSON (default é 23 bytes)
          if (Platform.OS === 'android') {
            try {
              await connected.requestMTU(512);
            } catch (e) {
              console.warn('Erro ao solicitar MTU maior', e);
            }
          }
          await connected.discoverAllServicesAndCharacteristics();
          connectedDevice = connected;

          if (onConnectionChange) onConnectionChange(true);

          // Escuta o Notify do status
          connected.monitorCharacteristicForService(
            SERVICE_UUID,
            CHAR_STATUS_UUID,
            (monitorError, characteristic) => {
              if (monitorError) {
                console.warn('Erro no monitoramento:', monitorError);
                return;
              }
              if (characteristic?.value) {
                const jsonStr = base64ToString(characteristic.value);
                try {
                  const status = JSON.parse(jsonStr) as Esp32Status;
                  if (onStatusUpdate) onStatusUpdate(status);
                } catch (e) {
                  console.warn('Erro ao parsear JSON BLE:', e);
                }
              }
            }
          );

          // Inicia loop que lê o RSSI do celular e manda pra placa
          if (rssiInterval) clearInterval(rssiInterval);
          rssiInterval = setInterval(async () => {
            if (connectedDevice) {
              try {
                const dev = await connectedDevice.readRSSI();
                if (dev.rssi !== null) {
                  const b64 = stringToBase64(dev.rssi.toString());
                  await connectedDevice.writeCharacteristicWithResponseForService(
                    SERVICE_UUID,
                    CHAR_RSSI_UUID,
                    b64
                  );
                }
              } catch (e) {
                // Ignore erros de leitura temporária
              }
            }
          }, 500);

          // Adiciona listener de desconexão
          connected.onDisconnected((error, disconnectedDevice) => {
            connectedDevice = null;
            if (rssiInterval) clearInterval(rssiInterval);
            if (onConnectionChange) onConnectionChange(false);
          });

          resolve();
        } catch (connError) {
          reject(connError);
        }
      }
    });

    // Timeout se não encontrar
    setTimeout(() => {
      bleManager.stopDeviceScan();
      reject(new Error('Dispositivo não encontrado após 10 segundos'));
    }, 10000);
  });
}

/** Desconecta do dispositivo atual */
export async function disconnectBle(): Promise<void> {
  if (connectedDevice) {
    await connectedDevice.cancelConnection();
    connectedDevice = null;
    if (onConnectionChange) onConnectionChange(false);
  }
}

/** Liga/desliga o som (buzzer) */
export async function toggleSomBle(ligar: boolean): Promise<void> {
  if (!connectedDevice) throw new Error('Não conectado');
  const valor = ligar ? '1' : '0';
  await connectedDevice.writeCharacteristicWithResponseForService(
    SERVICE_UUID,
    CHAR_SOM_UUID,
    stringToBase64(valor)
  );
}

/** Reseta o alarme (pânico) */
export async function resetarAlarmeBle(): Promise<void> {
  if (!connectedDevice) throw new Error('Não conectado');
  await connectedDevice.writeCharacteristicWithResponseForService(
    SERVICE_UUID,
    CHAR_RESET_UUID,
    stringToBase64('reset') // Qualquer valor serve
  );
}

/** Verifica se está conectado */
export function isBleConnected(): boolean {
  return connectedDevice !== null;
}
