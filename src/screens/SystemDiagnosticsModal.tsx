import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { useAppPreferences } from '../context/AppPreferencesContext';
import { showDiagnosticNotification } from '../services/notificationService';
import { AppColors, colorWithAlpha } from '../theme';

type CheckStatus = 'approved' | 'warning' | 'informative';

interface DiagnosticCheck {
  id: string;
  title: string;
  detail: string;
  status: CheckStatus;
  essential: boolean;
}

export interface DiagnosticsMonitorSnapshot {
  connected: boolean;
  standby: boolean;
  reconnecting: boolean;
  scanning: boolean;
  soundReady: boolean;
  notificationAuthorized: boolean | null;
  lastUpdate: Date | null;
  signalLevel: string;
}

function SystemDiagnosticsModal({
  visible,
  onClose,
  monitor,
  childName,
  emergencyEmailConfigured,
  onTestLocalAlert,
}: {
  visible: boolean;
  onClose: () => void;
  monitor: DiagnosticsMonitorSnapshot;
  childName: string;
  emergencyEmailConfigured: boolean;
  onTestLocalAlert: () => Promise<void>;
}) {
  const { colors, preferences } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState<'notification' | 'alert' | null>(null);
  const [confirmingAlertTest, setConfirmingAlertTest] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    try {
      const [notificationsPermission, bluetoothPermission, locationPermission] = await Promise.all([
        Notifications.getPermissionsAsync().catch(() => null),
        checkBluetoothPermissions(),
        Location.getForegroundPermissionsAsync().catch(() => null),
      ]);
      const notificationsReady = Boolean(notificationsPermission?.granted && preferences.notificationsEnabled);

      const deviceCheck: DiagnosticCheck = monitor.standby
        ? {
          id: 'device', title: 'Dispositivo Escolta', detail: 'Em espera por escolha do responsável.',
          status: 'informative', essential: false,
        }
        : monitor.connected
          ? {
            id: 'device', title: 'Dispositivo Escolta', detail: 'Conectado e enviando telemetria.',
            status: 'approved', essential: true,
          }
          : {
            id: 'device', title: 'Dispositivo Escolta',
            detail: monitor.reconnecting || monitor.scanning ? 'Conexão em andamento.' : 'Sem vínculo no momento.',
            status: 'warning', essential: true,
          };

      const nextChecks: DiagnosticCheck[] = [
        deviceCheck,
        {
          id: 'bluetooth', title: 'Permissões de Bluetooth',
          detail: bluetoothPermission ? 'Concedidas para localizar e conectar à placa.' : 'Uma ou mais permissões estão bloqueadas.',
          status: bluetoothPermission ? 'approved' : 'warning', essential: true,
        },
        {
          id: 'notifications', title: 'Notificações do Android',
          detail: !preferences.notificationsEnabled
            ? 'Desativadas nas preferências do Escolta.'
            : notificationsPermission?.granted ? 'Autorizadas para avisos e tela bloqueada.' : 'Bloqueadas nas configurações do celular.',
          status: notificationsReady ? 'approved' : 'warning', essential: true,
        },
        {
          id: 'automatic', title: 'Reconexão automática',
          detail: preferences.autoConnect ? 'Ativa para recuperar o vínculo automaticamente.' : 'Desativada pelo responsável.',
          status: preferences.autoConnect ? 'approved' : 'warning', essential: true,
        },
        {
          id: 'siren', title: 'Sirene do celular',
          detail: monitor.soundReady ? 'Arquivo de alerta carregado e pronto para teste.' : 'O áudio de emergência não foi carregado.',
          status: monitor.soundReady ? 'approved' : 'warning', essential: true,
        },
        {
          id: 'vibration', title: 'Vibração de emergência',
          detail: preferences.vibrationEnabled ? 'Ativa para reforçar os alertas críticos.' : 'Desativada pelo responsável.',
          status: preferences.vibrationEnabled ? 'approved' : 'warning', essential: true,
        },
        {
          id: 'child', title: 'Identificação da criança',
          detail: childName.trim() ? `Nome configurado no protocolo: ${childName.trim()}.` : 'Informe o nome da criança em Sistema.',
          status: childName.trim() ? 'approved' : 'warning', essential: true,
        },
        {
          id: 'location', title: 'Localização deste celular',
          detail: !preferences.shareLocation
            ? 'Compartilhamento desativado por escolha do responsável.'
            : locationPermission?.granted ? 'Autorizada para o início de emergências.' : 'Opção ativa, mas permissão não concedida.',
          status: !preferences.shareLocation ? 'informative' : locationPermission?.granted ? 'approved' : 'warning',
          essential: false,
        },
        {
          id: 'external', title: 'Canal externo experimental',
          detail: emergencyEmailConfigured ? 'E-mail de ensaio configurado.' : 'Não configurado; o alarme local permanece independente.',
          status: emergencyEmailConfigured ? 'approved' : 'informative', essential: false,
        },
        {
          id: 'battery', title: 'Bateria e segundo plano',
          detail: Platform.OS === 'android'
            ? 'Exige revisão manual para confirmar que o Android não restringe o Escolta.'
            : 'Revise as permissões de execução em segundo plano do sistema.',
          status: 'informative', essential: false,
        },
      ];
      setChecks(nextChecks);
      setLastRun(new Date());
      return nextChecks;
    } finally {
      setRunning(false);
    }
  }, [
    childName,
    emergencyEmailConfigured,
    monitor.connected,
    monitor.reconnecting,
    monitor.scanning,
    monitor.soundReady,
    monitor.standby,
    preferences,
  ]);

  useEffect(() => {
    if (visible) runDiagnostics();
    // A verificação automática ocorre somente ao abrir. Atualizações frequentes
    // de telemetria não devem reconstruir a lista enquanto o usuário rola a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const essentialChecks = checks.filter(check => check.essential);
  const approvedEssentials = essentialChecks.filter(check => check.status === 'approved').length;
  const allEssentialApproved = essentialChecks.length > 0 && approvedEssentials === essentialChecks.length;

  const testNotification = async () => {
    setTesting('notification');
    try {
      await showDiagnosticNotification();
      Alert.alert('Notificação enviada', 'Confirme se o aviso de teste apareceu no topo da tela e na central de notificações.');
      await runDiagnostics();
    } catch (error) {
      Alert.alert('Teste não concluído', error instanceof Error ? error.message : 'Não foi possível exibir a notificação.');
    } finally {
      setTesting(null);
    }
  };

  const runAlertTest = async () => {
    setConfirmingAlertTest(false);
    setTesting('alert');
    try {
      await onTestLocalAlert();
      Alert.alert('Teste concluído', 'A sirene local foi executada. Confirme se som e vibração foram percebidos.');
    } catch (error) {
      Alert.alert('Teste não concluído', error instanceof Error ? error.message : 'Não foi possível testar o alerta local.');
    } finally {
      setTesting(null);
    }
  };

  const openBatterySettings = () => {
    Alert.alert(
      'Confiabilidade em segundo plano',
      'No Samsung, procure o Escolta UNITAU em Bateria e selecione “Sem restrições”. Mantenha notificações e Bluetooth permitidos. Essa configuração ajuda o Android a não suspender a Sentinela.',
      [
        { text: 'Agora não', style: 'cancel' },
        {
          text: 'Abrir ajustes',
          onPress: async () => {
            if (Platform.OS === 'android') {
              await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => Linking.openSettings());
            } else await Linking.openSettings();
          },
        },
      ]
    );
  };

  const shareReport = async () => {
    const checksForReport = checks.length ? checks : await runDiagnostics();
    const reportChecks = (checksForReport || []).map(check => {
      const label = check.status === 'approved' ? 'APROVADO' : check.status === 'warning' ? 'ATENÇÃO' : 'INFORMATIVO';
      return `[${label}] ${check.title}: ${check.detail}`;
    }).join('\n');
    const model = Platform.OS === 'android'
      ? String((Platform.constants as { Model?: string }).Model || 'Android')
      : 'iPhone/iPad';
    const report = [
      'RELATÓRIO DE PRONTIDÃO — ESCOLTA UNITAU',
      'Protótipo acadêmico funcional',
      '',
      `Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })}`,
      'Aplicativo: 1.0.0',
      `Dispositivo móvel: ${model}`,
      `Sistema: ${Platform.OS} ${Platform.Version}`,
      `Resultado essencial: ${approvedEssentials}/${essentialChecks.length} verificações aprovadas`,
      `Última telemetria: ${formatDate(monitor.lastUpdate)}`,
      `Estado do sinal: ${monitor.signalLevel}`,
      '',
      reportChecks,
      '',
      'Este relatório registra condições observáveis pelo aplicativo e não constitui certificação de segurança.',
    ].join('\n');
    await Share.share({ title: 'Relatório de prontidão — Escolta UNITAU', message: report });
  };

  if (!visible) return null;

  return (
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CONFIABILIDADE DO PROTÓTIPO</Text>
            <Text style={styles.title}>Verificação de prontidão</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Fechar diagnóstico">
            <Ionicons name="close" size={23} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          directionalLockEnabled
          scrollEnabled
        >
          <View style={[styles.summary, { borderColor: colorWithAlpha(allEssentialApproved ? colors.safeGreen : colors.warningYellow, 0.35) }]}>
            <View style={[styles.scoreCircle, { backgroundColor: colorWithAlpha(allEssentialApproved ? colors.safeGreen : colors.warningYellow, 0.14) }]}>
              {running
                ? <ActivityIndicator color={colors.primaryBlue} />
                : <Text style={[styles.score, { color: allEssentialApproved ? colors.safeGreen : colors.warningYellow }]}>{approvedEssentials}/{essentialChecks.length || '—'}</Text>}
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>{allEssentialApproved ? 'Verificações essenciais aprovadas' : 'Existem pontos que merecem atenção'}</Text>
              <Text style={styles.summaryDetail}>O resultado representa o estado atual do protótipo e pode mudar conforme permissões, conexão e bateria.</Text>
              {lastRun && <Text style={styles.lastRun}>Verificado às {lastRun.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>}
            </View>
          </View>

          <Text style={styles.sectionTitle}>VERIFICAÇÕES</Text>
          <View style={styles.card}>
            {checks.map((check, index) => (
              <React.Fragment key={check.id}>
                {index > 0 && <View style={styles.separator} />}
                <DiagnosticRow check={check} colors={colors} styles={styles} />
              </React.Fragment>
            ))}
          </View>

          <Text style={styles.sectionTitle}>TESTES CONTROLADOS</Text>
          <View style={styles.actionGrid}>
            <ActionButton
              colors={colors} styles={styles} icon="notifications-outline" title="Testar notificação"
              detail="Valida o aviso visual, sem emergência." loading={testing === 'notification'} onPress={testNotification}
            />
            <ActionButton
              colors={colors} styles={styles} icon="volume-high-outline" title="Testar sirene"
              detail="Som e vibração por 2,5 segundos." loading={testing === 'alert'} onPress={() => setConfirmingAlertTest(true)}
            />
          </View>

          {confirmingAlertTest && (
            <View style={styles.testConfirmation}>
              <View style={styles.testConfirmationHeader}>
                <Ionicons name="volume-high" size={21} color={colors.warningYellow} />
                <Text style={styles.testConfirmationTitle}>Teste audível controlado</Text>
              </View>
              <Text style={styles.testConfirmationText}>O celular tocará e, se habilitada, vibrará por aproximadamente 2,5 segundos. Nenhuma emergência ou e-mail será gerado.</Text>
              <View style={styles.testConfirmationActions}>
                <TouchableOpacity style={styles.testCancelButton} onPress={() => setConfirmingAlertTest(false)}>
                  <Text style={styles.testCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.testStartButton} onPress={runAlertTest}>
                  <Text style={styles.testStartText}>Iniciar teste</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>CONFIABILIDADE E REGISTRO</Text>
          <View style={styles.card}>
            <SimpleActionRow colors={colors} styles={styles} icon="battery-charging-outline" title="Revisar bateria e segundo plano" detail="Abra os ajustes e remova restrições do Android." onPress={openBatterySettings} />
            <View style={styles.separator} />
            <SimpleActionRow colors={colors} styles={styles} icon="document-text-outline" title="Compartilhar relatório técnico" detail="Gera um resumo legível das verificações atuais." onPress={shareReport} />
            <View style={styles.separator} />
            <SimpleActionRow colors={colors} styles={styles} icon="refresh" title="Executar novamente" detail="Atualiza permissões, conexão e prontidão." onPress={runDiagnostics} />
          </View>

          <View style={styles.prototypeNotice}>
            <Ionicons name="flask-outline" size={18} color={colors.primaryBlue} />
            <Text style={styles.prototypeText}>Ferramenta de apoio ao protótipo acadêmico. Ela verifica condições observáveis, mas não substitui ensaios controlados nem representa certificação.</Text>
          </View>
        </ScrollView>
      </View>
  );
}

export default React.memo(SystemDiagnosticsModal, (previous, next) => (
  previous.visible === next.visible
  && previous.childName === next.childName
  && previous.emergencyEmailConfigured === next.emergencyEmailConfigured
  && previous.monitor.connected === next.monitor.connected
  && previous.monitor.standby === next.monitor.standby
  && previous.monitor.reconnecting === next.monitor.reconnecting
  && previous.monitor.scanning === next.monitor.scanning
  && previous.monitor.soundReady === next.monitor.soundReady
  && previous.monitor.notificationAuthorized === next.monitor.notificationAuthorized
));

async function checkBluetoothPermissions() {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 31) {
    const [scan, connect] = await Promise.all([
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
    ]);
    return scan && connect;
  }
  if (Platform.Version >= 23) {
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  }
  return true;
}

function formatDate(date: Date | null) {
  if (!date) return 'Ainda não recebida';
  return new Date(date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
}

function DiagnosticRow({ check, colors, styles }: { check: DiagnosticCheck; colors: AppColors; styles: ReturnType<typeof createStyles> }) {
  const color = check.status === 'approved' ? colors.safeGreen : check.status === 'warning' ? colors.warningYellow : colors.primaryBlue;
  const icon = check.status === 'approved' ? 'checkmark-circle' : check.status === 'warning' ? 'alert-circle' : 'information-circle';
  return (
    <View style={styles.checkRow}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={styles.checkCopy}>
        <Text style={styles.checkTitle}>{check.title}</Text>
        <Text style={styles.checkDetail}>{check.detail}</Text>
      </View>
      <Text style={[styles.checkLabel, { color }]}>{check.status === 'approved' ? 'OK' : check.status === 'warning' ? 'ATENÇÃO' : 'INFO'}</Text>
    </View>
  );
}

function ActionButton({ colors, styles, icon, title, detail, loading, onPress }: {
  colors: AppColors; styles: ReturnType<typeof createStyles>; icon: keyof typeof Ionicons.glyphMap;
  title: string; detail: string; loading: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} disabled={loading} activeOpacity={0.75}>
      <View style={styles.actionIcon}>{loading ? <ActivityIndicator color={colors.primaryBlue} /> : <Ionicons name={icon} size={23} color={colors.primaryBlue} />}</View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
    </TouchableOpacity>
  );
}

function SimpleActionRow({ colors, styles, icon, title, detail, onPress }: {
  colors: AppColors; styles: ReturnType<typeof createStyles>; icon: keyof typeof Ionicons.glyphMap;
  title: string; detail: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.simpleRow} onPress={onPress} activeOpacity={0.72}>
      <View style={styles.simpleIcon}><Ionicons name={icon} size={20} color={colors.primaryBlue} /></View>
      <View style={styles.checkCopy}><Text style={styles.checkTitle}>{title}</Text><Text style={styles.checkDetail}>{detail}</Text></View>
      <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, minHeight: 0, backgroundColor: colors.background },
    scroll: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    headerCopy: { flex: 1 },
    eyebrow: { color: colors.primaryBlue, fontSize: 9, fontWeight: '900', letterSpacing: 1.15 },
    title: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 3 },
    closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder },
    content: { padding: 18, paddingBottom: 42 },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, backgroundColor: colors.cardBg },
    scoreCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
    score: { fontSize: 20, fontWeight: '900' },
    summaryCopy: { flex: 1 },
    summaryTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    summaryDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
    lastRun: { color: colors.textMuted, fontSize: 10, marginTop: 6 },
    sectionTitle: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginTop: 24, marginBottom: 9 },
    card: { backgroundColor: colors.cardBg, borderRadius: 17, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
    separator: { height: 1, backgroundColor: colors.cardBorder, marginLeft: 56 },
    checkRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 11 },
    checkCopy: { flex: 1 },
    checkTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
    checkDetail: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 3 },
    checkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.45 },
    actionGrid: { flexDirection: 'row', gap: 10 },
    actionButton: { flex: 1, minHeight: 148, padding: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg },
    actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginBottom: 12 },
    actionTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
    actionDetail: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 4 },
    testConfirmation: { marginTop: 11, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: colorWithAlpha(colors.warningYellow, 0.35), backgroundColor: colors.warningSoft },
    testConfirmationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    testConfirmationTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
    testConfirmationText: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 7 },
    testConfirmationActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
    testCancelButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg },
    testCancelText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
    testStartButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.primaryBlue },
    testStartText: { color: colors.white, fontSize: 12, fontWeight: '900' },
    simpleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 70, paddingHorizontal: 14, paddingVertical: 10 },
    simpleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    prototypeNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 22, padding: 14, borderRadius: 14, backgroundColor: colors.primarySoft },
    prototypeText: { flex: 1, color: colors.textSecondary, fontSize: 11, lineHeight: 17 },
  });
}
