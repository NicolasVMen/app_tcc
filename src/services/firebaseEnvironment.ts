import type { FirebaseOptions } from 'firebase/app';

// Configurações públicas de cliente, não credenciais de administrador.
// Projeto escolhido pelo usuário para teste e oficial. Não migra usuários antigos.
const currentConfig: FirebaseOptions = Object.freeze({
  apiKey: 'AIzaSyBvJFXn5rqtZ2lhO6_1VI6qi3ighI0_ZTo',
  authDomain: 'escolta-unitau.firebaseapp.com',
  projectId: 'escolta-unitau',
  storageBucket: 'escolta-unitau.firebasestorage.app',
  messagingSenderId: '247729429884',
  appId: '1:247729429884:web:c725e5c41ecc67a83358f9',
  measurementId: 'G-C0N7R6SW7X',
});

export function getFirebaseEnvironment(isTestBuild: boolean) {
  return {
    isTestBuild,
    // Um nome próprio impede reutilizar a sessão antiga ao trocar de projeto.
    appName: isTestBuild ? 'escolta-teste-escolta-unitau' : 'escolta-oficial-escolta-unitau',
    config: currentConfig,
  };
}

export function isGoogleClientForEnvironment(
  clientId: string,
  environment: ReturnType<typeof getFirebaseEnvironment>,
): boolean {
  return /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)
    && clientId.startsWith(`${environment.config.messagingSenderId}-`);
}
