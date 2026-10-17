import { PermissionsAndroid, Platform } from 'react-native';

let permissionAttempt: Promise<void> | null = null;
let requestedThisSession = false;

function requiredPermissions() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 23) return [];
  if (Number(Platform.Version) >= 31) return [
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ];
  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

/** Consulta sem abrir diálogos: também protege chamadas à build nativa antiga. */
export async function hasBlePermissions(): Promise<boolean> {
  const granted = await Promise.all(requiredPermissions().map(permission => PermissionsAndroid.check(permission)));
  return granted.every(Boolean);
}

/** Não repete a solicitação a cada reconexão automática após uma recusa. */
export async function ensureBlePermissions(): Promise<void> {
  if (permissionAttempt) return permissionAttempt;
  const attempt = (async () => {
    if (await hasBlePermissions()) return;
    if (!requestedThisSession) {
      requestedThisSession = true;
      await PermissionsAndroid.requestMultiple(requiredPermissions());
    }
    // Reconsulta o Android: não presume autorização apenas pelo retorno do diálogo.
    if (!await hasBlePermissions()) {
      throw new Error(Number(Platform.Version) >= 31
        ? 'Permissão de Bluetooth não autorizada. Permita Dispositivos próximos nas configurações do aplicativo para conectar à caixinha.'
        : 'Permissão de localização não autorizada. Neste Android ela é necessária para procurar a caixinha por Bluetooth. Verifique as permissões do aplicativo.');
    }
  })().finally(() => { if (permissionAttempt === attempt) permissionAttempt = null; });
  permissionAttempt = attempt;
  return attempt;
}
