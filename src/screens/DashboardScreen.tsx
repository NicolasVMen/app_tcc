import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Esp32MonitorState } from '../hooks/useEsp32Monitor';
import { resetarAlarmeBle } from '../services/bleApi';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { AppColors, colorWithAlpha } from '../theme';

type VisualState = 'protected' | 'attention' | 'searching' | 'reconnecting' | 'uncovered' | 'emergency' | 'standby' | 'synchronizing';

type MonitorController = Esp32MonitorState & {
  conectar: () => Promise<void>;
  somCarregado?: boolean;
  reconectando?: boolean;
  aguardandoConfirmacao?: boolean;
  confirmarSeguranca?: () => Promise<void>;
  continuarEmAlerta?: () => void;
  retomarProtecao?: () => Promise<void>;
};

interface VisualCopy {
  title: string;
  childMessage: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function DashboardScreen({ monitor }: { monitor: MonitorController }) {
  const { width } = useWindowDimensions();
  const { colors, preferences } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [childName, setChildName] = useState('A criança');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('@escolta_user_profile').then(raw => {
      if (!raw) return;
      try {
        const profile = JSON.parse(raw);
        if (profile.nomeCrianca?.trim()) setChildName(profile.nomeCrianca.trim());
      } catch {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const visualState: VisualState = monitor.modoPanico
    ? 'emergency'
    : monitor.sincronizandoProtecao
      ? 'synchronizing'
    : monitor.emEspera
      ? 'standby'
    : monitor.segurancaConfirmadaSemVinculo
      ? 'uncovered'
    : monitor.reconectando
      ? 'reconnecting'
      : monitor.conectado && monitor.nivelSinal === 'aviso'
        ? 'attention'
        : monitor.conectado
          ? 'protected'
          : 'searching';

  const copy = useMemo<VisualCopy>(() => {
    switch (visualState) {
      case 'protected': return {
        title: 'PROTEGIDO', childMessage: `${childName} está por perto`,
        description: 'O vínculo está estável.', icon: 'shield-checkmark', color: colors.safeGreen,
      };
      case 'attention': return {
        title: 'ALCANCE REDUZIDO', childMessage: `${childName} pode estar se afastando`,
        description: 'Aproxime-se e observe o ambiente.', icon: 'warning', color: colors.warningYellow,
      };
      case 'reconnecting': return {
        title: 'RECONECTANDO', childMessage: `O vínculo com ${childName} foi interrompido`,
        description: 'A Sentinela está tentando restabelecer a proteção.', icon: 'radio', color: colors.primaryBlue,
      };
      case 'uncovered': return {
        title: 'SEM COBERTURA', childMessage: `${childName} foi confirmada segura`,
        description: 'O dispositivo continua sem vínculo. A Sentinela segue procurando.', icon: 'shield-outline', color: colors.warningYellow,
      };
      case 'emergency': return {
        title: 'EMERGÊNCIA', childMessage: 'Não foi possível restabelecer o vínculo',
        description: `Verifique ${childName} imediatamente.`, icon: 'alert-circle', color: colors.dangerRed,
      };
      case 'standby': return {
        title: 'EM ESPERA', childMessage: 'Monitoramento pausado',
        description: 'A Sentinela não emitirá alertas até você retomar a proteção.', icon: 'pause-circle', color: colors.warningYellow,
      };
      case 'synchronizing': return {
        title: 'SINCRONIZANDO', childMessage: 'Retomando a proteção',
        description: 'Confirmando o monitoramento com o dispositivo Escolta.', icon: 'sync', color: colors.primaryBlue,
      };
      default: return {
        title: monitor.isScanning ? 'PROCURANDO' : 'AGUARDANDO VÍNCULO',
        childMessage: monitor.isScanning ? 'Localizando o Escolta próximo' : 'O dispositivo ainda não está conectado',
        description: monitor.scanError || 'A Sentinela iniciará a busca automaticamente.',
        icon: monitor.isScanning ? 'scan' : 'bluetooth-outline', color: colors.primaryBlue,
      };
    }
  }, [visualState, childName, colors, monitor.isScanning, monitor.scanError]);

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (preferences.reduceMotion) return;
    const duration = visualState === 'emergency' ? 900 : visualState === 'attention' ? 1500 : 2500;
    Animated.loop(Animated.timing(pulse, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    })).start();
    return () => pulse.stopAnimation();
  }, [visualState, preferences.reduceMotion, pulse]);

  const coreSize = Math.max(190, Math.min(260, width * 0.58));
  const distance = !monitor.sincronizandoProtecao && monitor.conectado && monitor.distanciaEstimada != null && Number.isFinite(monitor.distanciaEstimada)
    ? `~${Math.max(1, Math.round(monitor.distanciaEstimada))} m`
    : '—';
  const secondsSinceUpdate = monitor.ultimaAtualizacao
    ? Math.max(0, Math.floor((now - new Date(monitor.ultimaAtualizacao).getTime()) / 1000))
    : null;
  const updatedLabel = formatElapsedUpdate(secondsSinceUpdate);

  const soundReady = monitor.somCarregado !== false;
  const essentialReady = monitor.conectado && soundReady && preferences.autoConnect;
  const notificationsReady = preferences.notificationsEnabled && monitor.notificacoesAutorizadas !== false;
  const hasCoverageWarning = essentialReady && !notificationsReady;

  const readiness = monitor.modoPanico
    ? { label: 'Emergência ativa', color: colors.dangerRed, icon: 'alert-circle' as const }
    : monitor.sincronizandoProtecao
      ? { label: 'Sincronizando proteção', color: colors.primaryBlue, icon: 'sync' as const }
    : monitor.emEspera
      ? { label: 'Monitoramento pausado', color: colors.warningYellow, icon: 'pause-circle' as const }
    : essentialReady && !hasCoverageWarning
      ? { label: 'Sistema pronto', color: colors.safeGreen, icon: 'checkmark-circle' as const }
      : essentialReady
        ? { label: 'Cobertura reduzida', color: colors.warningYellow, icon: 'warning' as const }
        : { label: 'Ação necessária', color: colors.warningYellow, icon: 'construct' as const };

  const handleConfirmSafety = () => {
    Alert.alert(
      `${childName} está segura?`,
      'Confirme somente depois de localizar a criança e verificar que ela está bem.',
      [
        { text: 'Continuar em alerta', style: 'cancel', onPress: monitor.continuarEmAlerta },
        {
          text: 'Sim, está segura',
          onPress: async () => {
            try {
              if (monitor.confirmarSeguranca) await monitor.confirmarSeguranca();
              else await resetarAlarmeBle();
            } catch {
              Alert.alert('Não foi possível confirmar', 'O dispositivo ainda não respondeu. Continue verificando a situação.');
            }
          },
        },
      ]
    );
  };

  const handleResumeProtection = async () => {
    try {
      await monitor.retomarProtecao?.();
    } catch (error) {
      Alert.alert('Não foi possível retomar', error instanceof Error ? error.message : 'Verifique a placa e tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sentinelRow}>
          <View style={[styles.statusDot, { backgroundColor: copy.color }]} />
          <Text style={styles.sentinelText}>
            {monitor.sincronizandoProtecao
              ? 'Sentinela sincronizando'
              : monitor.emEspera
              ? 'Sentinela em espera'
              : monitor.segurancaConfirmadaSemVinculo
              ? 'Sentinela sem cobertura'
              : monitor.reconectando ? 'Sentinela em busca' : monitor.conectado ? 'Sentinela ativa' : 'Sentinela aguardando vínculo'}
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={[styles.coreStage, { width: coreSize, height: coreSize }]}>
            <Animated.View style={[
              styles.pulseRing,
              { borderColor: colorWithAlpha(copy.color, 0.48), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 0] }) },
            ]} />
            <View style={[styles.middleRing, { borderColor: colorWithAlpha(copy.color, 0.3), backgroundColor: colorWithAlpha(copy.color, 0.06) }]} />
            <View style={[styles.core, { backgroundColor: colorWithAlpha(copy.color, 0.15), borderColor: colorWithAlpha(copy.color, 0.7) }]}>
              {monitor.isScanning && visualState === 'searching'
                ? <ActivityIndicator size="large" color={copy.color} />
                : <Ionicons name={copy.icon} size={45} color={copy.color} />}
            </View>
          </View>

          <View style={[styles.stateBadge, { backgroundColor: colorWithAlpha(copy.color, 0.13), borderColor: colorWithAlpha(copy.color, 0.35) }]}>
            <Text style={[styles.stateBadgeText, { color: copy.color }]}>{copy.title}</Text>
          </View>
          <Text style={styles.heroTitle}>{copy.childMessage}</Text>
          <Text style={styles.heroDescription}>{copy.description}</Text>

          <View style={styles.distanceBlock}>
            <Text style={styles.distanceLabel}>DISTÂNCIA ESTIMADA</Text>
            <Text style={styles.distanceValue}>{distance}</Text>
            <Text style={styles.updatedText}>{updatedLabel}</Text>
          </View>

          {!monitor.emEspera && !monitor.conectado && !monitor.isScanning && (
            <TouchableOpacity style={styles.primaryButton} onPress={monitor.conectar} activeOpacity={0.82}>
              <Ionicons name="bluetooth" size={19} color={colors.white} />
              <Text style={styles.primaryButtonText}>PROCURAR AGORA</Text>
            </TouchableOpacity>
          )}

          {monitor.emEspera && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleResumeProtection} disabled={monitor.alterandoEspera} activeOpacity={0.82}>
              {monitor.alterandoEspera
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="play" size={19} color={colors.white} />}
              <Text style={styles.primaryButtonText}>{monitor.alterandoEspera ? 'RETOMANDO…' : 'RETOMAR PROTEÇÃO'}</Text>
            </TouchableOpacity>
          )}

          {monitor.modoPanico && (
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.dangerRed }]} onPress={handleConfirmSafety} activeOpacity={0.82}>
              <Ionicons name="shield-checkmark" size={19} color={colors.white} />
              <Text style={styles.primaryButtonText}>CONFIRMAR SEGURANÇA</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.readinessCard}
          activeOpacity={0.78}
          onPress={() => setDetailsOpen(open => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
        >
          <View style={styles.readinessHeader}>
            <View style={[styles.readinessIcon, { backgroundColor: colorWithAlpha(readiness.color, 0.13) }]}>
              <Ionicons name={readiness.icon} size={22} color={readiness.color} />
            </View>
            <View style={styles.readinessCopy}>
              <Text style={styles.readinessTitle}>{readiness.label}</Text>
              <Text style={styles.readinessSubtitle}>
                {detailsOpen ? 'Toque para recolher os detalhes' : 'Toque para verificar a cobertura'}
              </Text>
            </View>
            <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
          </View>

          {detailsOpen && (
            <View style={styles.details}>
              <StatusDetail colors={colors} neutral={monitor.emEspera} ok={monitor.conectado} icon="bluetooth" title="Vínculo com o Escolta" detail={monitor.emEspera ? 'Pausado intencionalmente' : monitor.conectado ? 'Ativo' : 'Sem conexão'} />
              <StatusDetail colors={colors} neutral={monitor.emEspera} ok={preferences.autoConnect} icon="radio" title="Sentinela" detail={monitor.emEspera ? 'Em espera até retomada explícita' : preferences.autoConnect ? 'Reconexão automática ativa' : 'Desativada por você'} />
              <StatusDetail colors={colors} ok={soundReady} icon="volume-high" title="Sirene do celular" detail={soundReady ? 'Pronta' : 'Indisponível'} />
              <StatusDetail colors={colors} neutral={monitor.emEspera} ok={monitor.conectado} icon="notifications" title="Buzzer do dispositivo" detail={monitor.emEspera ? 'Desarmado pela placa' : monitor.conectado ? 'Respondendo' : 'Não verificado'} />
              <StatusDetail
                colors={colors}
                ok={notificationsReady}
                icon="phone-portrait"
                title="Alertas de emergência"
                detail={!preferences.notificationsEnabled
                  ? 'Desativados por você'
                  : monitor.notificacoesAutorizadas === false ? 'Bloqueados nas configurações do Android' : 'Habilitados'}
              />
              <StatusDetail colors={colors} neutral={!preferences.shareLocation} ok={preferences.shareLocation} icon="location" title="Localização" detail={preferences.shareLocation ? 'Disponível em emergências' : 'Desativada por você'} />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.prototypeNote}>Protótipo acadêmico funcional — Engenharia da Computação UNITAU</Text>
      </ScrollView>
    </View>
  );
}

function formatElapsedUpdate(totalSeconds: number | null) {
  if (totalSeconds == null) return 'Aguardando primeira leitura';
  if (totalSeconds < 2) return 'Atualizado agora';
  if (totalSeconds < 60) return `Atualizado há ${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `Atualizado há ${minutes} min${seconds ? ` ${seconds} s` : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `Atualizado há ${hours} h${remainingMinutes ? ` ${remainingMinutes} min` : ''}`;
}

function StatusDetail({ colors, ok, neutral, icon, title, detail }: {
  colors: AppColors;
  ok: boolean;
  neutral?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}) {
  const color = neutral ? colors.textMuted : ok ? colors.safeGreen : colors.warningYellow;
  return (
    <View style={detailStyles.row}>
      <Ionicons name={icon} size={18} color={color} />
      <View style={detailStyles.copy}>
        <Text style={[detailStyles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[detailStyles.detail, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      <Ionicons name={neutral ? 'remove-circle-outline' : ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={color} />
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  detail: { fontSize: 12, marginTop: 2 },
});

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36 },
    sentinelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 3 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    sentinelText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
    hero: { alignItems: 'center', paddingTop: 3 },
    coreStage: { alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    pulseRing: { position: 'absolute', width: '100%', height: '100%', borderRadius: 999, borderWidth: 1.5 },
    middleRing: { position: 'absolute', width: '76%', height: '76%', borderRadius: 999, borderWidth: 1 },
    core: { width: '48%', height: '48%', borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    stateBadge: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10 },
    stateBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
    heroTitle: { color: colors.textPrimary, fontSize: 22, lineHeight: 28, fontWeight: '800', textAlign: 'center', maxWidth: 350 },
    heroDescription: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 330, marginTop: 5 },
    distanceBlock: { alignItems: 'center', marginTop: 20, marginBottom: 18 },
    distanceLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.25 },
    distanceValue: { color: colors.textPrimary, fontSize: 38, fontWeight: '300', marginTop: 3 },
    updatedText: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
    primaryButton: {
      minHeight: 48, minWidth: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
      paddingHorizontal: 20, borderRadius: 14, backgroundColor: colors.primaryBlue, marginBottom: 18,
    },
    primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
    readinessCard: {
      backgroundColor: colors.cardBg, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder,
      padding: 15, marginTop: 7,
    },
    readinessHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    readinessIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    readinessCopy: { flex: 1 },
    readinessTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    readinessSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    details: { borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: 14, paddingTop: 6 },
    prototypeNote: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 18, letterSpacing: 0.3 },
  });
}
