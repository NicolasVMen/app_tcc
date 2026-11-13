/** Falhas de enlace que podem desaparecer após limpar a sessão GATT. */
export function isTransientResumeDisconnect(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'errorCode' in error
    ? (error as { errorCode?: unknown }).errorCode : null;
  if (code === 200 || code === 201) return true; // react-native-ble-plx: conexão falhou / desconectou
  const message = errorMessage(error);
  return /disconnect|desconect|conexão (?:foi )?interrompida|conexão encerrada antes da confirmação/i.test(message);
}

function errorMessage(error: unknown): string {
  return typeof error === 'object' && error !== null && 'message' in error
    && typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message : '';
}

/** Nunca expõe ao responsável o endereço MAC ou a exceção nativa. */
export function resumeErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  if (/Bluetooth não está ativado|Bluetooth.*(?:desligado|powered off)/i.test(message)) {
    return 'Ative o Bluetooth do celular e tente retomar a proteção novamente.';
  }
  if (/não autorizad|permissão|permission/i.test(message)) {
    return 'Autorize o Bluetooth para o Escolta nas configurações do celular e tente novamente.';
  }
  if (/não encontrado/i.test(message)) {
    return 'A caixinha não foi encontrada. Aproxime-a do celular, confira se está ligada e tente novamente.';
  }
  return 'A caixinha não confirmou a retomada. Aproxime-a do celular, confira o Bluetooth e tente novamente.';
}
