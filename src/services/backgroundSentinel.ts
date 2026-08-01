import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type EscoltaSentinelaNativeModule = {
  startAsync: (title: string, body: string) => Promise<void>;
  updateAsync: (title: string, body: string) => Promise<void>;
  stopAsync: () => Promise<void>;
  armEmergencyAsync: (
    childName: string,
    delayMs: number,
    alertsEnabled: boolean,
    vibrationEnabled: boolean
  ) => Promise<void>;
  cancelEmergencyAsync: () => Promise<void>;
  isRunningAsync: () => Promise<boolean>;
};

const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<EscoltaSentinelaNativeModule>('EscoltaSentinela')
  : null;

export const backgroundSentinelAvailable = nativeModule !== null;

export async function startBackgroundSentinel(
  title = 'Sentinela ativa',
  body = 'Monitorando o vínculo com o dispositivo Escolta'
) {
  if (!nativeModule) return false;
  await nativeModule.startAsync(title, body);
  return true;
}

export async function updateBackgroundSentinel(title: string, body: string) {
  if (!nativeModule) return false;
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
  vibrationEnabled: boolean
) {
  if (!nativeModule) return false;
  await nativeModule.armEmergencyAsync(childName, delayMs, alertsEnabled, vibrationEnabled);
  return true;
}

export async function cancelBackgroundEmergency() {
  if (!nativeModule) return false;
  await nativeModule.cancelEmergencyAsync();
  return true;
}

export async function isBackgroundSentinelRunning() {
  if (!nativeModule) return false;
  return nativeModule.isRunningAsync();
}
