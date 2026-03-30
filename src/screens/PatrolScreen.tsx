import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#f0f4f8',
  cardBg: '#ffffff',
  headerBlue: '#3478F6',
  textPrimary: '#1a202c',
  textSecondary: '#718096',
};

export default function PatrolScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.radarContainer}>
        <Ionicons name="radio-outline" size={100} color={COLORS.headerBlue} />
        <Text style={styles.title}>Modo Ronda Ativo</Text>
        <Text style={styles.subtitle}>
          O monitoramento do ESP32 está em execução contínua. Mantenha o dispositivo próximo para segurança.
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={32} color={COLORS.textSecondary} />
        <Text style={styles.infoText}>
          Esta tela simula um acompanhamento de ronda física. Em uma versão mais completa do TCC, poderia incluir marcações GPS pelo campus da UNITAU.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  radarContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 20, marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 12, alignItems: 'center', gap: 12, marginTop: 20 },
  infoText: { flex: 1, color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
});
