import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';

import { auth } from '../services/firebaseConfig';
import { AppPreferences, useAppPreferences } from '../context/AppPreferencesContext';
import { AppColors, colorWithAlpha, ThemeMode } from '../theme';

interface UserProfile {
  nomeResponsavel: string;
  nomeCrianca: string;
  emailEmergencia?: string;
  [key: string]: unknown;
}

const EMPTY_PROFILE: UserProfile = {
  nomeResponsavel: '',
  nomeCrianca: '',
  emailEmergencia: '',
};

export default function SettingsScreen({ onProfileUpdated }: { onProfileUpdated?: (profile: UserProfile) => void }) {
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
  const [versionTaps, setVersionTaps] = useState(0);
  const [showAcademic, setShowAcademic] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@escolta_user_profile');
      if (raw) {
        const parsed = JSON.parse(raw) as UserProfile;
        const normalized = { ...EMPTY_PROFILE, ...parsed };
        setProfile(normalized);
        setNameInput(normalized.nomeResponsavel || '');
        setChildInput(normalized.nomeCrianca || '');
        setEmailInput(normalized.emailEmergencia || '');
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

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
    if (await persistProfile({ emailEmergencia: emailInput.trim() })) setEditingContact(false);
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

  const handleLogout = () => {
    Alert.alert('Sair da conta?', 'A Sentinela deixará de monitorar enquanto não houver uma conta ativa.', [
      { text: 'Permanecer', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut(auth).catch(() => Alert.alert('Falha ao sair')) },
    ]);
  };

  const handleReset = () => {
    Alert.alert('Restaurar preferências?', 'Tema, notificações e opções da Sentinela voltarão aos valores recomendados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restaurar', style: 'destructive', onPress: resetPreferences },
    ]);
  };

  const handleVersionTap = () => {
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

  const initials = getInitials(profile.nomeResponsavel);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>CONFIGURAÇÃO E COBERTURA</Text>
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
          <PreferenceSwitch colors={colors} styles={styles} icon="volume-medium" title="Sons informativos" description="Controla sons não críticos. Não silencia emergências." value={preferences.informationalSounds} onChange={value => setPreference('informationalSounds', value)} />
          <View style={styles.separator} />
          <PreferenceSwitch colors={colors} styles={styles} icon="accessibility" title="Reduzir animações" description="Mantém cores e estados, com movimentos mais discretos." value={preferences.reduceMotion} onChange={value => setPreference('reduceMotion', value)} />
        </View>

        <SectionTitle colors={colors} title="Privacidade e localização" />
        <View style={styles.card}>
          <PreferenceSwitch colors={colors} styles={styles} icon="location" title="Compartilhar localização deste celular" description="Usada somente no início de uma emergência. Não representa a posição exata da criança." value={preferences.shareLocation} onChange={handleLocationToggle} />
        </View>

        <SectionTitle colors={colors} title="Contatos de confiança" />
        <View style={styles.card}>
          <View style={styles.experimentalBanner}>
            <Ionicons name="flask-outline" size={19} color={colors.warningYellow} />
            <Text style={styles.experimentalText}>Canal experimental do protótipo. A futura Rede de Proteção exigirá notificações push e um backend autenticado.</Text>
          </View>
          <View style={styles.separator} />
          {editingContact ? (
            <View style={styles.editor}>
              <Text style={styles.fieldLabel}>E-mail de emergência</Text>
              <TextInput style={styles.input} value={emailInput} onChangeText={setEmailInput} autoCapitalize="none" keyboardType="email-address" placeholder="contato@exemplo.com" placeholderTextColor={colors.textMuted} />
              <Text style={styles.editorHelp}>O envio por e-mail é experimental e não substitui o alarme local do protótipo.</Text>
              <EditorActions styles={styles} onCancel={() => setEditingContact(false)} onSave={saveContact} saving={saving} />
            </View>
          ) : (
            <SettingsRow colors={colors} styles={styles} icon="people" title={profile.emailEmergencia ? 'Canal experimental configurado' : 'Configurar canal experimental'} detail={profile.emailEmergencia || 'E-mail para ensaios controlados'} onPress={() => setEditingContact(true)} />
          )}
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

        {showAcademic && (
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
          <SettingsRow colors={colors} styles={styles} icon="log-out" title="Sair da conta" detail="Interrompe a sessão atual" onPress={handleLogout} danger />
        </View>

        <TouchableOpacity style={styles.versionArea} onPress={handleVersionTap} activeOpacity={0.65}>
          <Text style={styles.version}>Escolta UNITAU v1.0.0</Text>
          <Text style={styles.prototype}>PROTÓTIPO ACADÊMICO FUNCIONAL</Text>
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
