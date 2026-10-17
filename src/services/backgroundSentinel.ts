import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { withTimeout } from '../utils/asyncTimeout';
import { hasBlePermissions } from './blePermissions';
import { VALIDATED_MONITOR_ENABLED } from './nativeIdentity';

type EscoltaSentinelaNativeModule = {
  protectionHeartbeatAvailable?: boolean;
  addListener?: (event: 'onProtectionHeartbeat', listener: (event: { emittedAt: number }) => void) => { remove(): void };
  startAsync: (title: string, body: string) => Promise<void>;
  updateAsync: (title: string, body: string) => Promise<void>;
  stopAsync: () => Promise<void>;
  armEmergencyAsync: (
    childName: string,
    delayMs: number,
    alertsEnabled: boolean,
    vibrationEnabled: boolean,
    reason: string
  ) => Promise<void>;
  cancelEmergencyAsync: () => Promise<void>;
  connectionRestoredAsync: () => Promise<void>;
  isRunningAsync: () => Promise<boolean>;
  isEmergencyActiveAsync: () => Promise<boolean>;
  isAlarmPlayingAsync?: () => Promise<boolean>;
};

const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<EscoltaSentinelaNativeModule>('EscoltaSentinela')
  : null;

export const backgroundSentinelAvailable = nativeModule !== null;
let alarmGeneration = 0;

/** Somente no APK de teste novo. APK antigo/oficial mantém o temporizador anterior. */
export function subscribeBackgroundProtectionTick(callback: () => void): (() => void) | null {
  if (!VALIDATED_MONITOR_ENABLED || !nativeModule?.protectionHeartbeatAvailable || !nativeModule.addListener) return null;
  const subscription = nativeModule.addListener('onProtectionHeartbeat', event => {
    // Não executa uma rajada de operações antigas se o runtime tiver sido suspenso.
    const age = Date.now() - event.emittedAt;
    if (Number.isFinite(age) && age >= 0 && age <= 1500) callback();
  });
  return () => subscription.remove();
}

export async function startBackgroundSentinel(
  title = 'Sentinela ativa',
  body = 'Monitorando o vínculo com o dispositivo Escolta'
) {
  if (!nativeModule || !await hasBlePermissions()) return false;
  await nativeModule.startAsync(title, body);
  return true;
}

export async function updateBackgroundSentinel(title: string, body: string) {
  if (!nativeModule || !await hasBlePermissions()) return false;
  await nativeModule.updateAsync(title, body);
  return true;
}

export async function stopBackgroundSentinel() {
  if (!nativeModule) return false;
  await nativeModule.stopAsync();
  return true;
}

export async function armBackgroundEmergency(
  childName: string,
  delayMs: number,
  alertsEnabled: boolean,
  vibrationEnabled: boolean,
  reason = 'O vínculo com dados válidos não foi recuperado.'
) {
  if (!nativeModule) return false;
  if (!nativeModule.isAlarmPlayingAsync) return false; // build antiga: não presumir a correção nativa
  if (!await hasBlePermissions()) return false;
  const generation = ++alarmGeneration;
  try {
    await withTimeout(nativeModule.armEmergencyAsync(childName, delayMs, alertsEnabled, vibrationEnabled, reason), 1500, 'O Android não confirmou o comando.');
    if (generation !== alarmGeneration) return false;
    if (delayMs === 0) {
      for (let i = 0; i < 10; i++) {
        const playing = await withTimeout(nativeModule.isAlarmPlayingAsync(), 500, 'Sirene sem resposta.');
        if (generation !== alarmGeneration) return false;
        if (playing) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Evita deixar uma solicitação pendente tocando mais tarde junto do fallback.
      await cancelBackgroundEmergency();
      return false;
    }
    return true;
  } catch (error) {
    if (generation === alarmGeneration) await cancelBackgroundEmergency().catch(() => false);
    throw error;
  }
}

export async function cancelBackgroundEmergency() {
  alarmGeneration++;
  if (!nativeModule) return false;
  await withTimeout(nativeModule.cancelEmergencyAsync(), 1500, 'O Android não confirmou o cancelamento.');
  return true;
}

export async function notifyBackgroundConnectionRestored() {
  if (!nativeModule) return false;
  await nativeModule.connectionRestoredAsync();
  return true;
}

export async function isBackgroundSentinelRunning() {
  if (!nativeModule) return false;
  return nativeModule.isRunningAsync();
}

export async function isBackgroundEmergencyActive() {
  if (!nativeModule?.isAlarmPlayingAsync) return false;
  return await withTimeout(nativeModule.isEmergencyActiveAsync(), 500, 'Estado de emergência sem resposta.')
    && await withTimeout(nativeModule.isAlarmPlayingAsync(), 500, 'Estado da sirene sem resposta.');
}

/** Estado retido do alerta, separado da confirmação de que o áudio está tocando. */
export async function isBackgroundEmergencyLatched() {
  if (!nativeModule) return false;
  return withTimeout(nativeModule.isEmergencyActiveAsync(), 500, 'Estado de emergência sem resposta.');
}
