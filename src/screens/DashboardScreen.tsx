// ============================================================
// DashboardScreen — Tela principal do Escolta UNITAU
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { type NivelSinal, type Esp32MonitorState } from '../hooks/useEsp32Monitor';
import { toggleSom, ativarModoRua, zerarTudo, resetarAlarme, configurarModoCasa } from '../services/esp32Api';
import { Modal, TextInput } from 'react-native';

const { width } = Dimensions.get('window');

// ---- Cores do tema ----
const COLORS = {
  background: '#f0f4f8',
  cardBg: '#ffffff',
  headerBlue: '#3478F6',
  darkButton: '#2c3e50',
  blueButton: '#4A9EF7',
  greenButton: '#34D399',
  grayButton: '#A0AEC0',
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
export default function DashboardScreen({ monitor }: { monitor: Esp32MonitorState }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // ---- States do Modal Modo Casa ----
  const [modalCasaVisible, setModalCasaVisible] = useState(false);
  const [ssidCasa, setSsidCasa] = useState('');
  const [passCasa, setPassCasa] = useState('');

  // ---- Handlers ----
  const handleToggleSom = async () => {
    setLoadingAction('som');
    try {
      await toggleSom();
    } catch {
      Alert.alert('Erro', 'Não foi possível comunicar com a ESP32.');
    }
    setLoadingAction(null);
  };

  const handleModoRua = async () => {
    Alert.alert(
      'Ativar Modo Rua',
      'A placa será reiniciada em Modo Rua. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ativar',
          onPress: async () => {
            setLoadingAction('rua');
            try {
              await ativarModoRua();
              Alert.alert('Sucesso', 'ESP32 reiniciando em Modo Rua...');
            } catch {
              Alert.alert('Erro', 'Não foi possível comunicar com a ESP32.');
            }
            setLoadingAction(null);
          },
        },
      ]
    );
  };

  const handleZerar = async () => {
    Alert.alert(
      'Zerar Tudo',
      'Todas as configurações serão apagadas. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Zerar',
          style: 'destructive',
          onPress: async () => {
            setLoadingAction('zerar');
            try {
              await zerarTudo();
              Alert.alert('Sucesso', 'Memória da ESP32 limpa. Reiniciando...');
            } catch {
              Alert.alert('Erro', 'Não foi possível comunicar com a ESP32.');
            }
            setLoadingAction(null);
          },
        },
      ]
    );
  };

  const handleConectarCasa = () => {
    setModalCasaVisible(true);
  };

  const handleSalvarModoCasaReq = async () => {
    if (!ssidCasa) {
      Alert.alert('Aviso', 'Preencha o nome da rede (Wi-Fi).');
      return;
    }
    setModalCasaVisible(false);
    setLoadingAction('casa');
    try {
      await configurarModoCasa(ssidCasa, passCasa);
      Alert.alert(
        'Dados Enviados!',
        'A ESP32 vai reiniciar já configurada! Verifique o Monitor Serial no PC para ver qual IP ela vai receber na sua casa.'
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível gravar na ESP32. Confira se você está conectado na rede dela.');
    }
    setLoadingAction(null);
  };

  const handleResetPanico = async () => {
    try {
      await resetarAlarme();
    } catch {
      Alert.alert('Erro', 'Não foi possível resetar o alarme.');
    }
  };

  const rssiDisplay = monitor.conectado ? `${monitor.rssiAtual} dBm` : '-- dBm';
  const distanciaDisplay =
    monitor.conectado && monitor.distanciaEstimada != null
      ? `~ ${monitor.distanciaEstimada.toFixed(1)} m`
      : null;
  const modoLabel = monitor.modoEstacao ? 'CASA 🏠' : 'RUA 🏢';
  const somLabel = monitor.somHabilitado ? '🔊 SOM: ON' : '🔇 SOM: OFF';

  return (
    <View style={styles.safeArea}>
      
      {/* ========== MODAL MODO CASA ========== */}
      <Modal visible={modalCasaVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Configurar Wi-Fi (Modo Casa)</Text>
            
            <Text style={{ marginBottom: 4, fontWeight: '600', color: COLORS.textSecondary }}>Nome do Roteador (exato):</Text>
            <TextInput 
              style={{ backgroundColor: '#EDF2F7', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 16 }} 
              placeholder="Minha_Casa_5G"
              value={ssidCasa} onChangeText={setSsidCasa} 
            />

            <Text style={{ marginBottom: 4, fontWeight: '600', color: COLORS.textSecondary }}>Senha do Wi-Fi:</Text>
            <TextInput 
              style={{ backgroundColor: '#EDF2F7', padding: 12, borderRadius: 8, marginBottom: 24, fontSize: 16 }} 
              placeholder="*******"
              value={passCasa} onChangeText={setPassCasa} 
              secureTextEntry={true} 
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setModalCasaVisible(false)} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSalvarModoCasaReq} style={{ backgroundColor: COLORS.blueButton, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Salvar na Placa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========== STATUS CARD ========== */}
        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons
              name="office-building"
              size={28}
              color={COLORS.textPrimary}
            />
            <Text style={styles.statusTitle}>SISTEMA: {modoLabel}</Text>
          </View>

          {/* Botão SOM */}
          <TouchableOpacity
            style={[
              styles.somButton,
              !monitor.somHabilitado && styles.somButtonOff,
            ]}
            onPress={handleToggleSom}
            disabled={loadingAction === 'som'}
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
              Sinal: {rssiDisplay}
            </Text>
          </View>

          {/* Distância estimada (modelo log-distance na placa) */}
          {distanciaDisplay && (
            <View style={styles.distanceRow}>
              <Ionicons name="walk-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.distanceText}>Distância estimada: {distanciaDisplay}</Text>
            </View>
          )}

          {/* Indicador de conexão */}
          {!monitor.conectado && (
            <View style={styles.disconnectedBadge}>
              <Ionicons name="cloud-offline-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.disconnectedText}>Sem conexão com ESP32</Text>
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

        {/* ========== CONFIGURAR MODO ========== */}
        <Text style={styles.sectionTitle}>CONFIGURAR MODO</Text>

        <View style={styles.configButtonsContainer}>
          {/* Conectar Wi-Fi Casa */}
          <TouchableOpacity
            style={[styles.configButton, { backgroundColor: COLORS.blueButton }]}
            onPress={handleConectarCasa}
            activeOpacity={0.8}
          >
            <View style={styles.configIconCircle}>
              <Ionicons name="home" size={22} color={COLORS.white} />
            </View>
            <Text style={styles.configButtonText}>CONECTAR WI-FI CASA</Text>
          </TouchableOpacity>

          {/* Ativar Modo Rua */}
          <TouchableOpacity
            style={[styles.configButton, { backgroundColor: COLORS.greenButton }]}
            onPress={handleModoRua}
            disabled={loadingAction === 'rua'}
            activeOpacity={0.8}
          >
            <View style={styles.configIconCircle}>
              <MaterialCommunityIcons name="office-building" size={22} color={COLORS.white} />
            </View>
            <Text style={styles.configButtonText}>ATIVAR MODO RUA</Text>
          </TouchableOpacity>

          {/* Zerar Tudo */}
          <TouchableOpacity
            style={[styles.configButton, { backgroundColor: COLORS.grayButton }]}
            onPress={handleZerar}
            disabled={loadingAction === 'zerar'}
            activeOpacity={0.8}
          >
            <View style={styles.configIconCircle}>
              <Ionicons name="refresh" size={22} color={COLORS.white} />
            </View>
            <Text style={styles.configButtonText}>ZERAR TUDO</Text>
          </TouchableOpacity>
        </View>
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

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.headerBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- ScrollView ----
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // ---- Card ----
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statusCard: {
    alignItems: 'center',
  },

  // ---- Status ----
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

  // ---- Botão SOM ----
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

  // ---- Sinal ----
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

  // ---- Desconectado ----
  disconnectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
  },
  disconnectedText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // ---- Pânico ----
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

  // ---- Seção Configurar ----
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
    textAlign: 'center',
  },

  configButtonsContainer: {
    gap: 12,
  },

  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 14,
  },
  configIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ---- Tab Bar ----
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 5,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.tabInactive,
    letterSpacing: 0.5,
  },
});
