import { initializeApp, getApps, getApp } from "firebase/app";
import { Auth, getAuth, initializeAuth, Persistence } from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const getReactNativePersistence = (FirebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof ReactNativeAsyncStorage) => Persistence;
}).getReactNativePersistence;

const firebaseConfig = {
  apiKey: "AIzaSyAS27cWNgZLeuS1plp2G1wZE4k2WgKfbBs",
  authDomain: "escolta-unitau-tcc.firebaseapp.com",
  projectId: "escolta-unitau-tcc",
  storageBucket: "escolta-unitau-tcc.firebasestorage.app",
  messagingSenderId: "869804793847",
  appId: "1:869804793847:web:81259d38053b71257618f2",
  measurementId: "G-HMGJ1SRHQ0"
};

// Evita inicializar multiplas vezes em reloads do Expo
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  // O Auth já existe durante recargas rápidas do ambiente de desenvolvimento.
  auth = getAuth(app);
}
// Padroniza mensagens e páginas de ação do Firebase para português do Brasil.
auth.languageCode = 'pt-BR';

export { auth };
