import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function ManualScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Manual do Usuário</Text>
          <Text style={styles.headerSubtitle}>Tudo sobre como o Escolta funciona</Text>
        </View>

        {/* COMO FUNCIONA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBg}>
              <Ionicons name="bluetooth" size={20} color={COLORS.primaryBlue} />
            </View>
            <Text style={styles.cardTitle}>Como Funciona</Text>
          </View>
          <Text style={styles.cardText}>
            O dispositivo vestível (pulseira ou broche) é colocado na criança e se conecta ao celular do responsável via Bluetooth Low Energy (BLE). O aplicativo mede a força do sinal (RSSI) em tempo real para estimar a distância física entre o celular e a criança.
          </Text>
        </View>

        {/* OS 3 ESTADOS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBg}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primaryBlue} />
            </View>
            <Text style={styles.cardTitle}>Níveis de Segurança</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.safeGreen }]} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusName}>SEGURO (Verde)</Text>
              <Text style={styles.statusDesc}>
                Sinal forte (acima de -70 dBm). A criança está por perto. Nenhum alerta é emitido.
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.warningYellow }]} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusName}>ATENÇÃO (Amarelo)</Text>
              <Text style={styles.statusDesc}>
                Sinal médio (entre -70 e -85 dBm). A criança está se afastando. O celular vibra duas vezes para avisar. O dispositivo emite bipes lentos.
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.dangerRed }]} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusName}>PÂNICO (Vermelho)</Text>
              <Text style={styles.statusDesc}>
                Sinal fraco (abaixo de -85 dBm) ou desconexão total. Sirene no volume máximo + vibração contínua no celular até a criança voltar para perto.
              </Text>
            </View>
          </View>
        </View>

        {/* FUNCIONALIDADES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBg}>
              <Ionicons name="apps" size={20} color={COLORS.primaryBlue} />
            </View>
            <Text style={styles.cardTitle}>Funcionalidades do App</Text>
          </View>

          {[
            { icon: 'grid', title: 'Início', desc: 'Tela principal com radar de proximidade, métricas de distância e controle do alarme.' },
            { icon: 'notifications', title: 'Alertas', desc: 'Histórico completo de todos os eventos. Os alertas ficam salvos mesmo fechando o app. Você pode exportar via WhatsApp.' },
            { icon: 'settings', title: 'Ajustes', desc: 'Perfil do responsável, nome da criança, botões de emergência (190/192) e configurações gerais.' },
            { icon: 'flask', title: 'Laboratório', desc: 'Ferramenta de coleta de dados RSSI para o TCC. Acessível apenas pela aba de Ajustes.' },
          ].map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={item.icon as any} size={18} color={COLORS.primaryBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* DICAS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: COLORS.warningYellow + '20' }]}>
              <Ionicons name="bulb" size={20} color={COLORS.warningYellow} />
            </View>
            <Text style={styles.cardTitle}>Dicas Importantes</Text>
          </View>
          {[
            'Deixe o volume de mídia do celular no MÁXIMO.',
            'Prenda o dispositivo no pulso ou mochila da criança.',
            'Mantenha o Bluetooth ativo durante todo o passeio.',
            'Verifique a bateria do dispositivo antes de sair.',
            'O app tenta reconectar automaticamente se perder o sinal.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* LIMITAÇÕES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: COLORS.dangerRed + '20' }]}>
              <Ionicons name="alert-circle" size={20} color={COLORS.dangerRed} />
            </View>
            <Text style={styles.cardTitle}>Limitações</Text>
          </View>
          <Text style={styles.cardText}>
            A precisão da distância pode variar conforme barreiras físicas (paredes, pessoas, objetos metálicos). O dispositivo é uma camada de proteção complementar e não substitui a supervisão humana ativa. Os dados do login são protegidos por criptografia via Firebase Authentication.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  iconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryBlue + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  cardText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  statusRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, gap: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  statusTextContainer: { flex: 1 },
  statusName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  statusDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.primaryBlue + '15',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  featureDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  tipNumber: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primaryBlue + '25',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  tipNumberText: { fontSize: 11, fontWeight: '800', color: COLORS.primaryBlue },
  tipText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
});
