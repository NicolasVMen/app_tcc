// ============================================================
// DashboardScreen — Tela principal do Escolta UNITAU (BLE)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { type NivelSinal, type Esp32MonitorState } from '../hooks/useEsp32Monitor';
import { toggleSomBle, resetarAlarmeBle } from '../services/bleApi';
import { COLORS } from '../theme';

function getSignalColor(nivel: NivelSinal): string {
  switch (nivel) {
    case 'seguro': return COLORS.safeGreen;
    case 'aviso': return COLORS.warningYellow;
    case 'panico': return COLORS.dangerRed;
    default: return COLORS.textMuted;
  }
}

export default function DashboardScreen({ monitor }: { monitor: Esp32MonitorState & { conectar: () => Promise<void> } }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('--');

  const ultimaRef = useRef(monitor.ultimaAtualizacao);
  const conectadoRef = useRef(monitor.conectado);

  useEffect(() => {
    ultimaRef.current = monitor.ultimaAtualizacao;
    conectadoRef.current = monitor.conectado;
  }, [monitor.ultimaAtualizacao, monitor.conectado]);

  useEffect(() => {
    const updateTimer = () => {
      if (!conectadoRef.current || !ultimaRef.current) {
        setTimeSinceUpdate('--');
        return;
      }

      // Format as HH:mm:ss (e.g. 22:05:12)
      const date = new Date(ultimaRef.current);
      const formatted = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      setTimeSinceUpdate(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500); // Check faster to always show the exact second it arrived

    return () => clearInterval(interval);
  }, []);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ---- Animações ----
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Inicia a pulsação se o nível não for seguro e estiver conectado
    if (monitor.conectado && (monitor.nivelSinal === 'aviso' || monitor.nivelSinal === 'panico')) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: monitor.nivelSinal === 'panico' ? 400 : 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: monitor.nivelSinal === 'panico' ? 400 : 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [monitor.nivelSinal, monitor.conectado]);

  // ---- Handlers ----
  const handleToggleSom = async () => {
    setLoadingAction('som');
    try {
      await toggleSomBle(!monitor.somHabilitado);
    } catch {
      Alert.alert('Aviso', 'Não foi possível alterar o som (talvez a placa esteja em pânico).');
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
  const distanciaDisplay = monitor.conectado && monitor.distanciaEstimada != null
    ? `${monitor.distanciaEstimada.toFixed(1)}m`
    : '--';
  const statusColor = monitor.conectado ? getSignalColor(monitor.nivelSinal) : COLORS.textMuted;

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryBlue} colors={[COLORS.primaryBlue]} />}
      >

        {/* ========== CARD PRINCIPAL (RADAR) ========== */}
        <View style={styles.radarCard}>
          <View style={styles.connectionStatus}>
            <View style={[styles.dot, { backgroundColor: monitor.conectado ? COLORS.safeGreen : COLORS.dangerRed }]} />
            <Text style={styles.connectionText}>
              {monitor.conectado ? 'DISPOSITIVO PAREADO' : 'DESCONECTADO'}
            </Text>
          </View>

          {/* Círculo Animado de Status */}
          <View style={styles.circleContainer}>
            <Animated.View 
              style={[
                styles.pulseCircle, 
                { 
                  borderColor: statusColor, 
                  backgroundColor: statusColor + '20', // 20% opacity
                  transform: [{ scale: pulseAnim }]
                }
              ]} 
            />
            <View style={[styles.innerCircle, { backgroundColor: statusColor }]}>
              <MaterialCommunityIcons 
                name={monitor.conectado ? (monitor.modoPanico ? "alert-octagram" : "shield-check") : "bluetooth-off"} 
                size={48} 
                color={COLORS.white} 
              />
            </View>
          </View>

          <Text style={[styles.statusMainText, { color: statusColor }]}>
            {!monitor.conectado ? 'OFFLINE' : monitor.nivelSinal.toUpperCase()}
          </Text>

          {/* Botão Conectar (Se Desconectado) */}
          {!monitor.conectado && (
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={() => monitor.conectar()}
              disabled={monitor.isScanning}
              activeOpacity={0.8}
            >
              {monitor.isScanning ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.connectButtonText}>CONECTAR BLUETOOTH</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ========== ALERTA DE PÂNICO ========== */}
        {monitor.modoPanico && (
          <TouchableOpacity style={styles.panicBanner} onPress={handleResetPanico} activeOpacity={0.9}>
            <View style={styles.panicIconBox}>
              <Ionicons name="warning" size={24} color={COLORS.white} />
            </View>
            <View style={styles.panicTextContainer}>
              <Text style={styles.panicTitle}>DESATIVAR ALARME</Text>
              <Text style={styles.panicSubtitle}>A criança foi encontrada?</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {/* ========== MÉTRICAS (GRID) ========== */}
        <View style={styles.metricsGrid}>
          {/* Distância */}
          <View style={styles.metricCard}>
            <Ionicons name="map-outline" size={24} color={COLORS.primaryBlue} />
            <Text style={styles.metricValue}>{distanciaDisplay}</Text>
            <Text style={styles.metricLabel}>Distância Alvo</Text>
          </View>
          
          {/* RSSI */}
          <View style={styles.metricCard}>
            <Ionicons name="wifi-outline" size={24} color={COLORS.primaryBlue} />
            <Text style={styles.metricValue}>{rssiDisplay}</Text>
            <Text style={styles.metricLabel}>Força do Sinal</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {/* Última Leitura */}
          <View style={styles.metricCard}>
            <Ionicons name="time-outline" size={24} color={COLORS.primaryBlue} />
            <Text style={styles.metricValue}>{timeSinceUpdate}</Text>
            <Text style={styles.metricLabel}>Última Leitura</Text>
          </View>

          {/* Cão de Guarda */}
          <View style={styles.metricCard}>
            <Ionicons name="pulse-outline" size={24} color={COLORS.primaryBlue} />
            <Text style={[styles.metricValue, { color: monitor.conectado ? COLORS.safeGreen : COLORS.dangerRed }]}>
              {monitor.conectado ? 'Ativo' : 'Inativo'}
            </Text>
            <Text style={styles.metricLabel}>Cão de Guarda</Text>
          </View>
        </View>

        {/* ========== AÇÕES INFERIORES ========== */}
        <View style={styles.controlCard}>
          <Text style={styles.controlTitle}>Configurações da Placa</Text>
          
          <TouchableOpacity
            style={[
              styles.somButton, 
              (!monitor.somHabilitado && !monitor.modoPanico) && styles.somButtonOff,
              monitor.modoPanico && { backgroundColor: COLORS.dangerRed }
            ]}
            onPress={handleToggleSom}
            disabled={loadingAction === 'som' || !monitor.conectado || monitor.modoPanico}
            activeOpacity={0.8}
          >
            <View style={styles.somButtonLeft}>
              <Ionicons
                name={(monitor.somHabilitado || monitor.modoPanico) ? 'volume-high' : 'volume-mute'}
                size={22}
                color={COLORS.white}
              />
              <Text style={styles.somButtonText}>
                {monitor.modoPanico 
                  ? 'ALARME FORÇADO (PÂNICO)' 
                  : (monitor.somHabilitado ? 'Alarme Sonoro ATIVADO' : 'Alarme Sonoro MUTADO')}
              </Text>
            </View>
            {loadingAction === 'som' ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <View style={[
                styles.toggleDot, 
                (!monitor.somHabilitado && !monitor.modoPanico) && styles.toggleDotOff
              ]} />
            )}
          </TouchableOpacity>
          <Text style={styles.controlHint}>
            Aviso: O som não pode ser mutado enquanto estiver em estado de Pânico real.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ============================================================
// Estilos (Tema Dark Moderno)
// ============================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  radarCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  circleContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  innerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  statusMainText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  connectButton: {
    marginTop: 24,
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  connectButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'flex-start',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  metricLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  panicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerRed,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.dangerRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  panicIconBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  panicTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  panicSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  controlCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  somButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  somButtonOff: {
    backgroundColor: COLORS.buttonDark,
  },
  somButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  somButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  toggleDotOff: {
    backgroundColor: COLORS.textMuted,
  },
  controlHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

