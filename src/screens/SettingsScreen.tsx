import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage, { subscribeAccountStorage } from '../services/accountStorage';
import { signOut } from 'firebase/auth';

import { auth } from '../services/firebaseConfig';
import { AppPreferences, useAppPreferences } from '../context/AppPreferencesContext';
import { AppColors, colorWithAlpha, ThemeMode } from '../theme';
import { isValidEmail, normalizeEmail } from '../utils/authValidation';
import { canSendEmergencyEmail, sendExperimentalEmail } from '../services/emergencyEmail';
import { clearGoogleCredentialState } from '../services/googleAuth';
import { APP_DISPLAY_NAME, INTERNAL_TOOLS_ENABLED } from '../services/nativeIdentity';
import SystemDiagnosticsModal, { DiagnosticsMonitorSnapshot } from './SystemDiagnosticsModal';

interface UserProfile {
  nomeResponsavel: string;
  nomeCrianca: string;
  emailEmergencia?: string;
  emailAlertsEnabled?: boolean;
  [key: string]: unknown;
}

const EMPTY_PROFILE: UserProfile = {
  nomeResponsavel: '',
  nomeCrianca: '',
  emailEmergencia: '',
  emailAlertsEnabled: false,
};

export default function SettingsScreen({
  onProfileUpdated,
  onBeforeLogout,
  onForceLogout,
  deviceStandby,
  deviceConnected,
  changingStandby,
  onPauseMonitoring,
  onResumeMonitoring,
  diagnosticsMonitor,
  onTestLocalAlert,
  onOpenProximityTrial,
}: {
  onProfileUpdated?: (profile: UserProfile) => void;
  onBeforeLogout?: () => Promise<void>;
  onForceLogout?: () => Promise<void>;
  deviceStandby: boolean;
  deviceConnected: boolean;
  changingStandby: boolean;
  onPauseMonitoring: () => Promise<void>;
  onResumeMonitoring: () => Promise<void>;
  diagnosticsMonitor: DiagnosticsMonitorSnapshot;
  onTestLocalAlert: () => Promise<void>;
  onOpenProximityTrial: () => void;
}) {
  const { colors, preferences, setPreference, resetPreferences } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingChild, setEditingChild] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [childInput, setChildInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestStatus, setEmailTestStatus] = useState('');
  const emailTestBusy = useRef(false);
  const [versionTaps, setVersionTaps] = useState(0);
  const [showAcademic, setShowAcademic] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@escolta_user_profile');
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized: UserProfile = { ...EMPTY_PROFILE, ...parsed,
          nomeResponsavel: typeof parsed?.nomeResponsavel === 'string' ? parsed.nomeResponsavel : '',
          nomeCrianca: typeof parsed?.nomeCrianca === 'string' ? parsed.nomeCrianca : '',
          emailEmergencia: typeof parsed?.emailEmergencia === 'string' ? parsed.emailEmergencia : '',
          emailAlertsEnabled: parsed?.emailAlertsEnabled === true,
        };
        setProfile(normalized);
        setNameInput(normalized.nomeResponsavel || '');
        setChildInput(normalized.nomeCrianca || '');
        setEmailInput(normalized.emailEmergencia || '');
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
    return subscribeAccountStorage((key) => { if (key === '@escolta_user_profile') loadProfile(); });
  }, [loadProfile]);

  useEffect(() => {
    if (!showDiagnostics) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowDiagnostics(false);
      return true;
    });
    return () => subscription.remove();
  }, [showDiagnostics]);

  const persistProfile = async (changes: Partial<UserProfile>) => {
    setSaving(true);
    try {
      const next = { ...profile, ...changes };
      await AsyncStorage.setItem('@escolta_user_profile', JSON.stringify(next));
      setProfile(next);
      onProfileUpdated?.(next);
      return true;
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente novamente em alguns instantes.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Nome necessário', 'Informe como o responsável deve ser identificado.');
      return;
    }
    if (await persistProfile({ nomeResponsavel: nameInput.trim() })) setEditingProfile(false);
  };

  const saveChild = async () => {
    if (!childInput.trim()) {
      Alert.alert('Nome necessário', 'Informe o nome da criança monitorada.');
      return;
    }
    if (await persistProfile({ nomeCrianca: childInput.trim() })) setEditingChild(false);
  };

  const saveContact = async () => {
    const address = normalizeEmail(emailInput);
    if (address && !isValidEmail(address)) {
      Alert.alert('Confira o e-mail', 'Informe um endereço válido ou deixe em branco para remover.');
      return;
    }
    const changed = address !== normalizeEmail(profile.emailEmergencia || '');
    if (await persistProfile({ emailEmergencia: address,
      emailAlertsEnabled: changed || !address ? false : profile.emailAlertsEnabled === true })) {
      setEditingContact(false);
      if (changed) setEmailTestStatus('');
    }
  };

  const toggleEmailAlerts = (enabled: boolean) => {
    if (saving || testingEmail) return;
    if (!enabled) { void persistProfile({ emailAlertsEnabled: false }); return; }
    if (!isValidEmail(normalizeEmail(profile.emailEmergencia || ''))) {
      Alert.alert('Cadastre o contato', 'Salve um e-mail válido antes de ativar os avisos.');
      return;
    }
    Alert.alert('Ativar avisos por e-mail?',
      `Confirme que ${profile.emailEmergencia} é um contato que autorizou o recebimento. Durante um alerta, o nome cadastrado da criança e o motivo poderão ser enviados. A localização deste celular só será incluída se você a ativar. O envio exige internet e não garante entrega.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ativar', onPress: () => { void persistProfile({ emailAlertsEnabled: true }); } },
      ]);
  };

  const testEmail = () => {
    if (!INTERNAL_TOOLS_ENABLED) return;
    if (saving || emailTestBusy.current || editingContact) return;
    const address = profile.emailEmergencia || '';
    if (!isValidEmail(normalizeEmail(address))) {
      Alert.alert('Cadastre o contato', 'Salve um e-mail válido antes do teste.');
      return;
    }
    Alert.alert('Enviar e-mail de teste?', `Uma mensagem sem dados de localização ou da criança será enviada para ${address}. Peça ao contato para verificar também o spam.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar teste', onPress: async () => {
        if (emailTestBusy.current) return;
        emailTestBusy.current = true;
        setTestingEmail(true);
        try {
          await sendExperimentalEmail({ recipient: address, childName: 'Teste',
            message: 'TESTE — Escolta UNITAU. Esta mensagem é somente uma verificação do canal de e-mail, não um alerta real. Confirme o recebimento com quem solicitou o teste.' });
          setEmailTestStatus('O serviço aceitou o teste. Confirme o recebimento com o contato.');
          Alert.alert('Teste aceito pelo serviço', 'Isso não confirma entrega. Peça ao contato para conferir a caixa de entrada e o spam.');
        } catch {
          setEmailTestStatus('O envio do teste não foi confirmado. O alarme local não depende deste canal.');
          Alert.alert('Envio não confirmado', 'Verifique a internet e a configuração do serviço de e-mail. O alarme local permanece independente.');
        } finally { emailTestBusy.current = false; setTestingEmail(false); }
      } },
    ]);
  };

  const confirmCriticalToggle = <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K],
    title: string,
    message: string
  ) => {
    if (value !== false) {
      setPreference(key, value);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Manter ativa', style: 'cancel' },
      { text: 'Desativar', style: 'destructive', onPress: () => setPreference(key, value) },
    ]);
  };

  const handleLocationToggle = (value: boolean) => {
    if (!value) {
      setPreference('shareLocation', false);
      return;
    }
    Alert.alert(
      'Compartilhar localização deste celular?',
      'Somente durante uma emergência, os contatos autorizados poderão receber a posição deste celular. Essa não é a localização exata da criança.',
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Ativar', onPress: () => setPreference('shareLocation', true) },
      ]
    );
  };

  const forceLogout = async (): Promise<void> => {
    try {
      await onForceLogout?.();
      await signOut(auth);
      await clearGoogleCredentialState().catch(() => {});
    } catch {
      Alert.alert('Falha ao sair', 'Não foi possível encerrar a sessão. Tente novamente.');
    }
  };

  const finishLogout = async (): Promise<void> => {
    try {
      await onBeforeLogout?.();
      await signOut(auth);
      await clearGoogleCredentialState().catch(() => {});
    } catch (error) {
      Alert.alert(
        'Placa não confirmou o modo de espera',
        error instanceof Error ? error.message : 'Não foi possível confirmar que o buzzer foi desarmado.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Tentar novamente', onPress: finishLogout },
          { text: 'Sair mesmo assim', style: 'destructive', onPress: forceLogout },
        ]
      );
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair e encerrar a Sentinela?', 'A conexão com o dispositivo, os alarmes e o monitoramento em segundo plano serão interrompidos.', [
      { text: 'Permanecer', style: 'cancel' },
      {
        text: 'Sair e encerrar',
        style: 'destructive',
        onPress: finishLogout,
      },
    ]);
  };

  const handleMonitoringMode = () => {
    if (changingStandby) return;
    if (deviceStandby) {
      Alert.alert(
        'Retomar proteção?',
        'O aplicativo reconectará à placa e só indicará proteção ativa depois da confirmação do dispositivo.',
        [
          { text: 'Agora não', style: 'cancel' },
          {
            text: 'Retomar proteção',
            onPress: async () => {
              try {
                await onResumeMonitoring();
              } catch (error) {
                Alert.alert('Não foi possível retomar', error instanceof Error ? error.message : 'Verifique a placa e tente novamente.');
              }
            },
          },
        ]
      );
      return;
    }
    Alert.alert(
      'Colocar a Sentinela em espera?',
      'A placa será desarmada e o monitoramento será interrompido intencionalmente. Nenhum alerta será emitido até você retomar a proteção.',
      [
        { text: 'Manter proteção', style: 'cancel' },
        {
          text: 'Colocar em espera',
          style: 'destructive',
          onPress: async () => {
            try {
              await onPauseMonitoring();
            } catch (error) {
              Alert.alert('Modo de espera não confirmado', error instanceof Error ? error.message : 'A placa não respondeu. A proteção não foi interrompida.');
            }
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert('Restaurar preferências?', 'Tema, notificações e opções da Sentinela voltarão aos valores recomendados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restaurar', style: 'destructive', onPress: resetPreferences },
    ]);
  };

  const handleVersionTap = () => {
    if (!INTERNAL_TOOLS_ENABLED) return;
    const next = versionTaps + 1;
    if (next >= 5) {
      setShowAcademic(true);
      setVersionTaps(0);
      Alert.alert('Área acadêmica habilitada', 'As informações técnicas do protótipo estão disponíveis abaixo.');
    } else setVersionTaps(next);
  };

  const callEmergency = (number: string, label: string) => {
    Alert.alert(`Ligar para ${label}?`, `O discador será aberto com o número ${number}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: `Ligar ${number}`, style: 'destructive', onPress: () => Linking.openURL(`tel:${number}`) },
    ]);
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primaryBlue} /></View>;
  }

  if (INTERNAL_TOOLS_ENABLED && showDiagnostics) {
    return (
      <SystemDiagnosticsModal
        visible
        onClose={() => setShowDiagnostics(false)}
        monitor={diagnosticsMonitor}
        childName={profile.nomeCrianca || ''}
        emergencyEmailConfigured={Boolean(profile.emailEmergencia?.trim())}
        onTestLocalAlert={onTestLocalAlert}
      />
    );
  }

  const initials = getInitials(profile.nomeResponsavel);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PREFERÊNCIAS E MONITORAMENTO</Text>
          <Text style={styles.title}>Sistema</Text>
          <Text style={styles.subtitle}>Personalize a experiência sem perder de vista o impacto de cada escolha.</Text>
        </View>

        <SectionTitle colors={colors} title="Perfil" />
        <View style={styles.card}>
          {editingProfile ? (
            <InlineEditor
              colors={colors} styles={styles} label="Nome do responsável" value={nameInput} onChange={setNameInput}
              onCancel={() => { setNameInput(profile.nomeResponsavel); setEditingProfile(false); }} onSave={saveName} saving={saving}
            />
          ) : (
            <SettingsRow colors={colors} styles={styles} icon="person" title={profile.nomeResponsavel || 'Responsável não identificado'} detail={auth.currentUser?.email || ''} onPress={() => setEditingProfile(true)} leadingText={initials} />
          )}
          <View style={styles.separator} />
          {editingChild ? (
            <InlineEditor
              colors={colors} styles={styles} label="Nome da criança" value={childInput} onChange={setChildInput}
              onCancel={() => { setChildInput(profile.nomeCrianca); setEditingChild(false); }} onSave={saveChild} saving={saving}
            />
          ) : (
            <SettingsRow colors={colors} styles={styles} icon="happy" title={profile.nomeCrianca || 'Criança'} detail={profile.nomeCrianca ? 'Uma criança monitorada por conta' : 'Toque para informar o nome'} onPress={() => setEditingChild(true)} />
          )}
        </View>

        <SectionTitle colors={colors} title="Aparência" />
        <View style={styles.cardPadded}>
          <Text style={styles.settingTitle}>Tema do aplicativo</Text>
          <Text style={styles.settingDescription}>O tema escuro é a identidade padrão do Escolta UNITAU.</Text>
          <View style={styles.themeOptions}>
            {(['dark', 'light', 'system'] as ThemeMode[]).map(mode => (
              <TouchableOpacity key={mode} style={[styles.themeButton, preferences.themeMode === mode && styles.themeButtonSelected]} onPress={() => setPreference('themeMode', mode)}>
                <Ionicons name={mode === 'dark' ? 'moon' : mode === 'light' ? 'sunny' : 'phone-portrait'} size={18} color={preferences.themeMode === mode ? colors.primaryBlue : colors.textSecondary} />
                <Text style={[styles.themeButtonText, preferences.themeMode === mode && { color: colors.primaryBlue }]}>{mode === 'dark' ? 'Escuro' : mode === 'light' ? 'Claro' : 'Sistema'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <SectionTitle colors={colors} title="Preferências" />
        <View style={styles.card}>
          <PreferenceSwitch colors={colors} styles={styles} icon="radio" title="Conexão automática" description="A Sentinela procura e reconecta o dispositivo automaticamente." value={preferences.autoConnect} onChange={value => confirmCriticalToggle('autoConnect', value, 'Desativar conexão automática?', 'Será necessário iniciar a conexão manualmente, o que pode reduzir a proteção.')} />
          <View style={styles.separator} />
          <PreferenceSwitch colors={colors} styles={styles} icon="notifications" title="Alertas de emergência" description="Exibe um aviso no topo da tela e na tela bloqueada. A notificação permanente da Sentinela é necessária para o segundo plano." value={preferences.notificationsEnabled} onChange={value => confirmCriticalToggle('notificationsEnabled', value, 'Desativar alertas de emergência?', 'O aviso no topo da tela será desativado. A sirene crítica dentro do aplicativo e a notificação técnica da Sentinela permanecem independentes.')} />
          <View style={styles.separator} />
          <PreferenceSwitch colors={colors} styles={styles} icon="phone-portrait" title="Vibração" description="Usa padrões diferentes para atenção e emergência." value={preferences.vibrationEnabled} onChange={value => confirmCriticalToggle('vibrationEnabled', value, 'Desativar vibração?', 'O celular deixará de vibrar em situações de atenção e emergência. A sirene crítica continuará ativa.')} />
          <View style={styles.separator} />
          <View style={styles.separator} />
          <PreferenceSwitch colors={colors} styles={styles} icon="accessibility" title="Reduzir animações" description="Mantém cores e estados, com movimentos mais discretos." value={preferences.reduceMotion} onChange={value => setPreference('reduceMotion', value)} />
        </View>

        <SectionTitle colors={colors} title="Dispositivo Escolta" />
        <View style={styles.card}>
          <SettingsRow
            colors={colors}
            styles={styles}
            icon={deviceStandby ? 'play-circle' : 'pause-circle'}
            title={changingStandby ? 'Aguardando confirmação da placa…' : deviceStandby ? 'Retomar proteção' : 'Colocar Sentinela em espera'}
            detail={deviceStandby
              ? 'Monitoramento pausado intencionalmente. Toque para reconectar e reativar.'
              : deviceConnected
                ? 'Desarma a placa antes de encerrar a conexão, evitando um alarme indevido.'
                : 'Conecte a placa antes de solicitar uma pausa segura.'}
            onPress={handleMonitoringMode}
          />
        </View>

        {INTERNAL_TOOLS_ENABLED && <>
        <SectionTitle colors={colors} title="Diagnóstico e confiabilidade" />
        <View style={styles.card}>
          <SettingsRow
            colors={colors}
            styles={styles}
            icon="shield-checkmark"
            title="Verificar prontidão"
            detail="Analisa conexão, permissões, alertas e funcionamento em segundo plano"
            onPress={() => setShowDiagnostics(true)}
          />
          <View style={styles.separator} />
          <SettingsRow
            colors={colors}
            styles={styles}
            icon="flask"
            title="Ensaio de proximidade"
            detail="Compare distâncias medidas com trena e leituras Bluetooth; exporte os resultados"
            onPress={onOpenProximityTrial}
          />
        </View>
        </>}

        <SectionTitle colors={colors} title="Privacidade e localização" />
        <View style={styles.card}>
          <PreferenceSwitch colors={colors} styles={styles} icon="location" title="Compartilhar localização deste celular" description="Usada somente no início de uma emergência. Não representa a posição exata da criança." value={preferences.shareLocation} onChange={handleLocationToggle} />
        </View>

        <SectionTitle colors={colors} title="E-mail para alertas" />
        <View style={styles.card}>
          <View style={styles.experimentalBanner}>
            <Ionicons name="information-circle-outline" size={19} color={colors.warningYellow} />
            <Text style={styles.experimentalText}>Aviso adicional para um contato de confiança. Exige internet: cadastrar o endereço ou enviar uma mensagem não garante o recebimento. O alarme local funciona de forma independente.</Text>
          </View>
          <View style={styles.separator} />
          {editingContact ? (
            <View style={styles.editor}>
              <Text style={styles.fieldLabel}>E-mail do contato de confiança</Text>
              <TextInput style={styles.input} value={emailInput} onChangeText={setEmailInput} editable={!saving && !testingEmail} maxLength={254} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="contato@exemplo.com" placeholderTextColor={colors.textMuted} />
              <Text style={styles.editorHelp}>Use um contato que autorizou receber avisos. Ao mudar o endereço, será necessário ativar o envio novamente. Deixe em branco para remover.</Text>
              <EditorActions styles={styles} onCancel={() => setEditingContact(false)} onSave={saveContact} saving={saving} />
            </View>
          ) : (
            <SettingsRow colors={colors} styles={styles} icon="mail" title={profile.emailEmergencia ? 'Editar contato de confiança' : 'Cadastrar e-mail do contato'} detail={profile.emailEmergencia || 'Nenhum contato cadastrado; envio desativado'} onPress={() => { if (!testingEmail && !saving) setEditingContact(true); }} />
          )}
          {!editingContact && <>
            <View style={styles.separator} />
            <PreferenceSwitch colors={colors} styles={styles} icon="mail-outline" title="Enviar avisos por e-mail" description={canSendEmergencyEmail(profile) ? 'Ativado para alertas. A entrega não é garantida.' : 'Desativado. O contato só receberá tentativas após sua ativação.'} value={profile.emailAlertsEnabled === true} onChange={toggleEmailAlerts} />
            {INTERNAL_TOOLS_ENABLED && <>
              <View style={styles.separator} />
              <SettingsRow colors={colors} styles={styles} icon="paper-plane-outline" title={testingEmail ? 'Enviando teste…' : 'Enviar e-mail de teste'} detail={emailTestStatus || 'Mensagem de teste, sem localização ou nome da criança'} onPress={testEmail} />
            </>}
          </>}
        </View>

        <SectionTitle colors={colors} title="Emergência" />
        <View style={styles.emergencyRow}>
          <TouchableOpacity style={[styles.emergencyButton, { backgroundColor: colors.primaryBlue }]} onPress={() => callEmergency('190', 'Polícia Militar')}>
            <Ionicons name="shield" size={22} color={colors.white} /><Text style={styles.emergencyLabel}>POLÍCIA</Text><Text style={styles.emergencyNumber}>190</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.emergencyButton, { backgroundColor: colors.dangerRed }]} onPress={() => callEmergency('192', 'SAMU')}>
            <Ionicons name="medkit" size={22} color={colors.white} /><Text style={styles.emergencyLabel}>SAMU</Text><Text style={styles.emergencyNumber}>192</Text>
          </TouchableOpacity>
        </View>

        {INTERNAL_TOOLS_ENABLED && showAcademic && (
          <>
            <SectionTitle colors={colors} title="Área acadêmica" />
            <View style={styles.cardPadded}>
              <View style={styles.academicHeader}><Ionicons name="school" size={22} color={colors.primaryBlue} /><Text style={styles.academicTitle}>Protótipo Escolta UNITAU</Text></View>
              <Text style={styles.academicText}>TCC de Engenharia da Computação — Universidade de Taubaté.</Text>
              <Text style={styles.academicText}>Nicolas Venciguerra Men e Rafael Gonçalves Dedini.</Text>
              <Text style={styles.academicText}>Telemetria é a área técnica que mostra medições do sinal Bluetooth, como RSSI, médias e variações. Ela permanece preservada no código, mas escondida do uso comum.</Text>
            </View>
          </>
        )}

        <SectionTitle colors={colors} title="Conta e aplicativo" />
        <View style={styles.card}>
          <SettingsRow colors={colors} styles={styles} icon="refresh" title="Restaurar preferências" detail="Retorna às opções recomendadas" onPress={handleReset} />
          <View style={styles.separator} />
          <SettingsRow colors={colors} styles={styles} icon="log-out" title="Sair da conta" detail="Encerra a sessão e o monitoramento" onPress={handleLogout} danger />
        </View>

        <TouchableOpacity style={styles.versionArea} disabled={!INTERNAL_TOOLS_ENABLED} onPress={handleVersionTap} activeOpacity={0.65}>
          <Text style={styles.version}>{APP_DISPLAY_NAME} v1.0.0</Text>
          <Text style={styles.prototype}>MONITORAMENTO DE PROXIMIDADE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.length === 1 ? parts[0][0].toUpperCase() : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function SectionTitle({ colors, title }: { colors: AppColors; title: string }) {
  return <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginTop: 23, marginBottom: 9 }}>{title.toUpperCase()}</Text>;
}

function SettingsRow({ colors, styles, icon, title, detail, onPress, leadingText, danger }: {
  colors: AppColors; styles: ReturnType<typeof createStyles>; icon: keyof typeof Ionicons.glyphMap;
  title: string; detail: string; onPress: () => void; leadingText?: string; danger?: boolean;
}) {
  const color = danger ? colors.dangerRed : colors.primaryBlue;
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.rowIcon, { backgroundColor: colorWithAlpha(color, 0.12) }]}>
        {leadingText ? <Text style={[styles.rowInitials, { color }]}>{leadingText}</Text> : <Ionicons name={icon} size={19} color={color} />}
      </View>
      <View style={{ flex: 1 }}><Text style={[styles.rowTitle, danger && { color }]}>{title}</Text><Text style={styles.rowDetail} numberOfLines={2}>{detail}</Text></View>
      <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function PreferenceSwitch({ colors, styles, icon, title, description, value, onChange }: {
  colors: AppColors; styles: ReturnType<typeof createStyles>; icon: keyof typeof Ionicons.glyphMap;
  title: string; description: string; value: boolean; onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icon} size={19} color={colors.primaryBlue} /></View>
      <View style={{ flex: 1 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDescription}>{description}</Text></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.buttonDark, true: colorWithAlpha(colors.primaryBlue, 0.55) }} thumbColor={value ? colors.primaryBlue : colors.textMuted} />
    </View>
  );
}

function InlineEditor({ colors, styles, label, value, onChange, onCancel, onSave, saving }: {
  colors: AppColors; styles: ReturnType<typeof createStyles>; label: string; value: string; onChange: (value: string) => void;
  onCancel: () => void; onSave: () => void; saving: boolean;
}) {
  return (
    <View style={styles.editor}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} placeholderTextColor={colors.textMuted} />
      <EditorActions styles={styles} onCancel={onCancel} onSave={onSave} saving={saving} />
    </View>
  );
}

function EditorActions({ styles, onCancel, onSave, saving }: { styles: ReturnType<typeof createStyles>; onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <View style={styles.editorActions}>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
      <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>{saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>Salvar</Text>}</TouchableOpacity>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 45 },
    heading: { marginBottom: 2 },
    eyebrow: { color: colors.primaryBlue, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: colors.textPrimary, fontSize: 27, fontWeight: '800', marginTop: 3 },
    subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 340 },
    card: { backgroundColor: colors.cardBg, borderRadius: 17, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
    cardPadded: { backgroundColor: colors.cardBg, borderRadius: 17, borderWidth: 1, borderColor: colors.cardBorder, padding: 16 },
    separator: { height: 1, backgroundColor: colors.cardBorder, marginLeft: 64 },
    settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingHorizontal: 15, paddingVertical: 10 },
    rowIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowInitials: { fontSize: 13, fontWeight: '900' },
    rowTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    rowDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
    cardPaddedText: { color: colors.textSecondary, fontSize: 13 },
    settingTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    settingDescription: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
    preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 78, paddingHorizontal: 15, paddingVertical: 11 },
    themeOptions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    themeButton: { flex: 1, minHeight: 58, borderRadius: 13, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.inputBg },
    themeButtonSelected: { borderColor: colors.primaryBlue, backgroundColor: colors.primarySoft },
    themeButtonText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
    editor: { padding: 16 },
    fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 2 },
    input: { minHeight: 49, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.inputBg, color: colors.textPrimary, paddingHorizontal: 13, fontSize: 15, marginBottom: 12 },
    editorHelp: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: -5, marginBottom: 10 },
    editorActions: { flexDirection: 'row', gap: 9, marginTop: 3 },
    cancelButton: { flex: 1, minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
    cancelButtonText: { color: colors.textSecondary, fontWeight: '800' },
    saveButton: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryBlue },
    saveButtonText: { color: colors.white, fontWeight: '900' },
    experimentalBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 15, backgroundColor: colors.warningSoft },
    experimentalText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    emergencyRow: { flexDirection: 'row', gap: 11 },
    emergencyButton: { flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center', gap: 3 },
    emergencyLabel: { color: colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    emergencyNumber: { color: colors.white, fontSize: 24, fontWeight: '800' },
    academicHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
    academicTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    academicText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
    versionArea: { alignItems: 'center', padding: 20, marginTop: 7 },
    version: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
    prototype: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.05, marginTop: 4 },
  });
}
