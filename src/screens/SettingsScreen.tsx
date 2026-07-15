import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#f0f4f8',
  cardBg: '#ffffff',
  textPrimary: '#1a202c',
  textSecondary: '#718096',
  headerBlue: '#3478F6',
  dangerRed: '#EF4444',
};

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);

  return (
    <View style={styles.container}>
      
      <Text style={styles.sectionTitle}>CONEXÃO COM A PLACA</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Ionicons name="bluetooth" size={22} color={COLORS.headerBlue} />
            <Text style={styles.rowText}>Bluetooth Low Energy</Text>
          </View>
        </View>
        <Text style={{ paddingHorizontal: 18, paddingBottom: 18, color: COLORS.textSecondary, fontSize: 13 }}>
          O aplicativo agora se conecta automaticamente ao dispositivo Escolta usando Bluetooth (BLE). O Wi-Fi não é mais necessário e você não perde sua conexão com a internet.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>PREFERÊNCIAS</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Ionicons name="notifications" size={22} color={COLORS.textPrimary} />
            <Text style={styles.rowText}>Notificações Push</Text>
          </View>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: COLORS.headerBlue }} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Ionicons name="volume-high" size={22} color={COLORS.textPrimary} />
            <Text style={styles.rowText}>Som de Pânico</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>SOBRE O PROJETO</Text>
      <View style={styles.card}>
        <Text style={styles.aboutText}>
          <Text style={{fontWeight: 'bold', fontSize: 16}}>Escolta UNITAU</Text>{"\n\n"}
          Projeto de TCC. Monitoramento de segurança e proximidade física para crianças usando tecnologia BLE (Bluetooth Low Energy).
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, marginTop: 10, marginBottom: 12 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowText: { fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: '#EDF2F7', marginLeft: 50 },
  aboutText: { padding: 18, fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
});
