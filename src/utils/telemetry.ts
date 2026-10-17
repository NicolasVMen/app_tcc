/** Protocolo da XIAO: JSON legível não implica uma mensagem confiável. */
export function validTelemetry(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.rssi === 'number' && Number.isFinite(v.rssi)
    && v.rssi >= -127 && v.rssi <= 0
    && ['seguro', 'atencao', 'perigo', 'panico'].includes(v.estado as string)
    && typeof v.panico_ativo === 'boolean'
    && (v.monitoramento_ativo === undefined || typeof v.monitoramento_ativo === 'boolean')
    && (v.som_on === undefined || typeof v.som_on === 'boolean')
    && (v.fw === undefined || typeof v.fw === 'string');
}
