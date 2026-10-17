import type { Esp32Status } from '../services/bleApi';

// Este firmware mantém o filtro e recusa reset fora da faixa segura.
// Versões anteriores forçavam estado seguro; não servem como comprovação.
export const SAFETY_CONFIRMATION_FIRMWARE = 'xiao-p5-teste';
export const SAFE_SIGNAL_MIN_RSSI = -82;

// Explicit p5 variants only. The radio experiment preserves the same firmware
// reset gate; accepting its exact tag does not relax RSSI/freshness/ACK checks.
export function isSafetyConfirmationFirmware(firmware: unknown): boolean {
  return firmware === SAFETY_CONFIRMATION_FIRMWARE || firmware === 'xiao-p5-r4'
    || firmware === 'xiao-p5-r4-d1' || firmware === 'xiao-p5-r4-d1-k1'
    || firmware === 'xiao-p5-r4-d1-k2' || firmware === 'xiao-p5-r4-d1-k2-w1';
}

export function hasCurrentSafeSignal(status: Esp32Status | null | undefined): status is Esp32Status {
  // K1/K2 exigem o mesmo sinal forte para confirmar; antigas preservam -82.
  const minimumRssi = status?.fw === 'xiao-p5-r4-d1-k1' || status?.fw === 'xiao-p5-r4-d1-k2'
    || status?.fw === 'xiao-p5-r4-d1-k2-w1'
    ? -77 : SAFE_SIGNAL_MIN_RSSI;
  return Boolean(status && isSafetyConfirmationFirmware(status.fw)
    && status.monitoramento_ativo === true && status.rssiFresh === true
    && Number.isFinite(status.rssi) && status.rssi > minimumRssi && status.rssi < 0
    && typeof status.rssi_raw === 'number' && Number.isFinite(status.rssi_raw)
    && status.rssi_raw > minimumRssi && status.rssi_raw < 0
    && typeof status.distancia_m === 'number' && Number.isFinite(status.distancia_m) && status.distancia_m > 0);
}

export function isSafeResetAcknowledgement(status: Esp32Status | null | undefined): status is Esp32Status {
  return hasCurrentSafeSignal(status) && status.estado === 'seguro' && status.panico_ativo === false;
}
