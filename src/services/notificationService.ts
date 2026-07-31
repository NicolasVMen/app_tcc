import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const MONITORING_CHANNEL = 'escolta_monitoramento';
const EMERGENCY_CHANNEL = 'escolta_emergencias';
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
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lightColor: '#EF4444',
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
