import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { loadAsync, useFonts } from 'expo-font';
import { APP_DISPLAY_NAME, APP_SCHEME, INTERNAL_TOOLS_ENABLED, VALIDATED_MONITOR_ENABLED, BATTERY_STUDY_ENABLED } from './src/services/nativeIdentity';
import { getAutonomyRecorder } from './src/services/autonomyRegistry';
import AutonomyStudyModal from './src/screens/AutonomyStudyModal';
import AsyncStorage, { subscribeAccountStorage } from './src/services/accountStorage';
import { onAuthStateChanged, User } from 'firebase/auth';

import { auth } from './src/services/firebaseConfig';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ManualScreen from './src/screens/ManualScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProximityTrialModal from './src/screens/ProximityTrialModal';
import { useEsp32Monitor } from './src/hooks/useEsp32Monitor';
import { usePersistentEsp32Monitor } from './src/hooks/usePersistentEsp32Monitor';
import { AppPreferencesProvider, useAppPreferences } from './src/context/AppPreferencesContext';
import { AppColors, colorWithAlpha } from './src/theme';
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

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function MainApp() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const [fontsRecovered, setFontsRecovered] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme, hydrated, accountUid } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const topPadding = Platform.OS === 'android' ? insets.top : 0;
  const bottomPadding = Platform.OS === 'android' ? Math.max(10, insets.bottom + 5) : Math.max(12, insets.bottom);

  useEffect(() => onAuthStateChanged(auth, currentUser => {
    setUser(currentUser);
    setLoadingAuth(false);
  }), []);

  if (fontError && !fontsRecovered) {
    return <View style={styles.loading}>
      <Text style={{ color: colors.textPrimary, padding: 20 }}>Não foi possível carregar os ícones do aplicativo. Tente novamente. Se o problema persistir, feche e abra o Escolta.</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => { void loadAsync(Ionicons.font).then(() => setFontsRecovered(true)).catch(() => {}); }}>
        <Text style={{ color: colors.primaryBlue, padding: 20 }}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>;
  }
  if ((!fontsLoaded && !fontsRecovered) || loadingAuth || !hydrated || accountUid !== (user?.uid ?? null)) {
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

  return <AuthenticatedShell key={user.uid} user={user} topPadding={topPadding} bottomPadding={bottomPadding} />;
}

