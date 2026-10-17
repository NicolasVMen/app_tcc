import Storage from '@react-native-async-storage/async-storage';

const KEYS = ['@escolta_user_profile', '@escolta_preferences_v2', '@escolta_alerts_history',
  '@escolta_monitoring_intent', '@escolta_proximity_trials_v1'];
let uid: string | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(key: string, value: string | null) => void>();
const scopedKey = (key: string, owner = uid) => `${key}:uid:${owner ? encodeURIComponent(owner) : 'signed-out'}`;
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation, operation);
  queue = next.catch(() => {});
  return next;
}

/** Migra somente para a conta já autenticada ao abrir o app. Mantém os originais. */
export async function initializeAccountStorage(owner: string | null, recoverExisting = false) {
  uid = owner;
  if (!owner || !recoverExisting) return;
  await serialized(async () => {
    const legacyOwner = await Storage.getItem('@escolta_legacy_owner_v1');
    if (legacyOwner && legacyOwner !== owner) return;
    if (!legacyOwner) await Storage.setItem('@escolta_legacy_owner_v1', owner);
    for (const key of KEYS) {
      const target = scopedKey(key, owner);
      if (await Storage.getItem(target) !== null) continue;
      const value = await Storage.getItem(key);
      if (value !== null) await Storage.setItem(target, value);
    }
  });
}

export function subscribeAccountStorage(listener: (key: string, value: string | null) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Captura um proprietário para operações que podem começar após uma espera. */
export function accountStorageFor(owner: string) {
  if (!owner) throw new Error('Conta indisponível para salvar os dados.');
  return {
    async getItem(key: string): Promise<string | null> {
      await queue;
      return Storage.getItem(scopedKey(key, owner));
    },
    setItem(key: string, value: string): Promise<void> {
      return serialized(async () => {
        await Storage.setItem(scopedKey(key, owner), value);
        if (owner === uid) listeners.forEach(listener => listener(key, value));
      });
    },
  };
}

export function writeProfileForAccount(owner: string, profile: Record<string, unknown>) {
  const raw = JSON.stringify(profile);
  return serialized(async () => {
    await Storage.setItem(scopedKey('@escolta_user_profile', owner), raw);
    if (owner === uid) listeners.forEach(listener => listener('@escolta_user_profile', raw));
  });
}

/** Preenche apenas lacunas; login Google/recarga nunca apagam o perfil existente. */
export function ensureProfileForAccount(owner: string, name: string) {
  return serialized(async () => {
    const key = scopedKey('@escolta_user_profile', owner);
    const existing = await Storage.getItem(key);
    let profile: Record<string, unknown>;
    try {
      profile = existing ? JSON.parse(existing) : {};
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return;
    } catch { return; } // Preserva dados ilegíveis para recuperação, não sobrescreve.
    if (typeof profile.nomeResponsavel === 'string' && profile.nomeResponsavel.trim()) return;
    const raw = JSON.stringify({ nomeCrianca: '', emailEmergencia: '', emailAlertsEnabled: false,
      ...profile, nomeResponsavel: name.trim() });
    await Storage.setItem(key, raw);
    if (owner === uid) listeners.forEach(listener => listener('@escolta_user_profile', raw));
  });
}

export default {
  async getItem(key: string): Promise<string | null> {
    const owner = uid;
    await queue;
    const value = await Storage.getItem(scopedKey(key, owner));
    return owner === uid ? value : null;
  },
  setItem(key: string, value: string): Promise<void> {
    const owner = uid;
    return serialized(async () => {
      await Storage.setItem(scopedKey(key, owner), value);
      if (owner === uid) listeners.forEach(listener => listener(key, value));
    });
  },
  removeItem(key: string): Promise<void> {
    const owner = uid;
    return serialized(async () => {
      await Storage.removeItem(scopedKey(key, owner));
      if (owner === uid) listeners.forEach(listener => listener(key, null));
    });
  },
};
