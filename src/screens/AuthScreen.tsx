import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateProfile } from 'firebase/auth';
import { writeProfileForAccount } from '../services/accountStorage';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../services/firebaseConfig';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { AppColors } from '../theme';
import { authErrorMessage, isValidEmail, normalizeEmail, validateAuthInput } from '../utils/authValidation';
import { googleAuthAvailable, signInWithGoogle } from '../services/googleAuth';
import { APP_DISPLAY_NAME } from '../services/nativeIdentity';

type AuthMode = 'login' | 'register';

export default function AuthScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const handleAuth = async () => {
    if (busy.current) return;
    const normalizedEmail = normalizeEmail(email);
    const validation = validateAuthInput({ mode, name, email, password, confirmation });
    if (validation) {
      Alert.alert('Confira os dados', validation);
      return;
    }

    busy.current = true;
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        try {
          await writeProfileForAccount(credential.user.uid, {
            nomeResponsavel: name.trim(), nomeCrianca: '', emailEmergencia: '', emailAlertsEnabled: false,
          });
          await updateProfile(credential.user, { displayName: name.trim() });
        } catch {
          Alert.alert('Conta criada', 'Seu acesso foi criado, mas não foi possível concluir o nome no perfil. Confira e ajuste em Sistema. Não crie a conta novamente.');
        }
      }
      onLoginSuccess();
    } catch (error: unknown) {
      Alert.alert('Não foi possível continuar', authErrorMessage(error));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      if (await signInWithGoogle()) onLoginSuccess();
    } catch (error) {
      Alert.alert('Acesso com Google', authErrorMessage(error));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    if (busy.current) return;
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Informe seu e-mail', 'Digite o e-mail da conta antes de solicitar a recuperação.');
      return;
    }
    Alert.alert('Enviar recuperação de senha?', `As instruções serão enviadas para ${normalizedEmail}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar',
        onPress: async () => {
          if (busy.current) return;
          busy.current = true;
          setLoading(true);
          try {
            await sendPasswordResetEmail(auth, normalizedEmail);
            Alert.alert('Solicitação concluída', 'Se houver uma conta com recuperação por senha para esse e-mail, você receberá as instruções. Verifique também o spam.');
          } catch {
            Alert.alert('Não foi possível enviar', 'Verifique o e-mail e a conexão com a internet.');
          } finally {
            busy.current = false;
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandArea}>
          <View style={styles.logoWrap}><Image source={require('../../assets/icon.png')} style={styles.logo} /></View>
          <Text style={styles.brand}>{APP_DISPLAY_NAME.toUpperCase()}</Text>
          <Text style={styles.tagline}>Tecnologia de proteção infantil</Text>
          <View style={styles.prototypeBadge}><Text style={styles.prototypeText}>MONITORAMENTO DE PROXIMIDADE</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>{mode === 'login' ? 'Acessar a Central' : 'Criar conta do responsável'}</Text>
          <Text style={styles.formSubtitle}>{mode === 'login' ? 'Entre para iniciar a Sentinela.' : 'Dados adicionais serão configurados depois do acesso.'}</Text>

          {mode === 'register' && (
            <InputField colors={colors} styles={styles} icon="person-outline" placeholder="Nome do responsável" value={name} onChange={setName} autoCapitalize="words" editable={!loading} maxLength={100} autoComplete="name" />
          )}
          <InputField colors={colors} styles={styles} icon="mail-outline" placeholder="E-mail" value={email} onChange={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!loading} maxLength={254} />

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              returnKeyType="done"
              onSubmitEditing={handleAuth}
            />
            <TouchableOpacity onPress={() => setShowPassword(show => !show)} accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {mode === 'register' && <>
            <InputField colors={colors} styles={styles} icon="lock-closed-outline" placeholder="Confirmar senha" value={confirmation} onChange={setConfirmation} autoCapitalize="none" autoCorrect={false} secureTextEntry={!showPassword} editable={!loading} autoComplete="new-password" onSubmitEditing={handleAuth} />
            <Text style={styles.formHelp}>Use pelo menos oito caracteres. Sua senha não será salva no perfil do aplicativo.</Text>
          </>}

          {mode === 'login' && (
            <TouchableOpacity style={styles.forgotButton} onPress={handleResetPassword} disabled={loading}><Text style={styles.forgotText}>Esqueci minha senha</Text></TouchableOpacity>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} disabled={loading} activeOpacity={0.82}>
            {loading ? <ActivityIndicator color={colors.white} /> : <>
              <Text style={styles.primaryText}>{mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}</Text>
              <Ionicons name="arrow-forward" size={19} color={colors.white} />
            </>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.googleButton, (loading || !googleAuthAvailable) && styles.googleDisabled]} onPress={handleGoogle} disabled={loading || !googleAuthAvailable} accessibilityRole="button" accessibilityLabel="Continuar com Google" accessibilityState={{ disabled: loading || !googleAuthAvailable }} activeOpacity={0.85}>
            <Image source={require('../../assets/google-g.png')} style={styles.googleLogo} accessible={false} />
            <Text style={styles.googleText}>Continuar com Google</Text>
          </TouchableOpacity>
          {!googleAuthAvailable && <Text style={styles.formHelp}>O acesso com Google está indisponível nesta instalação. Você pode entrar com e-mail e senha.</Text>}

          <TouchableOpacity style={styles.modeButton} disabled={loading} onPress={() => { setMode(current => current === 'login' ? 'register' : 'login'); setPassword(''); setConfirmation(''); }}>
            <Text style={styles.modeText}>{mode === 'login' ? 'Primeiro acesso? ' : 'Já possui uma conta? '}<Text style={styles.modeAction}>{mode === 'login' ? 'Criar conta' : 'Entrar'}</Text></Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>O Escolta UNITAU complementa a supervisão do responsável e não substitui o acompanhamento da criança.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({ colors, styles, icon, placeholder, value, onChange, ...inputProps }: {
  colors: AppColors; styles: ReturnType<typeof createStyles>; icon: keyof typeof Ionicons.glyphMap;
  placeholder: string; value: string; onChange: (value: string) => void; [key: string]: any;
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor={colors.textMuted} value={value} onChangeText={onChange} {...inputProps} />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 35 },
    brandArea: { alignItems: 'center', marginBottom: 25 },
    logoWrap: { width: 78, height: 78, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 15 },
    logo: { width: 67, height: 67, borderRadius: 20, resizeMode: 'contain' },
    brand: { color: colors.textPrimary, fontSize: 25, fontWeight: '900', letterSpacing: 1 },
    tagline: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
    prototypeBadge: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: colors.cardBorder },
    prototypeText: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.15 },
    card: { backgroundColor: colors.cardBg, borderRadius: 22, borderWidth: 1, borderColor: colors.cardBorder, padding: 20 },
    formTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '800' },
    formSubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 5, marginBottom: 20 },
    inputWrap: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.inputBg, paddingHorizontal: 14, marginBottom: 12 },
    input: { flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 13 },
    forgotButton: { alignSelf: 'flex-end', paddingVertical: 5, marginTop: -2, marginBottom: 10 },
    forgotText: { color: colors.primaryBlue, fontSize: 12, fontWeight: '700' },
    primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primaryBlue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 4 },
    primaryText: { color: colors.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
    googleButton: { minHeight: 50, borderWidth: 1, borderColor: '#747775', backgroundColor: '#FFFFFF', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 },
    googleLogo: { width: 20, height: 20, resizeMode: 'contain' },
    googleText: { color: '#1F1F1F', fontSize: 14, fontWeight: '500' },
    googleDisabled: { opacity: 0.55 },
    formHelp: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 10, marginTop: 4 },
    modeButton: { alignItems: 'center', paddingTop: 17, paddingBottom: 2 },
    modeText: { color: colors.textSecondary, fontSize: 13 },
    modeAction: { color: colors.primaryBlue, fontWeight: '800' },
    disclaimer: { color: colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 18, paddingHorizontal: 16 },
  });
}
