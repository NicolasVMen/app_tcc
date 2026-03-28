// ============================================================
// ESP32 API Service — Comunicação com a placa via JSON endpoints
// ============================================================

const ESP32_IP = '192.168.4.1';
const BASE_URL = `http://${ESP32_IP}`;
const TIMEOUT_MS = 3000;

export interface Esp32Status {
  rssi: number;
  modo_casa: boolean;
  som_on: boolean;
  panico_ativo: boolean;
  configurado: boolean;
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
  const response = await fetchWithTimeout(`${BASE_URL}/api/status`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /api/toggleSom — Liga/desliga o buzzer */
export async function toggleSom(): Promise<{ ok: boolean; som_on: boolean }> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/toggleSom`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /api/modoRua — Ativa modo rua (reinicia a ESP32) */
export async function ativarModoRua(): Promise<{ ok: boolean; msg: string }> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/modoRua`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /api/zerar — Limpa a memória da placa (reinicia a ESP32) */
export async function zerarTudo(): Promise<{ ok: boolean; msg: string }> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/zerar`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** POST /api/reset — Reseta o alarme de pânico */
export async function resetarAlarme(): Promise<{ ok: boolean; panico_ativo: boolean }> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/reset`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
