import { describe, it, expect, beforeEach } from 'vitest';
import appConfig from '../app.json';
import pkgConfig from '../package.json';
import {
  SECURE_STORE_KEYS,
  MemorySecureStoreDriver,
  ExpoSecureStoreDriver,
  createSecureStorageDriver,
  MobileAuthStorage,
  OfflineSyncQueue,
} from './storage';

describe('WealthOS Mobile Application (Gate 9 & Round 2 Acceptance)', () => {
  describe('Expo SDK 51 Configuration Validation', () => {
    it('enforces Expo SDK 51 with strict dark theme foundation', () => {
      const expo = appConfig.expo;
      expect(expo.name).toBe('WealthOS');
      expect(expo.slug).toBe('wealthos');
      expect(expo.userInterfaceStyle).toBe('dark');
      expect(expo.splash.backgroundColor).toBe('#0B0F17');
      expect(pkgConfig.dependencies.expo).toBe('~51.0.0');
    });

    it('enforces iOS and Android bundle identifiers and permissions', () => {
      const expo = appConfig.expo;
      expect(expo.ios.bundleIdentifier).toBe('com.wealthos.app');
      expect(expo.android.package).toBe('com.wealthos.app');
      expect(expo.android.adaptiveIcon.backgroundColor).toBe('#0B0F17');
      expect(expo.orientation).toBe('portrait');
    });
  });

  describe('SecureStore Hardware Token Lifecycle & Logout Purge', () => {
    let driver: MemorySecureStoreDriver;
    let authStorage: MobileAuthStorage;

    beforeEach(() => {
      driver = new MemorySecureStoreDriver();
      authStorage = new MobileAuthStorage(driver);
    });

    it('enforces namespaced SecureStore keys', () => {
      expect(SECURE_STORE_KEYS.AUTH_TOKEN).toBe('wealthos.secure.auth_token');
      expect(SECURE_STORE_KEYS.REFRESH_TOKEN).toBe('wealthos.secure.refresh_token');
      expect(SECURE_STORE_KEYS.ACTIVE_TENANT).toBe('wealthos.secure.active_tenant_id');
      expect(SECURE_STORE_KEYS.BIOMETRIC_PREF).toBe('wealthos.secure.biometric_enabled');
    });

    it('stores authentication tokens and active workspace session', async () => {
      await authStorage.storeSession({
        accessToken: 'jwt-access-token-xyz',
        refreshToken: 'jwt-refresh-token-abc',
        tenantId: 'tenant-uuid-1234',
      });

      const session = await authStorage.getSession();
      expect(session.accessToken).toBe('jwt-access-token-xyz');
      expect(session.refreshToken).toBe('jwt-refresh-token-abc');
      expect(session.tenantId).toBe('tenant-uuid-1234');
    });

    it('completely purges all tokens from SecureStore on logout', async () => {
      await authStorage.storeSession({
        accessToken: 'jwt-access-token-xyz',
        refreshToken: 'jwt-refresh-token-abc',
        tenantId: 'tenant-uuid-1234',
      });

      // Verify tokens exist prior to logout
      let session = await authStorage.getSession();
      expect(session.accessToken).not.toBeNull();

      // Execute logout purge
      await authStorage.clearSession();

      // Assert complete deletion of keys
      session = await authStorage.getSession();
      expect(session.accessToken).toBeNull();
      expect(session.refreshToken).toBeNull();
      expect(session.tenantId).toBeNull();
      expect(await driver.getItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN)).toBeNull();
      expect(await driver.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN)).toBeNull();
      expect(await driver.getItemAsync(SECURE_STORE_KEYS.ACTIVE_TENANT)).toBeNull();
    });

    it('instantiates ExpoSecureStoreDriver and fails closed when native module is unavailable', async () => {
      const nativeDriver = new ExpoSecureStoreDriver();
      expect(typeof nativeDriver.setItemAsync).toBe('function');
      expect(typeof nativeDriver.getItemAsync).toBe('function');
      expect(typeof nativeDriver.deleteItemAsync).toBe('function');

      // Fail-closed enforcement: In headless/Node environment without native keychain bridge, driver must throw
      await expect(nativeDriver.getItemAsync('dummy_key')).rejects.toThrow(/SecureStore native module not found/);
      await expect(nativeDriver.setItemAsync('dummy_key', 'val')).rejects.toThrow(/SecureStore native module not found/);
      await expect(nativeDriver.deleteItemAsync('dummy_key')).rejects.toThrow(/SecureStore native module not found/);
    });

    it('returns isolated MemorySecureStoreDriver in test runtime via driver factory', () => {
      const driverInstance = createSecureStorageDriver();
      expect(driverInstance).toBeInstanceOf(MemorySecureStoreDriver);
    });
  });

  describe('Mobile Offline Transaction Queue & State Machine', () => {
    let queue: OfflineSyncQueue;

    beforeEach(() => {
      queue = new OfflineSyncQueue();
    });

    it('enqueues mutations with initial QUEUED status', () => {
      const mut = queue.enqueue('POST_TRANSFER', {
        from: 'acc-1',
        to: 'acc-2',
        amount: '5000.0000',
      });

      expect(mut.state).toBe('QUEUED');
      expect(mut.retryCount).toBe(0);
      expect(queue.getPending()).toHaveLength(1);
    });

    it('transitions deterministically from QUEUED -> SYNCING -> COMMITTED', () => {
      const mut = queue.enqueue('POST_TRANSFER', { amount: '5000.0000' });

      // Transition to SYNCING
      queue.startSyncing(mut.id);
      expect(queue.getSnapshot()[0].state).toBe('SYNCING');
      expect(queue.getSnapshot()[0].lastAttemptAt).toBeInstanceOf(Date);

      // Transition to COMMITTED
      queue.markCommitted(mut.id);
      expect(queue.getSnapshot()[0].state).toBe('COMMITTED');
      expect(queue.getPending()).toHaveLength(0);
    });

    it('handles transient network failures with retry state and limits retries', () => {
      const mut = queue.enqueue('POST_TRANSFER', { amount: '5000.0000' });

      // Attempt 1 fails (transient)
      queue.startSyncing(mut.id);
      queue.markFailed(mut.id, 'ECONNRESET: Server unavailable');
      expect(queue.getSnapshot()[0].state).toBe('FAILED_RETRYABLE');
      expect(queue.getSnapshot()[0].retryCount).toBe(1);

      // Attempt 2 fails
      queue.startSyncing(mut.id);
      queue.markFailed(mut.id, 'Gateway Timeout');
      expect(queue.getSnapshot()[0].retryCount).toBe(2);
      expect(queue.getSnapshot()[0].state).toBe('FAILED_RETRYABLE');

      // Attempt 3 fails -> transitions to FAILED_FATAL
      queue.startSyncing(mut.id);
      queue.markFailed(mut.id, 'Persistent error');
      expect(queue.getSnapshot()[0].retryCount).toBe(3);
      expect(queue.getSnapshot()[0].state).toBe('FAILED_FATAL');
      expect(queue.getPending()).toHaveLength(0);
    });

    it('rejects invalid state transitions', () => {
      const mut = queue.enqueue('POST_TRANSFER', { amount: '1000' });
      // Cannot commit directly from QUEUED without entering SYNCING
      expect(() => queue.markCommitted(mut.id)).toThrow(/Invalid state transition/);
    });
  });
});
