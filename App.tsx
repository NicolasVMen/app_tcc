import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';

import { auth } from './src/services/firebaseConfig';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ManualScreen from './src/screens/ManualScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { useEsp32Monitor } from './src/hooks/useEsp32Monitor';
import { AppPreferencesProvider, useAppPreferences } from './src/context/AppPreferencesContext';
import { AppColors } from './src/theme';
import {
  addNotificationResponseListener,
  consumeInitialCentralDestination,
} from './src/services/notificationService';

type Tab = 'CENTRAL' | 'PROTOCOL' | 'RECORDS' | 'SYSTEM';

const TABS: Array<{ key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { key: 'CENTRAL', icon: 'shield', label: 'CENTRAL' },
  { key: 'PROTOCOL', icon: 'book', label: 'PROTOCOLO' },
  { key: 'RECORDS', icon: 'time', label: 'REGISTROS' },
  { key: 'SYSTEM', icon: 'settings', label: 'SISTEMA' },
];

const SWIPE_THRESHOLD = 52;

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme, hydrated } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const topPadding = Platform.OS === 'android' ? insets.top : 0;
  const bottomPadding = Platform.OS === 'android' ? Math.max(10, insets.bottom + 5) : Math.max(12, insets.bottom);

  useEffect(() => onAuthStateChanged(auth, currentUser => {
    setUser(currentUser);
    setLoadingAuth(false);
  }), []);

  if (loadingAuth || !hydrated) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primaryBlue} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.safeArea, { paddingTop: topPadding }]}>
        <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <AuthScreen onLoginSuccess={() => {}} />
      </View>
    );
  }

  return <AuthenticatedShell user={user} topPadding={topPadding} bottomPadding={bottomPadding} />;
}

function AuthenticatedShell({ user, topPadding, bottomPadding }: {
  user: User;
  topPadding: number;
  bottomPadding: number;
}) {
  const { colors, resolvedTheme, preferences } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<Tab>('CENTRAL');
  const [userInitials, setUserInitials] = useState('?');
  const activeTabRef = useRef<Tab>('CENTRAL');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const monitor = useEsp32Monitor();

  const changeTab = useCallback((newTab: Tab) => {
    if (newTab === activeTabRef.current) return;
    if (preferences.reduceMotion) {
      activeTabRef.current = newTab;
      setActiveTab(newTab);
      return;
    }
    Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      activeTabRef.current = newTab;
      setActiveTab(newTab);
      Animated.timing(fadeAnim, { toValue: 1, duration: 170, useNativeDriver: true }).start();
    });
  }, [fadeAnim, preferences.reduceMotion]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => (
      Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 18
    ),
    onPanResponderRelease: (_, gesture) => {
      const index = TABS.findIndex(tab => tab.key === activeTabRef.current);
      if (gesture.dx < -SWIPE_THRESHOLD && index < TABS.length - 1) changeTab(TABS[index + 1].key);
      if (gesture.dx > SWIPE_THRESHOLD && index > 0) changeTab(TABS[index - 1].key);
    },
  })).current;

  useEffect(() => {
    AsyncStorage.getItem('@escolta_user_profile').then(raw => {
      if (!raw) return;
      try {
        const profile = JSON.parse(raw);
        setUserInitials(getInitials(profile.nomeResponsavel || ''));
      } catch {}
    }).catch(() => {});
  }, [activeTab, user.uid]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTabRef.current === 'CENTRAL') return false;
      changeTab('CENTRAL');
      return true;
    });
    return () => subscription.remove();
  }, [changeTab]);

  useEffect(() => {
    if (consumeInitialCentralDestination()) changeTab('CENTRAL');
    const subscription = addNotificationResponseListener(() => changeTab('CENTRAL'));
    return () => subscription.remove();
  }, [changeTab]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'CENTRAL': return <DashboardScreen monitor={monitor} />;
      case 'PROTOCOL': return <ManualScreen />;
      case 'RECORDS': return <AlertsScreen alertas={monitor.alertas} limparAlertas={monitor.limparAlertas} />;
      case 'SYSTEM': return (
        <SettingsScreen
          onProfileUpdated={profile => setUserInitials(getInitials(profile.nomeResponsavel || ''))}
          onBeforeLogout={monitor.prepararLogoff}
          onForceLogout={monitor.encerrarMonitoramento}
          deviceStandby={monitor.emEspera}
          deviceConnected={monitor.conectado}
          changingStandby={monitor.alterandoEspera}
          onPauseMonitoring={monitor.colocarEmEspera}
          onResumeMonitoring={monitor.retomarProtecao}
        />
      );
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.brand} activeOpacity={0.75} onPress={() => changeTab('CENTRAL')}>
          <Image source={require('./assets/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>ESCOLTA UNITAU</Text>
            <Text style={styles.brandSubtitle}>PROTÓTIPO ACADÊMICO</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.avatar} activeOpacity={0.75} onPress={() => changeTab('SYSTEM')}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]} {...panResponder.panHandlers}>
        {renderScreen()}
      </Animated.View>

      <View style={[styles.tabBar, { paddingBottom: bottomPadding }]}>
        {TABS.map(tab => {
          const selected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => changeTab(tab.key)}
            >
              <View style={[styles.tabIconWrap, selected && styles.tabIconWrapSelected]}>
                <Ionicons
                  name={selected ? tab.icon : `${tab.icon}-outline` as keyof typeof Ionicons.glyphMap}
                  size={21}
                  color={selected ? colors.primaryBlue : colors.textMuted}
                />
              </View>
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppPreferencesProvider>
        <MainApp />
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingTop: 10, paddingBottom: 9,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    logo: { width: 40, height: 40, resizeMode: 'contain', borderRadius: 12 },
    brandName: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', letterSpacing: 0.7 },
    brandSubtitle: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginTop: 2 },
    avatar: {
      width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.cardBorder,
    },
    avatarText: { color: colors.primaryBlue, fontSize: 14, fontWeight: '800' },
    content: { flex: 1 },
    tabBar: {
      flexDirection: 'row', alignItems: 'center', paddingTop: 7,
      backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.cardBorder,
    },
    tabItem: { flex: 1, alignItems: 'center', gap: 2 },
    tabIconWrap: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14 },
    tabIconWrapSelected: { backgroundColor: colors.primarySoft },
    tabLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.45 },
    tabLabelSelected: { color: colors.primaryBlue },
  });
}
