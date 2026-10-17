import React, { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  RSSI_WATCHDOG_EXPERIMENT_AVAILABLE,
  cancelRssiWatchdogExperiment,
  getRssiWatchdogExperiment,
  startRssiWatchdogExperiment,
} from '../services/bleApi';
import type { AppColors } from '../theme';

/** Somente desenvolvimento + pacote Teste. Não inicia ao montar, abrir ou retomar. */
export default function RssiWatchdogExperimentPanel({ colors }: { colors: AppColors }) {
  const [snapshot, setSnapshot] = useState(getRssiWatchdogExperiment);
  useEffect(() => {
    if (!RSSI_WATCHDOG_EXPERIMENT_AVAILABLE) return;
    const timer = setInterval(() => setSnapshot(getRssiWatchdogExperiment()), 500);
    return () => clearInterval(timer);
  }, []);
  if (!RSSI_WATCHDOG_EXPERIMENT_AVAILABLE) return null;

  const start = () => Alert.alert(
    'Simular falha de leituras?',
    'Somente entre adultos, sem criança. Primeiro retome a proteção e deixe os dispositivos próximos e protegidos. O envio de RSSI será suspenso por 15 segundos; o vínculo e as notificações da placa continuam. O watchdog deve causar emergência real, com som e possíveis e-mails conforme suas preferências. O envio volta automaticamente, mas o alerta exige confirmação de segurança. Não bloqueie a tela nem recarregue o app durante este ensaio.',
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Iniciar simulação', onPress: () => {
      try { startRssiWatchdogExperiment(); setSnapshot(getRssiWatchdogExperiment()); }
      catch (error) { Alert.alert('Simulação não iniciada', error instanceof Error ? error.message : 'Verifique a conexão.'); }
    } }],
  );

  const share = async () => {
    const result = getRssiWatchdogExperiment();
    if (!result) return;
    try {
      await Share.share({ title: 'Diagnóstico W1', message: [
        'ESCOLTA TESTE — injeção controlada W1',
        `Data da consulta: ${new Date().toISOString()}`,
        'Envio RSSI suspenso por até 15 s; recuperação RSSI adiada por até 18 s.',
        `Ensaio ainda ativo: ${result.active}`,
        `Notificações válidas recebidas durante a janela: ${result.notifications}`,
        `Primeiro pânico informado pela placa após: ${result.panicAfterMs === null ? 'não observado' : `${result.panicAfterMs} ms`}`,
        `Escrita RSSI retomada na janela: ${result.resumed}`,
        `Interrupção: ${result.interrupted ?? 'nenhuma registrada'}`,
        'Registro de diagnóstico, não aprovação automática de som, recuperação ou segurança.',
      ].join('\n') });
    } catch (error) {
      Alert.alert('Não foi possível compartilhar', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  return <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
    <Text style={[styles.title, { color: colors.textPrimary }]}>Simulação W1 — só desenvolvimento</Text>
    <Text style={[styles.text, { color: colors.textSecondary }]}>Suspende apenas o envio de RSSI por 15 s. Produz emergência real; não é o teste de sirene de 2,5 s. Indisponível no APK final.</Text>
    {snapshot && <>
      <Text style={[styles.text, { color: colors.textPrimary }]} accessibilityLiveRegion="polite">
        {snapshot.interrupted ?? (snapshot.paused ? `Envio suspenso: ${snapshot.remainingSeconds} s restantes.` : snapshot.active ? 'Envio liberado; aguardando recuperação.' : 'Janela encerrada.')}
      </Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>Status recebidos: {snapshot.notifications}. Pânico da placa: {snapshot.panicAfterMs === null ? 'ainda não observado' : `${(snapshot.panicAfterMs / 1000).toFixed(1)} s`}. Escrita retomada: {snapshot.resumed ? 'sim' : 'ainda não registrada'}.</Text>
    </>}
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primaryBlue, opacity: snapshot?.active ? 0.5 : 1 }]}
      disabled={snapshot?.active === true} onPress={start} accessibilityRole="button">
      <Text style={[styles.buttonText, { color: colors.white }]}>SIMULAR FALTA DE RSSI — 15 S</Text>
    </TouchableOpacity>
    {snapshot?.active && <TouchableOpacity style={styles.secondary} accessibilityRole="button" onPress={() => {
      cancelRssiWatchdogExperiment(); setSnapshot(getRssiWatchdogExperiment());
    }}><Text style={{ color: colors.primaryBlue }}>Interromper simulação e liberar leituras</Text></TouchableOpacity>}
    {snapshot && !snapshot.active && <TouchableOpacity style={styles.secondary} accessibilityRole="button" onPress={share}>
      <Text style={{ color: colors.primaryBlue }}>Compartilhar diagnóstico W1</Text>
    </TouchableOpacity>}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 14, padding: 14, borderWidth: 1, borderRadius: 16 },
  title: { fontSize: 13, fontWeight: '800' },
  text: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  button: { marginTop: 14, padding: 13, alignItems: 'center', borderRadius: 11 },
  buttonText: { fontSize: 12, fontWeight: '800' },
  secondary: { minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
});
