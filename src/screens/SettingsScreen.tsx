import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { zerarTudo, getEsp32Ip, saveEsp32Ip } from '../services/esp32Api';

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
  const [ipAddress, setIpAddress] = useState('');

  useEffect(() => {
    // Carrega o IP atual ao abrir a tela
    getEsp32Ip().then(setIpAddress);
  }, []);

  const handleSaveIp = () => {
    saveEsp32Ip(ipAddress);
    Alert.alert('Salvo', 'Endereço IP configurado com sucesso! O App agora se comunicará com este IP.');
  };

  const handleResetPlaca = () => {
    Alert.alert(
      'Zerar Placa', 
      'Tem certeza que deseja apagar a memória do ESP32?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Zerar', style: 'destructive', onPress: () => zerarTudo().catch(() => {}) }
      ]
    );
  };

  return (
    <View style={styles.container}>
      
      <Text style={styles.sectionTitle}>CONEXÃO COM A PLACA</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Ionicons name="wifi" size={22} color={COLORS.textPrimary} />
            <Text style={styles.rowText}>Endereço IP do ESP32</Text>
          </View>
        </View>
        <Text style={{ paddingHorizontal: 18, color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 }}>Padrão Rua: 192.168.4.1 | Padrão Casa: Ex: 192.168.0.15</Text>
        <View style={{ paddingHorizontal: 18, paddingBottom: 18, flexDirection: 'row', gap: 10 }}>
          <TextInput
            style={{ flex: 1, backgroundColor: '#EDF2F7', padding: 12, borderRadius: 10, fontSize: 16 }}
            value={ipAddress}
            onChangeText={setIpAddress}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="Ex: escolta.local"
          />
          <TouchableOpacity 
            style={{ backgroundColor: COLORS.headerBlue, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 10 }}
            onPress={handleSaveIp}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Salvar</Text>
          </TouchableOpacity>
        </View>
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
          Projeto de TCC. Um sistema Dedo-Duro que monitora a proximidade física.
        </Text>
      </View>

      <TouchableOpacity style={styles.dangerBtn} onPress={handleResetPlaca} activeOpacity={0.8}>
        <Ionicons name="trash-outline" size={20} color={COLORS.dangerRed} style={{ marginRight: 8 }} />
        <Text style={styles.dangerText}>Apagar Memória do ESP32</Text>
      </TouchableOpacity>
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
  dangerBtn: { flexDirection: 'row', marginTop: 10, padding: 16, backgroundColor: '#FEE2E2', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: COLORS.dangerRed, fontWeight: '700', fontSize: 16 }
});
