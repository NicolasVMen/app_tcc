import { requireOptionalNativeModule } from 'expo-modules-core';

export interface NativeGoogleResult {
  status: 'success' | 'cancelled' | 'error'; idToken?: string; code?: string;
}
interface NativeAuth {
  applicationId: string; isTestBuild: boolean;
  validatedMonitorEnabled?: boolean;
  signInGoogleAsync: (clientId: string) => Promise<NativeGoogleResult>;
  clearGoogleStateAsync: () => Promise<boolean>;
}

export const nativeAuth = requireOptionalNativeModule<NativeAuth>('EscoltaAuth');
export const IS_TEST_BUILD = nativeAuth?.isTestBuild === true;
// Ferramentas internas são opt-in: desligadas por padrão, mesmo no cliente Teste.
// Não existe ativação por toque/menu na oficial nem em qualquer APK release.
export const INTERNAL_TOOLS_ENABLED = typeof __DEV__ !== 'undefined' && __DEV__ && IS_TEST_BUILD
  && process.env.EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS === 'true';
export const DEV_RSSI_WATCHDOG_EXPERIMENT_ENABLED = INTERNAL_TOOLS_ENABLED;
// Identidade e recursos são independentes: a futura oficial pode optar pelas
// correções validadas sem se passar por pacote .teste. O padrão antigo não muda.
export const VALIDATED_MONITOR_ENABLED = IS_TEST_BUILD || nativeAuth?.validatedMonitorEnabled === true;
// Instrumentação separada dos testes ativos: somente opt-in de compilação.
// Não libera simulações, sirenes manuais ou ensaios antigos em APK release.
export const BATTERY_STUDY_ENABLED = VALIDATED_MONITOR_ENABLED
  && process.env.EXPO_PUBLIC_ENABLE_BATTERY_STUDY === 'true';
export const APP_SCHEME = IS_TEST_BUILD ? 'escolta-teste' : 'escolta';
export const APP_DISPLAY_NAME = IS_TEST_BUILD ? 'Escolta Teste' : 'Escolta UNITAU';
