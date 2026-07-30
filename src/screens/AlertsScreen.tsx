import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AlertItem } from '../hooks/useEsp32Monitor';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { AppColors, colorWithAlpha } from '../theme';

export default function AlertsScreen({ alertas, limparAlertas }: { alertas: AlertItem[]; limparAlertas: () => void }) {
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<{ nomeResponsavel?: string; nomeCrianca?: string } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@escolta_user_profile').then(raw => {
      if (raw) setProfile(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  const handleClear = () => {
    Alert.alert(
      'Limpar todos os registros?',
      'As ocorrências serão removidas deste celular e não poderão ser recuperadas.',
      [
        { text: 'Manter registros', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: limparAlertas },
      ]
    );
  };

  const handleShare = async () => {
    if (alertas.length === 0) {
      Alert.alert('Nenhum registro', 'Ainda não existem ocorrências para compartilhar.');
      return;
    }
    const lines = [
      'ESCOLTA UNITAU — REGISTRO DE OCORRÊNCIAS',
      'Protótipo acadêmico funcional',
      '',
      profile?.nomeResponsavel ? `Responsável: ${profile.nomeResponsavel}` : '',
      profile?.nomeCrianca ? `Criança monitorada: ${profile.nomeCrianca}` : '',
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      ...alertas.map(item => `[${item.time}] ${item.title}\n${item.desc}`),
    ].filter(Boolean);
    try {
      await Share.share({ title: 'Registros Escolta UNITAU', message: lines.join('\n') });
    } catch {
      Alert.alert('Falha ao compartilhar', 'O relatório não pôde ser aberto em outro aplicativo.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>LINHA DO TEMPO</Text>
          <Text style={styles.title}>Registros</Text>
          <Text style={styles.subtitle}>{alertas.length} {alertas.length === 1 ? 'ocorrência registrada' : 'ocorrências registradas'}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleShare} accessibilityLabel="Compartilhar registros">
          <Ionicons name="share-outline" size={21} color={colors.primaryBlue} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleClear} accessibilityLabel="Limpar registros">
          <Ionicons name="trash-outline" size={21} color={colors.dangerRed} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={alertas}
        keyExtractor={item => item.id}
        contentContainerStyle={alertas.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TimelineItem item={item} colors={colors} styles={styles} last={index === alertas.length - 1} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={34} color={colors.textMuted} /></View>
            <Text style={styles.emptyTitle}>Nenhuma ocorrência</Text>
            <Text style={styles.emptyText}>Mudanças importantes da Sentinela aparecerão aqui com horário e contexto.</Text>
          </View>
        }
      />
    </View>
  );
}

function TimelineItem({ item, colors, styles, last }: { item: AlertItem; colors: AppColors; styles: ReturnType<typeof createStyles>; last: boolean }) {
  const color = item.type === 'panico' ? colors.dangerRed : item.type === 'aviso' ? colors.warningYellow : colors.safeGreen;
  const icon: keyof typeof Ionicons.glyphMap = item.type === 'panico' ? 'alert-circle' : item.type === 'aviso' ? 'warning' : 'checkmark-circle';
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineTrack}>
        <View style={[styles.timelineDot, { backgroundColor: colorWithAlpha(color, 0.15), borderColor: color }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        {!last && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{item.title.replace(/[🚨✅]/g, '').trim()}</Text>
          <Text style={styles.eventTime}>{item.time}</Text>
        </View>
        <Text style={styles.eventDescription}>{item.desc}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 18 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 18, paddingBottom: 14 },
    eyebrow: { color: colors.primaryBlue, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: colors.textPrimary, fontSize: 27, fontWeight: '800', marginTop: 2 },
    subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    iconButton: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder },
    listContent: { paddingTop: 5, paddingBottom: 38 },
    timelineRow: { flexDirection: 'row', alignItems: 'stretch' },
    timelineTrack: { width: 40, alignItems: 'center' },
    timelineDot: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, zIndex: 2 },
    timelineLine: { flex: 1, width: 1, backgroundColor: colors.cardBorder, marginVertical: 3 },
    eventCard: { flex: 1, backgroundColor: colors.cardBg, borderRadius: 15, borderWidth: 1, borderColor: colors.cardBorder, padding: 14, marginLeft: 7, marginBottom: 13 },
    eventHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    eventTitle: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
    eventTime: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
    eventDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 7 },
    emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
    empty: { alignItems: 'center', maxWidth: 290 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBg, marginBottom: 15 },
    emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
    emptyText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  });
}
