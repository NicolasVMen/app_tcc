import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from './src/screens/DashboardScreen';
import PatrolScreen from './src/screens/PatrolScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { useEsp32Monitor } from './src/hooks/useEsp32Monitor';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#f0f4f8',
  headerBlue: '#3478F6',
  white: '#ffffff',
  textPrimary: '#1a202c',
  cardBg: '#ffffff',
  tabInactive: '#A0AEC0',
};

type Tab = 'DASHBOARD' | 'PATROL' | 'ALERTS' | 'SETTINGS';

export default function App() {
  const monitor = useEsp32Monitor();
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');

  const renderScreen = () => {
    switch (activeTab) {
      case 'DASHBOARD': return <DashboardScreen monitor={monitor} />;
      case 'PATROL': return <PatrolScreen />;
      case 'ALERTS': return <AlertsScreen alertas={monitor.alertas} />;
      case 'SETTINGS': return <SettingsScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* ========== CABEÇALHO GLOBAL ========== */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
          </View>
          <Text style={styles.headerTitle}>ESCOLTA UNITAU</Text>
        </View>
        <TouchableOpacity style={styles.avatarCircle} activeOpacity={0.8} onPress={() => setActiveTab('SETTINGS')}>
          <Ionicons name="person" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* ========== CONTEÚDO DA TELA ========== */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* ========== BARRA DE NAVEGAÇÃO INFERIOR ========== */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => setActiveTab('DASHBOARD')}>
          <Ionicons name={activeTab === 'DASHBOARD' ? "grid" : "grid-outline"} size={26} color={activeTab === 'DASHBOARD' ? COLORS.headerBlue : COLORS.tabInactive} />
          <Text style={[styles.tabLabel, { color: activeTab === 'DASHBOARD' ? COLORS.headerBlue : COLORS.tabInactive }]}>INÍCIO</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => setActiveTab('PATROL')}>
          <Ionicons name={activeTab === 'PATROL' ? "shield" : "shield-outline"} size={26} color={activeTab === 'PATROL' ? COLORS.headerBlue : COLORS.tabInactive} />
          <Text style={[styles.tabLabel, { color: activeTab === 'PATROL' ? COLORS.headerBlue : COLORS.tabInactive }]}>RONDA</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => setActiveTab('ALERTS')}>
          <Ionicons name={activeTab === 'ALERTS' ? "notifications" : "notifications-outline"} size={26} color={activeTab === 'ALERTS' ? COLORS.headerBlue : COLORS.tabInactive} />
          <Text style={[styles.tabLabel, { color: activeTab === 'ALERTS' ? COLORS.headerBlue : COLORS.tabInactive }]}>ALERTAS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => setActiveTab('SETTINGS')}>
          <Ionicons name={activeTab === 'SETTINGS' ? "settings" : "settings-outline"} size={26} color={activeTab === 'SETTINGS' ? COLORS.headerBlue : COLORS.tabInactive} />
          <Text style={[styles.tabLabel, { color: activeTab === 'SETTINGS' ? COLORS.headerBlue : COLORS.tabInactive }]}>AJUSTES</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: COLORS.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.headerBlue,
    alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.headerBlue,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 0.5 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.textPrimary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#EDF2F7',
  },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: COLORS.cardBg, paddingVertical: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 15,
  },
  tabItem: { alignItems: 'center', flex: 1, gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
});
