/**
 * WealthOS Mobile Secure Storage & Offline Queue Service.
 *
 * Implements hardware-backed keychain/keystore encryption via Expo SecureStore
 * and a transactional offline mutation queue with deterministic state transitions.
 */

export const SECURE_STORE_KEYS = {
  AUTH_TOKEN: 'wealthos.secure.auth_token',
  REFRESH_TOKEN: 'wealthos.secure.refresh_token',
  ACTIVE_TENANT: 'wealthos.secure.active_tenant_id',
  BIOMETRIC_PREF: 'wealthos.secure.biometric_enabled',
} as const;

export interface SecureStorageDriver {
  setItemAsync(key: string, value: string): Promise<void>;
  getItemAsync(key: string): Promise<string | null>;
  deleteItemAsync(key: string): Promise<void>;
}

// Lazy-resolve native module to safely coexist in Node/test environments
let _nativeSecureStore: any = null;
function getNativeSecureStore(): any {
  if (!_nativeSecureStore) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _nativeSecureStore = require('expo-secure-store');
    } catch {
      _nativeSecureStore = null;
    }
  }
  return _nativeSecureStore;
}

/**
 * Hardware-backed Keychain (iOS) and Keystore (Android) SecureStore driver.
 * Configured with WHEN_UNLOCKED_THIS_DEVICE_ONLY to prevent cross-device or unauthenticated backup extraction.
 */
export class ExpoSecureStoreDriver implements SecureStorageDriver {
  async setItemAsync(key: string, value: string): Promise<void> {
    const SecureStore = getNativeSecureStore();
    if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
  }

  async getItemAsync(key: string): Promise<string | null> {
    const SecureStore = getNativeSecureStore();
    if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
      return await SecureStore.getItemAsync(key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
    return null;
  }

  async deleteItemAsync(key: string): Promise<void> {
    const SecureStore = getNativeSecureStore();
    if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
      await SecureStore.deleteItemAsync(key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
  }
}

/**
 * Isolated in-memory driver for unit tests and headless environments where native keychain bridge is unavailable.
 */
export class MemorySecureStoreDriver implements SecureStorageDriver {
  private store = new Map<string, string>();

  async setItemAsync(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async getItemAsync(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async deleteItemAsync(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Factory creating the production hardware-backed driver or test fallback.
 */
export function createSecureStorageDriver(): SecureStorageDriver {
  if (process.env.NODE_ENV === 'test' || typeof window !== 'undefined') {
    return new MemorySecureStoreDriver();
  }
  return new ExpoSecureStoreDriver();
}

export class MobileAuthStorage {
  constructor(private driver: SecureStorageDriver) {}

  async storeSession(tokens: { accessToken: string; refreshToken: string; tenantId: string }): Promise<void> {
    await Promise.all([
      this.driver.setItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN, tokens.accessToken),
      this.driver.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
      this.driver.setItemAsync(SECURE_STORE_KEYS.ACTIVE_TENANT, tokens.tenantId),
    ]);
  }

  async getSession(): Promise<{ accessToken: string | null; refreshToken: string | null; tenantId: string | null }> {
    const [accessToken, refreshToken, tenantId] = await Promise.all([
      this.driver.getItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN),
      this.driver.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN),
      this.driver.getItemAsync(SECURE_STORE_KEYS.ACTIVE_TENANT),
    ]);
    return { accessToken, refreshToken, tenantId };
  }

  async clearSession(): Promise<void> {
    await Promise.all([
      this.driver.deleteItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN),
      this.driver.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN),
      this.driver.deleteItemAsync(SECURE_STORE_KEYS.ACTIVE_TENANT),
    ]);
  }
}

export type MutationSyncState = 'IDLE' | 'QUEUED' | 'SYNCING' | 'COMMITTED' | 'FAILED_RETRYABLE' | 'FAILED_FATAL';

export interface OfflineMutation {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  state: MutationSyncState;
  retryCount: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
}

export class OfflineSyncQueue {
  private queue: OfflineMutation[] = [];

  enqueue(action: string, payload: Record<string, unknown>): OfflineMutation {
    const mutation: OfflineMutation = {
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      payload,
      state: 'QUEUED',
      retryCount: 0,
    };
    this.queue.push(mutation);
    return mutation;
  }

  getPending(): OfflineMutation[] {
    return this.queue.filter((m) => m.state === 'QUEUED' || m.state === 'FAILED_RETRYABLE');
  }

  startSyncing(mutationId: string): void {
    const mut = this.queue.find((m) => m.id === mutationId);
    if (!mut) throw new Error(`Mutation ${mutationId} not found`);
    if (mut.state !== 'QUEUED' && mut.state !== 'FAILED_RETRYABLE') {
      throw new Error(`Invalid state transition: cannot transition from ${mut.state} to SYNCING`);
    }
    mut.state = 'SYNCING';
    mut.lastAttemptAt = new Date();
  }

  markCommitted(mutationId: string): void {
    const mut = this.queue.find((m) => m.id === mutationId);
    if (!mut) throw new Error(`Mutation ${mutationId} not found`);
    if (mut.state !== 'SYNCING') {
      throw new Error(`Invalid state transition: cannot commit from ${mut.state}`);
    }
    mut.state = 'COMMITTED';
  }

  markFailed(mutationId: string, error: string, isFatal: boolean = false): void {
    const mut = this.queue.find((m) => m.id === mutationId);
    if (!mut) throw new Error(`Mutation ${mutationId} not found`);
    mut.retryCount += 1;
    mut.errorMessage = error;
    mut.state = isFatal || mut.retryCount >= 3 ? 'FAILED_FATAL' : 'FAILED_RETRYABLE';
  }

  getSnapshot(): OfflineMutation[] {
    return [...this.queue];
  }
}
