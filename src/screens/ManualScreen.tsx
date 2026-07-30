import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppPreferences } from '../context/AppPreferencesContext';
import { AppColors, colorWithAlpha } from '../theme';

const BEFORE_LEAVING = [
  'Confirme que o Bluetooth do celular está ativo.',
  'Verifique se o Escolta está ligado e preso com segurança.',
  'Mantenha o volume do celular em um nível audível.',
  'Aguarde a Central indicar “Sistema pronto”.',
];

const STATES: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  colorKey: 'safeGreen' | 'warningYellow' | 'primaryBlue' | 'dangerRed';
}> = [
  { icon: 'shield-checkmark', title: 'Protegido', text: 'O vínculo está ativo e a proximidade está dentro da faixa esperada.', colorKey: 'safeGreen' },
  { icon: 'warning', title: 'Alcance reduzido', text: 'O sinal enfraqueceu. Aproxime-se da criança e observe o ambiente.', colorKey: 'warningYellow' },
  { icon: 'radio', title: 'Reconectando', text: 'A Sentinela perdeu o vínculo e está tentando recuperá-lo antes de iniciar a emergência.', colorKey: 'primaryBlue' },
  { icon: 'alert-circle', title: 'Emergência', text: 'A reconexão falhou. Verifique a criança imediatamente e utilize as ações disponíveis.', colorKey: 'dangerRed' },
];

export default function ManualScreen() {
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.introIcon}><Ionicons name="book-outline" size={25} color={colors.primaryBlue} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>PROTOCOLO DE USO</Text>
            <Text style={styles.title}>Proteção clara em cada etapa</Text>
            <Text style={styles.subtitle}>Orientações rápidas para preparar, acompanhar e responder aos estados do Escolta UNITAU.</Text>
          </View>
        </View>

        <SectionTitle colors={colors} icon="checkmark-done" title="Antes de sair" />
        <View style={styles.card}>
          {BEFORE_LEAVING.map((item, index) => (
            <View key={item} style={[styles.checkRow, index < BEFORE_LEAVING.length - 1 && styles.divider]}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        <SectionTitle colors={colors} icon="pulse" title="Estados da Sentinela" />
        <View style={styles.card}>
          {STATES.map((state, index) => {
            const color = colors[state.colorKey];
            return (
              <View key={state.title} style={[styles.stateRow, index < STATES.length - 1 && styles.divider]}>
                <View style={[styles.stateIcon, { backgroundColor: colorWithAlpha(color, 0.13) }]}>
                  <Ionicons name={state.icon} size={21} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stateTitle}>{state.title}</Text>
                  <Text style={styles.stateText}>{state.text}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <SectionTitle colors={colors} icon="resize" title="Sobre a distância" />
        <View style={styles.cardPadded}>
          <View style={styles.noticeHeader}>
            <Ionicons name="information-circle" size={21} color={colors.primaryBlue} />
            <Text style={styles.noticeTitle}>A distância é estimada</Text>
          </View>
          <Text style={styles.paragraph}>
            O Escolta utiliza a intensidade do sinal Bluetooth para estimar proximidade. Pessoas, paredes, objetos metálicos e o próprio ambiente podem alterar o valor. Use o estado da Sentinela como referência principal e mantenha supervisão ativa.
          </Text>
        </View>

        <SectionTitle colors={colors} icon="alert" title="Durante uma emergência" />
        <View style={[styles.cardPadded, { borderColor: colorWithAlpha(colors.dangerRed, 0.38) }]}>
          <Text style={styles.emergencyLead}>Mantenha a calma e verifique a criança imediatamente.</Text>
          <Text style={styles.paragraph}>A Sentinela continuará procurando o dispositivo. Confirme a segurança somente após localizar a criança e verificar que ela está bem.</Text>
        </View>

        <View style={styles.prototypeBox}>
          <Ionicons name="flask-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.prototypeText}>O Escolta UNITAU é um protótipo acadêmico funcional e uma camada complementar de proteção. Ele não substitui a supervisão de um responsável.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ colors, icon, title }: { colors: AppColors; icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={sectionStyles.row}>
      <Ionicons name={icon} size={17} color={colors.primaryBlue} />
      <Text style={[sectionStyles.text, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 23, marginBottom: 9 },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 1.15 },
});

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 42 },
    intro: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 4 },
    introIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    eyebrow: { color: colors.primaryBlue, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
    title: { color: colors.textPrimary, fontSize: 24, lineHeight: 30, fontWeight: '800' },
    subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
    card: { backgroundColor: colors.cardBg, borderRadius: 17, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
    cardPadded: { backgroundColor: colors.cardBg, borderRadius: 17, borderWidth: 1, borderColor: colors.cardBorder, padding: 17 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    stepNumber: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    stepNumberText: { color: colors.primaryBlue, fontSize: 11, fontWeight: '900' },
    checkText: { flex: 1, color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
    divider: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    stateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, padding: 16 },
    stateIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    stateTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 3 },
    stateText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
    noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
    noticeTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    paragraph: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
    emergencyLead: { color: colors.dangerRed, fontSize: 15, fontWeight: '800', marginBottom: 7 },
    prototypeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 15, marginTop: 22 },
    prototypeText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  });
}
