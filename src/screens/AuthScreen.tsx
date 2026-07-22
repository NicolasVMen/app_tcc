import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#0F172A',
  cardBg: '#1E293B',
  inputBg: '#0F172A',
  cardBorder: '#334155',
  primaryBlue: '#3B82F6',
  dangerRed: '#EF4444',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  white: '#FFFFFF',
};

export default function AuthScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha o e-mail e a senha.');
      return;
    }

    if (!isLoginMode && (!nome || !telefone || !cpf)) {
      Alert.alert('Erro', 'Preencha seu nome, CPF e telefone para o cadastro.');
      return;
    }
    
    setLoading(true);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        await AsyncStorage.setItem('@escolta_user_profile', JSON.stringify({
          nomeResponsavel: nome,
          cpfResponsavel: cpf,
          telefoneResponsavel: telefone,
          nomeCrianca: '',
          cpfCrianca: '',
        }));
      }
      onLoginSuccess();
    } catch (error: any) {
      let msg = 'Erro na autenticação. Verifique os dados.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = 'Email ou senha inválidos.';
      } else if (error.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está cadastrado.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido.';
      }
      Alert.alert('Falha', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        
        {/* LOGO E TITULO */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={60} color={COLORS.primaryBlue} />
          </View>
          <Text style={styles.title}>Escolta UNITAU</Text>
          <Text style={styles.subtitle}>Sistema de Proteção Infantil</Text>
        </View>

        {/* FORMULÁRIO */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>
            {isLoginMode ? 'Acesse sua conta' : 'Crie sua conta'}
          </Text>

          {!isLoginMode && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Nome do Responsável"
                  placeholderTextColor={COLORS.textSecondary}
                  value={nome}
                  onChangeText={setNome}
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Telefone (com DDD)"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="phone-pad"
                  value={telefone}
                  onChangeText={setTelefone}
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="card" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="CPF do Responsável"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={cpf}
                  onChangeText={setCpf}
                />
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Digite seu e-mail"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity 
            style={styles.authButton} 
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.authButtonText}>
                {isLoginMode ? 'ENTRAR' : 'CADASTRAR'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.switchModeBtn}
            onPress={() => setIsLoginMode(!isLoginMode)}
          >
            <Text style={styles.switchModeText}>
              {isLoginMode 
                ? 'Ainda não tem conta? Clique para Cadastrar' 
                : 'Já possui conta? Clique para Entrar'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          TCC - Engenharia de Computação{"\n"}UNITAU
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.primaryBlue,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    height: '100%',
  },
  authButton: {
    backgroundColor: COLORS.primaryBlue,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  switchModeBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchModeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  footerText: {
    marginTop: 40,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  }
});
