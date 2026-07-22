import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions, Platform, ActivityIndicator, Alert, PanResponder, Animated, Image } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth } from './src/services/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';

import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ManualScreen from './src/screens/ManualScreen';
import PatrolScreen from './src/screens/PatrolScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { useEsp32Monitor } from './src/hooks/useEsp32Monitor';
import { COLORS } from './src/theme';

type Tab = 'DASHBOARD' | 'MANUAL' | 'ALERTS' | 'SETTINGS' | 'LAB';

// Abas visíveis na barra inferior (LAB não entra no swipe)
const VISIBLE_TABS: Tab[] = ['DASHBOARD', 'MANUAL', 'ALERTS', 'SETTINGS'];

// Fallback para cálculo de padding (usado no StyleSheet estático)
const statusBarH = StatusBar.currentHeight || 0;
const topPaddingFallback = Platform.OS === 'android' ? statusBarH : 0;

const SWIPE_THRESHOLD = 50; // Mínimo de pixels para considerar um swipe

function getInitials(name: string): string {
  if (!name || name.trim() === '') return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? Math.max(12, insets.bottom + 6) : 24;
  const topPadding = Platform.OS === 'android' ? insets.top : 0;
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [hasWarnedVolume, setHasWarnedVolume] = useState(false);
  const [userInitials, setUserInitials] = useState('?');

  const monitor = useEsp32Monitor();
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  const activeTabRef = useRef<Tab>('DASHBOARD'); // Track activeTab for PanResponder

  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(-80)).current;
  const hasEverConnected = useRef(false);

  // ---- Animação de transição entre telas ----
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const changeTab = (newTab: Tab) => {
    if (newTab === activeTabRef.current) return; // FIX: Use ref instead of state to avoid stale closure in PanResponder
    // Fade out → troca → Fade in
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(newTab);
      activeTabRef.current = newTab;
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  // ---- Swipe lateral (PanResponder) ----
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Só ativa o swipe se o movimento horizontal for maior que o vertical
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentTab = activeTabRef.current;
        const currentIndex = VISIBLE_TABS.indexOf(currentTab);
        if (currentIndex === -1) return; // Está no LAB, não faz swipe

        if (gestureState.dx < -SWIPE_THRESHOLD && currentIndex < VISIBLE_TABS.length - 1) {
          // Swipe para esquerda → próxima aba
          changeTab(VISIBLE_TABS[currentIndex + 1]);
        } else if (gestureState.dx > SWIPE_THRESHOLD && currentIndex > 0) {
          // Swipe para direita → aba anterior
          changeTab(VISIBLE_TABS[currentIndex - 1]);
        }
      },
    })
  ).current;

  useEffect(() => {
    const loadInitials = async () => {
      try {
        const raw = await AsyncStorage.getItem('@escolta_user_profile');
        if (raw) {
          const profile = JSON.parse(raw);
          setUserInitials(getInitials(profile.nomeResponsavel));
        }
      } catch (e) {}
    };
    loadInitials();
  }, [activeTab]);

  useEffect(() => {
    if (monitor.conectado) {
      if (hasEverConnected.current) {
        setShowToast(true);
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            Animated.timing(toastAnim, {
              toValue: -80,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setShowToast(false);
            });
          }, 3000);
        });
      } else {
        hasEverConnected.current = true;
      }
    }
  }, [monitor.conectado]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser && !hasWarnedVolume) {
        Alert.alert(
          "Atenção ao Volume 🔊",
          "Para sua segurança, deixe o volume de mídia do celular no MÁXIMO para garantir que ouvirá os alertas de pânico.",
          [{ text: "Entendi", style: "default" }]
        );
        setHasWarnedVolume(true);
      }
    });
    return () => unsubscribe();
  }, [hasWarnedVolume]);

  if (loadingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.safeArea, { paddingTop: topPadding }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <AuthScreen onLoginSuccess={() => {}} />
      </View>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'DASHBOARD': return <DashboardScreen monitor={monitor} />;
      case 'MANUAL': return <ManualScreen />;
      case 'ALERTS': return <AlertsScreen alertas={monitor.alertas} limparAlertas={monitor.limparAlertas} />;
      case 'SETTINGS': return <SettingsScreen onOpenLab={() => changeTab('LAB')} />;
      case 'LAB': return <PatrolScreen monitor={monitor} />;
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={true} />

      {showToast && (
        <Animated.View style={[styles.toastContainer, { top: topPadding + 10, transform: [{ translateY: toastAnim }] }]}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.toastText}>Dispositivo Reconectado!</Text>
        </Animated.View>
      )}

      {/* CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} activeOpacity={0.7} onPress={() => changeTab('DASHBOARD')}>
          <Image 
            source={require('./assets/icon.png')} 
            style={{ 
              width: 40, 
              height: 40, 
              resizeMode: 'contain', 
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)' 
            }} 
          />
          <Text style={styles.headerTitle}>ESCOLTA UNITAU</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.avatarCircle} activeOpacity={0.8} onPress={() => changeTab('SETTINGS')}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO COM SWIPE E FADE */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]} {...panResponder.panHandlers}>
        {renderScreen()}
      </Animated.View>

      {/* TAB BAR */}
      <View style={[styles.tabBar, { paddingBottom: bottomPadding }]}>
        {([
          { key: 'DASHBOARD', icon: 'grid', label: 'INÍCIO' },
          { key: 'MANUAL', icon: 'book', label: 'MANUAL' },
          { key: 'ALERTS', icon: 'notifications', label: 'ALERTAS' },
          { key: 'SETTINGS', icon: 'settings', label: 'AJUSTES' },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => changeTab(tab.key)}
          >
            <Ionicons
              name={activeTab === tab.key ? tab.icon : `${tab.icon}-outline` as any}
              size={24}
              color={activeTab === tab.key ? COLORS.primaryBlue : COLORS.textMuted}
            />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? COLORS.primaryBlue : COLORS.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryBlue,
    alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primaryBlue,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 0.5 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryBlue,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primaryBlue, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: COLORS.cardBg, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.cardBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 20,
  },
  tabItem: { alignItems: 'center', flex: 1, gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    gap: 8,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
