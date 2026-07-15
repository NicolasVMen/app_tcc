// ============================================================
// DashboardScreen — Tela principal do Escolta UNITAU (BLE)
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { type NivelSinal, type Esp32MonitorState } from '../hooks/useEsp32Monitor';
import { toggleSomBle, resetarAlarmeBle } from '../services/bleApi';

const { width } = Dimensions.get('window');

// ---- Cores do tema ----
const COLORS = {
  background: '#f0f4f8',
  cardBg: '#ffffff',
  headerBlue: '#3478F6',
  darkButton: '#2c3e50',
  blueButton: '#4A9EF7',
  greenButton: '#34D399',
  dangerRed: '#EF4444',
  warningYellow: '#F59E0B',
  safeGreen: '#10B981',
  textPrimary: '#1a202c',
  textSecondary: '#718096',
  textMuted: '#a0aec0',
  white: '#ffffff',
  tabInactive: '#CBD5E0',
};

function getSignalColor(nivel: NivelSinal): string {
  switch (nivel) {
    case 'seguro': return COLORS.safeGreen;
    case 'aviso': return COLORS.warningYellow;
    case 'panico': return COLORS.dangerRed;
    default: return COLORS.textMuted;
  }
}

function getSignalBars(nivel: NivelSinal): number {
  switch (nivel) {
    case 'seguro': return 4;
    case 'aviso': return 2;
    case 'panico': return 1;
    default: return 0;
  }
}

// ---- Componente de barras de sinal ----
function SignalBars({ nivel }: { nivel: NivelSinal }) {
  const bars = getSignalBars(nivel);
  const color = getSignalColor(nivel);
  return (
    <View style={styles.signalBarsContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.signalBar,
            {
              height: 6 + i * 4,
              backgroundColor: i <= bars ? color : '#E2E8F0',
            },
          ]}
        />
      ))}
    </View>
  );
}

// ---- Componente principal ----
export default function DashboardScreen({ monitor }: { monitor: Esp32MonitorState & { conectar: () => Promise<void> } }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // ---- Handlers ----
  const handleToggleSom = async () => {
    setLoadingAction('som');
    try {
      await toggleSomBle(!monitor.somHabilitado);
    } catch {
      Alert.alert('Erro', 'Não foi possível comunicar via Bluetooth.');
    }
    setLoadingAction(null);
  };

  const handleResetPanico = async () => {
    try {
      await resetarAlarmeBle();
    } catch {
      Alert.alert('Erro', 'Não foi possível resetar o alarme.');
    }
  };

  const rssiDisplay = monitor.conectado ? `${monitor.rssiAtual} dBm` : '-- dBm';
  const distanciaDisplay =
    monitor.conectado && monitor.distanciaEstimada != null
      ? `~ ${monitor.distanciaEstimada.toFixed(1)} m`
      : null;
  const somLabel = monitor.somHabilitado ? '🔊 SOM: ON' : '🔇 SOM: OFF';

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========== STATUS CARD ========== */}
        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons
              name="bluetooth"
              size={28}
              color={monitor.conectado ? COLORS.headerBlue : COLORS.textPrimary}
            />
            <Text style={styles.statusTitle}>
              {monitor.conectado ? 'CONECTADO' : 'DESCONECTADO'}
            </Text>
          </View>

          {/* Botão de Conectar (se desconectado) */}
          {!monitor.conectado && (
            <TouchableOpacity
              style={[styles.configButton, { backgroundColor: COLORS.blueButton, marginBottom: 20 }]}
              onPress={() => monitor.conectar()}
              disabled={monitor.isScanning}
              activeOpacity={0.8}
            >
              {monitor.isScanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.configIconCircle}>
                  <Ionicons name="bluetooth" size={22} color={COLORS.white} />
                </View>
              )}
              <Text style={styles.configButtonText}>
                {monitor.isScanning ? 'PROCURANDO ESCOLTA...' : 'CONECTAR BLUETOOTH'}
              </Text>
            </TouchableOpacity>
          )}

          {monitor.scanError && (
            <Text style={{ color: COLORS.dangerRed, marginBottom: 16, textAlign: 'center' }}>
              Erro: {monitor.scanError}
            </Text>
          )}

          {/* Botão SOM */}
          <TouchableOpacity
            style={[
              styles.somButton,
              !monitor.somHabilitado && styles.somButtonOff,
              !monitor.conectado && { opacity: 0.5 }
            ]}
            onPress={handleToggleSom}
            disabled={loadingAction === 'som' || !monitor.conectado}
            activeOpacity={0.8}
          >
            <Ionicons
              name={monitor.somHabilitado ? 'volume-high' : 'volume-mute'}
              size={22}
              color={COLORS.white}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.somButtonText}>{somLabel}</Text>
          </TouchableOpacity>

          {/* Sinal RSSI */}
          <View style={styles.signalRow}>
            <SignalBars nivel={monitor.nivelSinal} />
            <Text
              style={[
                styles.signalText,
                { color: getSignalColor(monitor.nivelSinal) },
              ]}
            >
              Sinal BLE: {rssiDisplay}
            </Text>
          </View>

          {/* Distância estimada */}
          {distanciaDisplay && (
            <View style={styles.distanceRow}>
              <Ionicons name="walk-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.distanceText}>Distância estimada: {distanciaDisplay}</Text>
            </View>
          )}
        </View>

        {/* ========== ALERTA DE PÂNICO ========== */}
        {monitor.modoPanico && (
          <TouchableOpacity
            style={styles.panicBanner}
            onPress={handleResetPanico}
            activeOpacity={0.9}
          >
            <Text style={styles.panicEmoji}>🚨</Text>
            <View style={styles.panicTextContainer}>
              <Text style={styles.panicTitle}>PERIGO! Aproxime-se.</Text>
              <Text style={styles.panicSubtitle}>Toque para resetar o alarme</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================
// Estilos
// ============================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statusCard: {
    alignItems: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  somButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.darkButton,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    marginBottom: 16,
  },
  somButtonOff: {
    backgroundColor: '#64748b',
  },
  somButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  signalBar: {
    width: 5,
    borderRadius: 2,
  },
  signalText: {
    fontSize: 15,
    fontWeight: '600',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  distanceText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  panicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: COLORS.dangerRed,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  panicEmoji: {
    fontSize: 32,
  },
  panicTextContainer: {
    flex: 1,
  },
  panicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dangerRed,
  },
  panicSubtitle: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 2,
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 14,
    width: '100%',
    justifyContent: 'center',
  },
  configIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
