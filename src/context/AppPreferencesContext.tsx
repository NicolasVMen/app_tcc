import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  setPreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as Partial<AppPreferences>;
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => { mounted = false; };
  }, []);

  const setPreference = useCallback(async <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ) => {
    setPreferences(current => {
      const next = { ...current, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetPreferences = useCallback(async () => {
    setPreferences(DEFAULT_PREFERENCES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
  }, []);

  const resolvedTheme: 'dark' | 'light' = preferences.themeMode === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : preferences.themeMode;

  const value = useMemo<PreferencesContextValue>(() => ({
    preferences,
    colors: resolvedTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS,
    resolvedTheme,
    hydrated,
    setPreference,
    resetPreferences,
  }), [preferences, resolvedTheme, hydrated, setPreference, resetPreferences]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useAppPreferences deve ser usado dentro de AppPreferencesProvider');
  return value;
}
