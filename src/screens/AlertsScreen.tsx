import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#f0f4f8',
  cardBg: '#ffffff',
  dangerRed: '#EF4444',
  warningYellow: '#F59E0B',
  infoBlue: '#3478F6',
  textPrimary: '#1a202c',
  textSecondary: '#718096',
};

export default function AlertsScreen({ alertas }: { alertas: any[] }) {
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
      <Text style={styles.headerTitle}>Histórico de Alertas</Text>
      {alertas && alertas.length > 0 ? (
        <FlatList
          data={alertas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={60} color="#CBD5E0" />
          <Text style={styles.emptyText}>Nenhum alerta ainda.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5, marginTop: 20, marginBottom: 15 },
  card: { flexDirection: 'row', backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  icon: { marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  desc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  time: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, alignSelf: 'flex-start' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.6, marginTop: -50 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 10, fontWeight: '500' }
});
