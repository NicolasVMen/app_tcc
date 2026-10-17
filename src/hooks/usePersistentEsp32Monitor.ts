import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getPersistentMonitor, updatePersistentMonitorPreferences } from '../services/persistentMonitor';

/** Perfil validado usa controlador por conta; a identidade do pacote é separada. */
export function usePersistentEsp32Monitor() {
  const { accountUid, preferences } = useAppPreferences();
  const [current] = useState(() => getPersistentMonitor(accountUid ?? '', preferences));
  useEffect(() => {
    updatePersistentMonitorPreferences(current, preferences);
  }, [current, preferences]);
  // Unmount removes the UI subscription only. Pause/logout remain explicit
  // monitor commands; Firebase account loss disposes the controller separately.
  return useSyncExternalStore(current.scope.subscribe, current.scope.getSnapshot, current.scope.getSnapshot);
}
