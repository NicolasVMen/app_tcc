import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Share, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#0F172A',
  cardBg: '#1E293B',
  cardBorder: '#334155',
  dangerRed: '#EF4444',
  warningYellow: '#F59E0B',
  infoBlue: '#3B82F6',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  white: '#FFFFFF',
};

export default function AlertsScreen({ alertas, limparAlertas }: { alertas: any[], limparAlertas: () => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('@escolta_user_profile').then(raw => {
      if (raw) setProfile(JSON.parse(raw));
    });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleClear = () => {
    Alert.alert(
      "Limpar Histórico",
      "Tem certeza que deseja apagar todos os registros de alerta?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Apagar", style: "destructive", onPress: limparAlertas }
      ]
    );
  };

  const exportText = async () => {
    if (!alertas || alertas.length === 0) {
      Alert.alert('Vazio', 'Não há alertas para exportar.');
      return;
    }

    const now = new Date();
    const dataHora = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    let report = `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `🛡️ *RELATÓRIO DE SEGURANÇA*\n`;
    report += `*ESCOLTA UNITAU*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `📅 Gerado em: ${dataHora}\n\n`;

    if (profile) {
      report += `👤 *RESPONSÁVEL*\n`;
      if (profile.nomeResponsavel) report += `Nome: ${profile.nomeResponsavel}\n`;
      if (profile.cpfResponsavel) report += `CPF: ${profile.cpfResponsavel}\n`;
      if (profile.telefoneResponsavel) report += `Tel: ${profile.telefoneResponsavel}\n`;
      report += `\n`;

      if (profile.nomeCrianca) {
        report += `👶 *CRIANÇA MONITORADA*\n`;
        report += `Nome: ${profile.nomeCrianca}\n`;
        if (profile.cpfCrianca) report += `CPF: ${profile.cpfCrianca}\n`;
        report += `\n`;
      }
    }

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📋 *HISTÓRICO DE EVENTOS* (${alertas.length})\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    alertas.forEach((a, i) => {
      const icon = a.type === 'panico' ? '🔴' : a.type === 'aviso' ? '🟡' : '🟢';
      report += `${icon} [${a.time}] ${a.title}\n`;
      report += `   ${a.desc}\n\n`;
    });

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `Escolta UNITAU · TCC Eng. Computação\n`;
    report += `Relatório gerado automaticamente pelo app.\n`;

    try {
      await Share.share({
        message: report,
        title: 'Relatório Escolta UNITAU'
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar o relatório.');
    }
  };

  const renderItem = ({ item }: any) => {
    let icon = "information-circle";
    let color = COLORS.infoBlue;

    if (item.type === 'panico') { icon = "alert-circle"; color = COLORS.dangerRed; }
    else if (item.type === 'aviso') { icon = "warning"; color = COLORS.warningYellow; }

    return (
      <View style={styles.card}>
        <Ionicons name={icon as any} size={36} color={color} style={styles.icon} />
        <View style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.desc}>{item.desc}</Text>
        </View>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Alertas</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleClear} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={22} color={COLORS.dangerRed} />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportText} style={[styles.actionBtn, styles.shareBtn]}>
            <Ionicons name="share-social-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {alertas && alertas.length > 0 ? (
        <FlatList
          data={alertas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.infoBlue} colors={[COLORS.infoBlue]} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={60} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Nenhum alerta ainda.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, marginBottom: 15,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cardBg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder
  },
  shareBtn: { backgroundColor: COLORS.infoBlue, borderColor: COLORS.infoBlue },
  card: { flexDirection: 'row', backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  icon: { marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  desc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  time: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, alignSelf: 'flex-start' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.6, marginTop: -50 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 10, fontWeight: '500' }
});
