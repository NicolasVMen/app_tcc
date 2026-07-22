import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, TextInput, ActivityIndicator,
  Linking, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { COLORS } from '../theme';

interface UserProfile {
  nomeResponsavel: string;
  cpfResponsavel: string;
  telefoneResponsavel: string;
  nomeCrianca: string;
  cpfCrianca: string;
  telefoneEmergencia?: string;
  emailEmergencia?: string;
}

function getInitials(name: string): string {
  if (!name || name.trim() === '') return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsScreen({ onOpenLab }: { onOpenLab: () => void }) {
  const [profile, setProfile] = useState<UserProfile>({
    nomeResponsavel: '', cpfResponsavel: '', telefoneResponsavel: '', nomeCrianca: '', cpfCrianca: '',
    telefoneEmergencia: '', emailEmergencia: ''
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingChild, setEditingChild] = useState(false);
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [childNameInput, setChildNameInput] = useState('');
  const [childCpfInput, setChildCpfInput] = useState('');
  const [emergPhoneInput, setEmergPhoneInput] = useState('');
  const [emergEmailInput, setEmergEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@escolta_user_profile');
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile(parsed);
        setEditName(parsed.nomeResponsavel || '');
        setEditCpf(parsed.cpfResponsavel || '');
        setEditPhone(parsed.telefoneResponsavel || '');
        setChildNameInput(parsed.nomeCrianca || '');
        setChildCpfInput(parsed.cpfCrianca || '');
        setEmergPhoneInput(parsed.telefoneEmergencia || '');
        setEmergEmailInput(parsed.emailEmergencia || '');
      }
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Atenção', 'O nome do responsável é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const updated = {
        ...profile,
        nomeResponsavel: editName.trim(),
        cpfResponsavel: editCpf.trim(),
        telefoneResponsavel: editPhone.trim(),
      };
      await AsyncStorage.setItem('@escolta_user_profile', JSON.stringify(updated));
      setProfile(updated);
      setEditingProfile(false);
      Alert.alert('✅ Salvo!', 'Dados do responsável atualizados.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
    }
    setSaving(false);
  };

  const saveChildName = async () => {
    setSaving(true);
    try {
      const updated = { ...profile, nomeCrianca: childNameInput.trim(), cpfCrianca: childCpfInput.trim() };
      await AsyncStorage.setItem('@escolta_user_profile', JSON.stringify(updated));
      setProfile(updated);
      setEditingChild(false);
      Alert.alert('✅ Salvo!', 'Nome da criança atualizado.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
    }
    setSaving(false);
  };

  const saveEmergencyContact = async () => {
    setSaving(true);
    try {
      const updated = { 
        ...profile, 
        telefoneEmergencia: emergPhoneInput.trim(), 
        emailEmergencia: emergEmailInput.trim() 
      };
      await AsyncStorage.setItem('@escolta_user_profile', JSON.stringify(updated));
      setProfile(updated);
      setEditingEmergency(false);
      Alert.alert('✅ Salvo!', 'Contato de emergência atualizado.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert('Sair da Conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => {
        try { await signOut(auth); } catch { Alert.alert('Erro', 'Não foi possível fazer logout.'); }
      }},
    ]);
  };

  const callEmergency = (number: string, label: string) => {
    Alert.alert(
      `📞 Ligar para ${label}?`,
      `O app vai abrir o discador com o número ${number}. Confirme para ligar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: `Ligar ${number}`, style: 'destructive', onPress: () => Linking.openURL(`tel:${number}`) }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.primaryBlue} />
      </View>
    );
  }

  const initials = getInitials(profile.nomeResponsavel);
  const email = auth.currentUser?.email || '';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryBlue} colors={[COLORS.primaryBlue]} />}
      >

        {/* ===== PERFIL DO RESPONSÁVEL ===== */}
        {editingProfile ? (
          <View style={styles.editProfileCard}>
            <Text style={styles.editProfileTitle}>Editar Perfil</Text>

            <Text style={styles.fieldLabel}>Nome do Responsável</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Seu nome completo"
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />
            </View>

            <Text style={styles.fieldLabel}>Telefone (com DDD)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="(12) 99999-0000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.fieldLabel}>CPF</Text>
            <View style={styles.inputRow}>
              <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={editCpf}
                onChangeText={setEditCpf}
                placeholder="000.000.000-00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setEditingProfile(false);
                setEditName(profile.nomeResponsavel);
                setEditPhone(profile.telefoneResponsavel);
                setEditCpf(profile.cpfResponsavel);
              }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.profileCard} onPress={() => setEditingProfile(true)} activeOpacity={0.7}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.nomeResponsavel || 'Responsável'}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              {profile.telefoneResponsavel ? (
                <View style={styles.phoneTag}>
                  <Ionicons name="call-outline" size={12} color={COLORS.primaryBlue} />
                  <Text style={styles.phoneTagText}>{profile.telefoneResponsavel}</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="create-outline" size={20} color={COLORS.primaryBlue} />
          </TouchableOpacity>
        )}

        {/* ===== CRIANÇA ===== */}
        <Text style={styles.sectionTitle}>CRIANÇA MONITORADA</Text>
        <View style={styles.card}>
          {editingChild ? (
            <View style={styles.editContainer}>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  value={childNameInput}
                  onChangeText={setChildNameInput}
                  placeholder="Nome da Criança"
                  placeholderTextColor={COLORS.textMuted}
                  autoFocus
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  value={childCpfInput}
                  onChangeText={setChildCpfInput}
                  placeholder="CPF da Criança"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingChild(false); setChildNameInput(profile.nomeCrianca); }}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveChildName} disabled={saving}>
                  {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => setEditingChild(true)} activeOpacity={0.7}>
              <View style={styles.rowContent}>
                <View style={[styles.avatarSmall, { backgroundColor: profile.nomeCrianca ? COLORS.safeGreen + '30' : COLORS.cardBorder }]}>
                  <Ionicons name="person" size={18} color={profile.nomeCrianca ? COLORS.safeGreen : COLORS.textMuted} />
                </View>
                <View>
                  <Text style={styles.rowText}>{profile.nomeCrianca || 'Toque para adicionar'}</Text>
                  <Text style={styles.rowSubtext}>Nome que aparece nos alertas</Text>
                </View>
              </View>
              <Ionicons name="create-outline" size={20} color={COLORS.primaryBlue} />
            </TouchableOpacity>
          )}
        </View>

        {/* ===== CONTATO DE EMERGÊNCIA (SMS/EMAIL) ===== */}
        <Text style={styles.sectionTitle}>CONTATO DE EMERGÊNCIA (ALERTA AUTOMÁTICO)</Text>
        <View style={styles.card}>
          {editingEmergency ? (
            <View style={styles.editContainer}>
              <View style={styles.inputRow}>
                <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  value={emergPhoneInput}
                  onChangeText={setEmergPhoneInput}
                  placeholder="Tel para SMS (Ex: 12999990000)"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  autoFocus
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  value={emergEmailInput}
                  onChangeText={setEmergEmailInput}
                  placeholder="Email de emergência"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingEmergency(false); setEmergPhoneInput(profile.telefoneEmergencia || ''); setEmergEmailInput(profile.emailEmergencia || ''); }}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveEmergencyContact} disabled={saving}>
                  {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => setEditingEmergency(true)} activeOpacity={0.7}>
              <View style={styles.rowContent}>
                <View style={[styles.avatarSmall, { backgroundColor: (profile.telefoneEmergencia || profile.emailEmergencia) ? COLORS.warningYellow + '30' : COLORS.cardBorder }]}>
                  <Ionicons name="warning" size={18} color={(profile.telefoneEmergencia || profile.emailEmergencia) ? COLORS.warningYellow : COLORS.textMuted} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.rowText}>{profile.telefoneEmergencia || profile.emailEmergencia ? 'Contato configurado' : 'Toque para adicionar'}</Text>
                  <Text style={styles.rowSubtext} numberOfLines={1}>
                    {profile.telefoneEmergencia ? `SMS: ${profile.telefoneEmergencia} ` : ''}
                    {profile.emailEmergencia ? `Email: ${profile.emailEmergencia}` : ''}
                    {!profile.telefoneEmergencia && !profile.emailEmergencia && 'Usado para o botão SOS no Pânico'}
                  </Text>
                </View>
              </View>
              <Ionicons name="create-outline" size={20} color={COLORS.primaryBlue} />
            </TouchableOpacity>
          )}
        </View>

        {/* ===== EMERGÊNCIA ===== */}
        <Text style={styles.sectionTitle}>LIGAÇÃO RÁPIDA</Text>
        <View style={styles.emergencyRow}>
          <TouchableOpacity style={styles.policeBtn} onPress={() => callEmergency('190', 'Polícia Militar')} activeOpacity={0.8}>
            <Ionicons name="shield" size={22} color={COLORS.white} />
            <Text style={styles.emergencyLabel}>POLÍCIA</Text>
            <Text style={styles.emergencyNumber}>190</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.samuBtn} onPress={() => callEmergency('192', 'SAMU')} activeOpacity={0.8}>
            <Ionicons name="medkit" size={22} color={COLORS.white} />
            <Text style={styles.emergencyLabel}>SAMU</Text>
            <Text style={styles.emergencyNumber}>192</Text>
          </TouchableOpacity>
        </View>

        {/* ===== SOBRE ===== */}
        <Text style={styles.sectionTitle}>SOBRE O PROJETO</Text>
        <View style={styles.card}>
          <View style={styles.aboutHeader}>
            <Text style={styles.aboutTitle}>Escolta UNITAU</Text>
            <Text style={styles.aboutSubtitle}>TCC — Engenharia da Computação</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Universidade</Text>
              <Text style={styles.infoValue}>UNITAU</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alunos</Text>
              <Text style={styles.infoValue}>Nicolas Men e Rafael Dedini</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Orientador</Text>
              <Text style={styles.infoValue}>Prof. Luis Fernando</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Versão</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.aboutFooter}>
            Sistema de segurança infantil baseado em Bluetooth Low Energy (BLE) com monitoramento em tempo real.
          </Text>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={onOpenLab} activeOpacity={0.7}>
            <View style={styles.rowContent}>
              <Ionicons name="flask-outline" size={20} color={COLORS.primaryBlue} />
              <Text style={styles.rowText}>Laboratório de Dados (TCC)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ===== LOGOUT ===== */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.dangerRed} />
          <Text style={styles.logoutText}>SAIR DA CONTA</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Escolta UNITAU v1.0 · TCC Eng. Computação</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Perfil
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 28, gap: 14,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primaryBlue,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primaryBlue, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  profileEmail: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  phoneTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryBlue + '20',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start',
  },
  phoneTagText: { fontSize: 12, color: COLORS.primaryBlue, fontWeight: '600' },

  // Edição do perfil
  editProfileCard: {
    backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: COLORS.primaryBlue, marginBottom: 28,
  },
  editProfileTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginLeft: 2 },

  // Seções
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, marginTop: 4, marginBottom: 10 },
  card: {
    backgroundColor: COLORS.cardBg, borderRadius: 16, overflow: 'hidden',
    marginBottom: 20, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  rowText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  rowSubtext: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  avatarSmall: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  editContainer: { padding: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: 12,
    paddingHorizontal: 14, height: 50, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 16 },
  editButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: COLORS.primaryBlue, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: '700' },

  // Emergência
  emergencyRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  policeBtn: {
    flex: 1, backgroundColor: '#1D4ED8', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4,
    shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  samuBtn: {
    flex: 1, backgroundColor: '#DC2626', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4,
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  emergencyLabel: { color: COLORS.white, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  emergencyNumber: { color: 'rgba(255,255,255,0.85)', fontSize: 26, fontWeight: '900' },

  divider: { height: 1, backgroundColor: COLORS.cardBorder },
  aboutHeader: { padding: 16, paddingBottom: 12 },
  aboutTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  aboutSubtitle: { fontSize: 13, fontWeight: '600', color: COLORS.primaryBlue, marginTop: 2 },
  infoContainer: { paddingVertical: 6, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  aboutFooter: { padding: 16, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 8, gap: 8,
  },
  logoutText: { color: COLORS.dangerRed, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  versionText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11, marginTop: 16, marginBottom: 8 },
});
