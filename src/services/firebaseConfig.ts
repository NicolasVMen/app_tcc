import { initializeApp, getApps } from "firebase/app";
import { Auth, getAuth, initializeAuth, Persistence } from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { IS_TEST_BUILD } from './nativeIdentity';
import { getFirebaseEnvironment } from './firebaseEnvironment';

const getReactNativePersistence = (FirebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof ReactNativeAsyncStorage) => Persistence;
}).getReactNativePersistence;

export const firebaseEnvironment = getFirebaseEnvironment(IS_TEST_BUILD);
const { appName, config } = firebaseEnvironment;
const existingApp = getApps().find(candidate => candidate.name === appName);
if (existingApp && (existingApp.options.projectId !== config.projectId
  || existingApp.options.appId !== config.appId
  || existingApp.options.apiKey !== config.apiKey)) {
  // Não reutiliza silenciosamente um projeto errado durante Fast Refresh.
  throw new Error('A configuração do Firebase mudou. Feche e reabra o aplicativo.');
}
const app = existingApp ?? initializeApp(config, appName);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (error) {
  // Só reutiliza Auth quando ele já existe; outras falhas não ficam mascaradas.
  if ((error as { code?: string })?.code !== 'auth/already-initialized') throw error;
  auth = getAuth(app);
}
// Padroniza mensagens e páginas de ação do Firebase para português do Brasil.
auth.languageCode = 'pt-BR';

export { auth };