function AuthenticatedShell({ user, topPadding, bottomPadding }: {
  user: User;
  topPadding: number;
  bottomPadding: number;
}) {
  const { colors, resolvedTheme, preferences } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<Tab>('CENTRAL');
  const [showProximityTrial, setShowProximityTrial] = useState(false);
  const [showAutonomyStudy, setShowAutonomyStudy] = useState(false);
  const [userInitials, setUserInitials] = useState('?');
  const activeTabRef = useRef<Tab>('CENTRAL');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const monitor = VALIDATED_MONITOR_ENABLED ? usePersistentEsp32Monitor() : useEsp32Monitor();
  // O observador pertence à conta/controlador; fechar uma tela não encerra o registro.
  useEffect(() => { if (BATTERY_STUDY_ENABLED) getAutonomyRecorder(user.uid, preferences); }, [user.uid, preferences]);
  const deviceBatteryAvailable = monitor.conectado
    && monitor.bateriaPercentual != null
    && Number.isFinite(monitor.bateriaPercentual);
  const deviceBatteryPercent = deviceBatteryAvailable
    ? Math.round(monitor.bateriaPercentual!)
    : null;
  const deviceBatteryColor = deviceBatteryPercent != null && deviceBatteryPercent <= 10
    ? colors.dangerRed
    : deviceBatteryPercent != null && deviceBatteryPercent <= 20
      ? colors.warningYellow
      : monitor.bateriaCarregando
        ? colors.primaryBlue
        : colors.safeGreen;
  const deviceBatteryIcon: keyof typeof Ionicons.glyphMap = monitor.bateriaCarregando
    ? 'battery-charging'
    : deviceBatteryPercent != null && deviceBatteryPercent <= 10
      ? 'battery-dead'
      : deviceBatteryPercent != null && deviceBatteryPercent <= 50
        ? 'battery-half'
        : 'battery-full';

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

  useEffect(() => {
    let active = true;
    const update = (raw: string | null) => {
      if (!active) return;
      try {
        const profile = raw ? JSON.parse(raw) : null;
        const name = typeof profile?.nomeResponsavel === 'string' ? profile.nomeResponsavel : user.displayName || '';
        setUserInitials(getInitials(name));
      } catch {}
    };
    AsyncStorage.getItem('@escolta_user_profile').then(update).catch(() => {});
    const unsubscribe = subscribeAccountStorage((key, raw) => { if (key === '@escolta_user_profile') update(raw); });
    return () => { active = false; unsubscribe(); };
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
    const handleUrl = (url: string | null) => { if (url === `${APP_SCHEME}://central`) changeTab('CENTRAL'); };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const linkSubscription = Linking.addEventListener('url', event => handleUrl(event.url));
    return () => { subscription.remove(); linkSubscription.remove(); };
  }, [changeTab]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'CENTRAL': return <DashboardScreen monitor={monitor} />;
      case 'PROTOCOL': return <ManualScreen />;
      case 'RECORDS': return <AlertsScreen alertas={monitor.alertas} limparAlertas={monitor.limparAlertas} />;
      case 'SYSTEM': return (
        <SettingsScreen
          onProfileUpdated={profile => setUserInitials(getInitials(profile.nomeResponsavel || user.displayName || ''))}
          onBeforeLogout={monitor.prepararLogoff}
          onForceLogout={monitor.encerrarMonitoramento}
          deviceStandby={monitor.emEspera}
          deviceConnected={monitor.conectado}
          changingStandby={monitor.alterandoEspera}
          onPauseMonitoring={monitor.colocarEmEspera}
          onResumeMonitoring={monitor.retomarProtecao}
          diagnosticsMonitor={{
            connected: monitor.conectado,
            standby: monitor.emEspera,
            reconnecting: monitor.reconectando,
            scanning: monitor.isScanning,
            soundReady: monitor.somCarregado,
            dataReady: monitor.dadosValidos,
            notificationAuthorized: monitor.notificacoesAutorizadas,
            lastUpdate: monitor.ultimaAtualizacao,
            signalLevel: monitor.nivelSinal,
            firmwareVersion: monitor.versaoFirmware,
          }}
          onTestLocalAlert={monitor.testarAlertaLocal}
          onOpenProximityTrial={() => { if (INTERNAL_TOOLS_ENABLED) setShowProximityTrial(true); }}
          onOpenAutonomyStudy={() => { if (BATTERY_STUDY_ENABLED) setShowAutonomyStudy(true); }}
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
            <Text style={styles.brandName}>{APP_DISPLAY_NAME.toUpperCase()}</Text>
            <Text style={styles.brandSubtitle}>SENTINELA DE PROXIMIDADE</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {deviceBatteryPercent != null && (
            <View
              style={[styles.batteryIndicator, { borderColor: colorWithAlpha(deviceBatteryColor, 0.4) }]}
              accessibilityLabel={`Bateria do dispositivo em ${deviceBatteryPercent} por cento${monitor.bateriaCarregando ? ', carregando' : ''}`}
            >
              <Ionicons name={deviceBatteryIcon} size={18} color={deviceBatteryColor} />
              <Text style={[styles.batteryIndicatorText, { color: deviceBatteryColor }]}>{deviceBatteryPercent}%</Text>
            </View>
          )}
          <TouchableOpacity style={styles.avatar} activeOpacity={0.75} onPress={() => changeTab('SYSTEM')}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {renderScreen()}
      </Animated.View>
      {BATTERY_STUDY_ENABLED && <AutonomyStudyModal visible={showAutonomyStudy} onClose={() => setShowAutonomyStudy(false)} />}
      {INTERNAL_TOOLS_ENABLED && <ProximityTrialModal
        visible={showProximityTrial}
        onClose={() => setShowProximityTrial(false)}
        connected={monitor.conectado}
        standby={monitor.emEspera}
        panic={monitor.modoPanico}
      />}

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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    batteryIndicator: {
      minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 9, borderRadius: 18, borderWidth: 1, backgroundColor: colors.cardBg,
    },
    batteryIndicatorText: { fontSize: 12, fontWeight: '800' },
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
