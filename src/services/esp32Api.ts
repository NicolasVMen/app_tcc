// ============================================================
// ESP32 API Service — Comunicação com a placa via JSON endpoints
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMEOUT_MS = 3000;
const IP_STORAGE_KEY = '@esp32_ip_address';

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

/** Obtém o IP salvo do ESP32 (Padrão de fábrica: 192.168.4.1) */
export async function getEsp32Ip(): Promise<string> {
  try {
    const ip = await AsyncStorage.getItem(IP_STORAGE_KEY);
    return ip ? ip : '192.168.4.1';
  } catch (e) {
    return '192.168.4.1';
  }
}

/** Salva um novo IP para o ESP32 */
export async function saveEsp32Ip(ip: string): Promise<void> {
  await AsyncStorage.setItem(IP_STORAGE_KEY, ip);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** GET /api/status — Busca o status atual da ESP32 */
export async function fetchStatus(): Promise<Esp32Status> {
  const ip = await getEsp32Ip();
  const response = await fetchWithTimeout(`http://${ip}/api/status`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /api/toggleSom — Liga/desliga o buzzer */
export async function toggleSom(): Promise<{ ok: boolean; som_on: boolean }> {
  const ip = await getEsp32Ip();
  const response = await fetchWithTimeout(`http://${ip}/api/toggleSom`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /api/modoRua — Ativa modo rua (reinicia a ESP32) */
export async function ativarModoRua(): Promise<{ ok: boolean; msg: string }> {
  const ip = await getEsp32Ip();
  const response = await fetchWithTimeout(`http://${ip}/api/modoRua`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /api/zerar — Limpa a memória da placa (reinicia a ESP32) */
export async function zerarTudo(): Promise<{ ok: boolean; msg: string }> {
  const ip = await getEsp32Ip();
  const response = await fetchWithTimeout(`http://${ip}/api/zerar`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /api/reset — Reseta o alarme de pânico */
export async function resetarAlarme(): Promise<{ ok: boolean; panico_ativo: boolean }> {
  const ip = await getEsp32Ip();
  const response = await fetchWithTimeout(`http://${ip}/api/reset`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /salvar — Envia credenciais Wi-Fi para o ESP32 */
export async function configurarModoCasa(ssid: string, pass: string): Promise<boolean> {
  const ip = await getEsp32Ip();
  const bodyParams = `ssid=${encodeURIComponent(ssid)}&pass=${encodeURIComponent(pass)}`;

  const response = await fetchWithTimeout(`http://${ip}/salvar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams,
  });
  
  return response.ok;
}
