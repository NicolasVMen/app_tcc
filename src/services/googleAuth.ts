import { Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, firebaseEnvironment } from './firebaseConfig';
import { nativeAuth } from './nativeIdentity';
import { isGoogleClientForEnvironment } from './firebaseEnvironment';

const clientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
// Teste e oficial usam o cliente WEB do projeto selecionado, nunca outro projeto.
export const googleAuthConfigured = isGoogleClientForEnvironment(clientId, firebaseEnvironment);
export const googleAuthAvailable = Platform.OS === 'android'
  && typeof nativeAuth?.signInGoogleAsync === 'function' && googleAuthConfigured;

function failure(code: string): Error & { code: string } {
  return Object.assign(new Error('Não foi possível concluir o acesso com Google.'), { code });
}

export async function signInWithGoogle(): Promise<boolean> {
  if (!googleAuthConfigured) throw failure('google/not-configured');
  if (Platform.OS !== 'android' || !nativeAuth?.signInGoogleAsync) throw failure('google/native-unavailable');
  const result = await nativeAuth.signInGoogleAsync(clientId);
  if (result.status === 'cancelled') return false;
  if (result.status !== 'success') throw failure(result.code || 'google/invalid-response');
  if (!result.idToken?.trim()) throw failure('google/invalid-response');
  // Firebase valida a credencial: não confiamos em e-mail/UID decodificado localmente.
  await signInWithCredential(auth, GoogleAuthProvider.credential(result.idToken));
  return true;
}

export async function clearGoogleCredentialState(): Promise<void> {
  if (Platform.OS === 'android' && nativeAuth?.clearGoogleStateAsync) {
    await nativeAuth.clearGoogleStateAsync();
  }
}
