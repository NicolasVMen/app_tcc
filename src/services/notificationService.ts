import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const MONITORING_CHANNEL = 'escolta_monitoramento';
const EMERGENCY_CHANNEL = 'escolta_emergencias_v3';
const DIAGNOSTIC_CHANNEL = 'escolta_diagnosticos';
const BATTERY_CHANNEL = 'escolta_bateria_v1';
let emergencyNotificationId: string | null = null;
let channelsPrepared = false;
let permissionRequestedThisSession = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function prepareNotifications(requestPermission = true) {
  if (Platform.OS === 'android' && !channelsPrepared) {
    await Notifications.setNotificationChannelAsync(MONITORING_CHANNEL, {
      name: 'Monitoramento da Sentinela',
      description: 'Mostra quando a Sentinela está monitorando o dispositivo Escolta.',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: null,
      sound: null,
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
    await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL, {
      name: 'Emergências do Escolta',
      description: 'Alertas críticos de perda de vínculo ou pânico do dispositivo.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: null,
      sound: null,
      enableVibrate: false,
      enableLights: true,
      lightColor: '#EF4444',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(DIAGNOSTIC_CHANNEL, {
      name: 'Testes do Escolta',
      description: 'Notificações controladas da verificação de prontidão.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: null,
      sound: null,
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(BATTERY_CHANNEL, {
      name: 'Bateria do dispositivo Escolta',
      description: 'Avisos para recarregar a bateria do dispositivo vestível.',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 220],
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    channelsPrepared = true;
  }

  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    !requestPermission ||
    permissionRequestedThisSession ||
    current.canAskAgain === false
  ) return current.granted;

  permissionRequestedThisSession = true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function showBatteryNotification(percent: number, critical: boolean) {
  await prepareNotifications(false);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: critical ? 'Bateria crítica — Escolta UNITAU' : 'Bateria baixa — Escolta UNITAU',
      body: critical
        ? `Restam cerca de ${percent}%. Recarregue o dispositivo agora para evitar a interrupção do monitoramento.`
        : `Restam cerca de ${percent}%. Recarregue o dispositivo Escolta assim que possível.`,
      sound: 'default',
      priority: critical
        ? Notifications.AndroidNotificationPriority.HIGH
        : Notifications.AndroidNotificationPriority.DEFAULT,
      color: critical ? '#EF4444' : '#F59E0B',
      data: { destino: 'CENTRAL', tipo: critical ? 'bateria_critica' : 'bateria_baixa' },
    },
    trigger: Platform.OS === 'android' ? { channelId: BATTERY_CHANNEL } : null,
  });
}

export async function showEmergencyNotification(childName: string, reason: string) {
  await dismissEmergencyNotification();
  emergencyNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Emergência — Escolta UNITAU',
      body: `${reason} Verifique ${childName} imediatamente.`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#EF4444',
      sticky: true,
      autoDismiss: false,
      data: { destino: 'CENTRAL', tipo: 'emergencia' },
    },
    trigger: Platform.OS === 'android' ? { channelId: EMERGENCY_CHANNEL } : null,
  });
  return emergencyNotificationId;
}

/** Exibe uma notificação não emergencial para validar permissão e apresentação visual. */
export async function showDiagnosticNotification() {
  const granted = await prepareNotifications(true);
  if (!granted) throw new Error('As notificações estão bloqueadas nas configurações do celular.');
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Teste da Sentinela — Escolta UNITAU',
      body: 'Notificação recebida. Este é apenas um teste controlado do protótipo.',
      sound: false,
      color: '#2563EB',
      data: { tipo: 'diagnostico' },
    },
    trigger: Platform.OS === 'android' ? { channelId: DIAGNOSTIC_CHANNEL } : null,
  });
}

export async function dismissEmergencyNotification() {
  if (!emergencyNotificationId) return;
  await Notifications.dismissNotificationAsync(emergencyNotificationId).catch(() => {});
  emergencyNotificationId = null;
  await Notifications.setBadgeCountAsync(0).catch(() => {});
}

export function addNotificationResponseListener(onOpenCentral: () => void) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    if (response.notification.request.content.data?.destino === 'CENTRAL') onOpenCentral();
  });
}

export function consumeInitialCentralDestination() {
  const response = Notifications.getLastNotificationResponse();
  if (response?.notification.request.content.data?.destino !== 'CENTRAL') return false;
  Notifications.clearLastNotificationResponse();
  return true;
}
