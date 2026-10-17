import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage, { initializeAccountStorage, ensureProfileForAccount } from '../services/accountStorage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { AppColors, DARK_COLORS, LIGHT_COLORS, ThemeMode } from '../theme';

const STORAGE_KEY = '@escolta_preferences_v2';

export interface AppPreferences {
  themeMode: ThemeMode;
  autoConnect: boolean;
  notificationsEnabled: boolean;
  vibrationEnabled: boolean;
  informationalSounds: boolean;
  shareLocation: boolean;
  attentionAlertsToContacts: boolean;
  reduceMotion: boolean;
  keepScreenAwake: boolean;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  themeMode: 'dark',
  autoConnect: true,
  notificationsEnabled: true,
  vibrationEnabled: true,
  informationalSounds: true,
  shareLocation: false,
  attentionAlertsToContacts: false,
  reduceMotion: false,
  keepScreenAwake: false,
};

interface PreferencesContextValue {
  preferences: AppPreferences;
  colors: AppColors;
  resolvedTheme: 'dark' | 'light';
  hydrated: boolean;
  accountUid: string | null;
  setPreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [accountUid, setAccountUid] = useState<string | null>(null);
  const currentPreferences = useRef(DEFAULT_PREFERENCES);

  useEffect(() => {
    let mounted = true;
    let first = true;
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const current = ++generation;
      const recoverExisting = first && Boolean(user);
      first = false;
      setHydrated(false);
      setAccountUid(null);
      setPreferences(DEFAULT_PREFERENCES);
      currentPreferences.current = DEFAULT_PREFERENCES;
      try {
        await initializeAccountStorage(user?.uid ?? null, recoverExisting);
        if (!mounted || current !== generation) return;
        if (user?.displayName) await ensureProfileForAccount(user.uid, user.displayName);
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted || current !== generation) return;
        const parsed = raw ? JSON.parse(raw) : {};
        const next = { ...DEFAULT_PREFERENCES };
        for (const key of Object.keys(DEFAULT_PREFERENCES) as Array<keyof AppPreferences>) {
          if (key === 'themeMode') {
            if (['dark', 'light', 'system'].includes(parsed?.themeMode)) next.themeMode = parsed.themeMode;
          } else if (typeof parsed?.[key] === 'boolean') next[key] = parsed[key];
        }
        setPreferences(next);
        currentPreferences.current = next;
      } catch {} finally {
        if (mounted && current === generation) {
          setAccountUid(user?.uid ?? null);
          setHydrated(true);
        }
      }
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const setPreference = useCallback(async <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ) => {
    if (!hydrated || accountUid !== (auth.currentUser?.uid ?? null)) return;
    const next = { ...currentPreferences.current, [key]: value };
    currentPreferences.current = next;
    setPreferences(next);
    // Persistência fora do updater React: a conta é capturada já neste clique.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, [hydrated, accountUid]);

  const resetPreferences = useCallback(async () => {
    if (!hydrated || accountUid !== (auth.currentUser?.uid ?? null)) return;
    currentPreferences.current = DEFAULT_PREFERENCES;
    setPreferences(DEFAULT_PREFERENCES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
  }, [hydrated, accountUid]);

  const resolvedTheme: 'dark' | 'light' = preferences.themeMode === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : preferences.themeMode;

  const value = useMemo<PreferencesContextValue>(() => ({
    preferences,
    colors: resolvedTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS,
    resolvedTheme,
    hydrated,
    accountUid,
    setPreference,
    resetPreferences,
  }), [preferences, resolvedTheme, hydrated, accountUid, setPreference, resetPreferences]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useAppPreferences deve ser usado dentro de AppPreferencesProvider');
  return value;
}
