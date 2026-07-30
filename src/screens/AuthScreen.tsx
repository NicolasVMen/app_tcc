import React, { useMemo, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../services/firebaseConfig';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { AppColors } from '../theme';

type AuthMode = 'login' | 'register';

export default function AuthScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { colors } = useAppPreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert('Preencha os dados', 'Informe e-mail e senha para continuar.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Informe seu nome', 'O nome será usado para identificar o responsável.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Senha muito curta', 'Use pelo menos seis caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        await AsyncStorage.setItem('@escolta_user_profile', JSON.stringify({
          nomeResponsavel: name.trim(),
          nomeCrianca: '',
          emailEmergencia: '',
        }));
      }
      onLoginSuccess();
    } catch (error: any) {
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'E-mail ou senha inválidos.',
        'auth/user-not-found': 'E-mail ou senha inválidos.',
        'auth/wrong-password': 'E-mail ou senha inválidos.',
        'auth/email-already-in-use': 'Este e-mail já possui uma conta.',
        'auth/invalid-email': 'O formato do e-mail não é válido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
        'auth/network-request-failed': 'Não foi possível acessar a internet.',
      };
      Alert.alert('Não foi possível continuar', messages[error?.code] || 'Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Informe seu e-mail', 'Digite o e-mail da conta antes de solicitar a recuperação.');
      return;
    }
    Alert.alert('Enviar recuperação de senha?', `As instruções serão enviadas para ${normalizedEmail}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar',
        onPress: async () => {
          try {
            await sendPasswordResetEmail(auth, normalizedEmail);
            Alert.alert('E-mail enviado', 'Verifique também a caixa de spam.');
          } catch {
            Alert.alert('Não foi possível enviar', 'Verifique o e-mail e a conexão com a internet.');
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
          <Text style={styles.brand}>ESCOLTA UNITAU</Text>
          <Text style={styles.tagline}>Tecnologia de proteção infantil</Text>
          <View style={styles.prototypeBadge}><Text style={styles.prototypeText}>PROTÓTIPO ACADÊMICO FUNCIONAL</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>{mode === 'login' ? 'Acessar a Central' : 'Criar conta do responsável'}</Text>
          <Text style={styles.formSubtitle}>{mode === 'login' ? 'Entre para iniciar a Sentinela.' : 'Dados adicionais serão configurados depois do acesso.'}</Text>

          {mode === 'register' && (
            <InputField colors={colors} styles={styles} icon="person-outline" placeholder="Nome do responsável" value={name} onChange={setName} autoCapitalize="words" />
          )}
          <InputField colors={colors} styles={styles} icon="mail-outline" placeholder="E-mail" value={email} onChange={setEmail} autoCapitalize="none" keyboardType="email-address" />

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
              returnKeyType="done"
              onSubmitEditing={handleAuth}
            />
            <TouchableOpacity onPress={() => setShowPassword(show => !show)} accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {mode === 'login' && (
            <TouchableOpacity style={styles.forgotButton} onPress={handleResetPassword}><Text style={styles.forgotText}>Esqueci minha senha</Text></TouchableOpacity>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} disabled={loading} activeOpacity={0.82}>
            {loading ? <ActivityIndicator color={colors.white} /> : <>
              <Text style={styles.primaryText}>{mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}</Text>
              <Ionicons name="arrow-forward" size={19} color={colors.white} />
            </>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.modeButton} onPress={() => setMode(current => current === 'login' ? 'register' : 'login')}>
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
    modeButton: { alignItems: 'center', paddingTop: 17, paddingBottom: 2 },
    modeText: { color: colors.textSecondary, fontSize: 13 },
    modeAction: { color: colors.primaryBlue, fontWeight: '800' },
    disclaimer: { color: colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 18, paddingHorizontal: 16 },
  });
}
