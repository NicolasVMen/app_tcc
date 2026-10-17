import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { subscribeAccountStorage } from './accountStorage';
import type { AppPreferences } from '../context/AppPreferencesContext';
import { runEsp32Monitor } from '../hooks/useEsp32Monitor';
import { MonitorScope } from '../utils/monitorScope';

type Snapshot = ReturnType<typeof runEsp32Monitor>;
type Session = {
  owner: string;
  preferences: AppPreferences;
  scope: MonitorScope<Snapshot>;
  unsubscribeStorage: () => void;
};
let session: Session | null = null;
let observingAuth = false;
let shutdownBarrier: Promise<unknown> = Promise.resolve();

function disposeSession() {
  const previous = session;
  if (!previous) return;
  session = null;
  previous.unsubscribeStorage();
  // Account loss disposes resources, not disappearance of the screen. Explicit
  // logout already pauses/stops through prepararLogoff. Do not silently cancel
  // a latched emergency on an unexpected auth loss. Drain the old GATT before
  // another account can install callbacks/connect to the same physical device.
  shutdownBarrier = Promise.allSettled([
    shutdownBarrier,
    previous.scope.getSnapshot().liberarRecursosDoMonitor(),
  ]);
  previous.scope.dispose();
}

export function getPersistentMonitor(owner: string, preferences: AppPreferences) {
  if (!owner || auth.currentUser?.uid !== owner) throw new Error('Sessão do monitor indisponível.');
  if (!observingAuth) {
    observingAuth = true;
    onAuthStateChanged(auth, user => {
      if (session && session.owner !== user?.uid) disposeSession();
    });
  }
  if (session?.owner !== owner) {
    disposeSession();
    const current = { owner, preferences, unsubscribeStorage: () => {} } as Session;
    current.scope = new MonitorScope(hooks => runEsp32Monitor(hooks, current.preferences));
    session = current;
    current.unsubscribeStorage = subscribeAccountStorage((key, raw) => {
      if (key !== '@escolta_preferences_v2' || session !== current || auth.currentUser?.uid !== owner || !raw) return;
      try {
        const saved = JSON.parse(raw);
        const next = { ...current.preferences };
        for (const key of Object.keys(next) as Array<keyof AppPreferences>) {
          if (key === 'themeMode') {
            if (['dark', 'light', 'system'].includes(saved?.[key])) next.themeMode = saved[key];
          } else if (typeof saved?.[key] === 'boolean') next[key] = saved[key];
        }
        current.preferences = next;
        current.scope.refresh();
      } catch { /* Ignore malformed settings, never invent a new monitoring intent. */ }
    });
    void shutdownBarrier.then(() => {
      if (session === current && auth.currentUser?.uid === owner) current.scope.start();
    });
  }
  return session!;
}

export function updatePersistentMonitorPreferences(current: Session, preferences: AppPreferences) {
  if (session !== current || auth.currentUser?.uid !== current.owner || current.preferences === preferences) return;
  current.preferences = preferences;
  current.scope.refresh();
}
