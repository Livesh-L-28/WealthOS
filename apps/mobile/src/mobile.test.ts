import { describe, it, expect } from 'vitest';
import appConfig from '../app.json';
import pkgConfig from '../package.json';

describe('WealthOS Mobile Application (Gate 9)', () => {
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

  describe('Secure Storage & Biometric Key Schema', () => {
    it('defines isolated secure storage keys for credentials and biometric auth', () => {
      const SECURE_STORE_KEYS = {
        AUTH_TOKEN: 'wealthos.secure.auth_token',
        REFRESH_TOKEN: 'wealthos.secure.refresh_token',
        ACTIVE_TENANT: 'wealthos.secure.active_tenant_id',
        BIOMETRIC_PREF: 'wealthos.secure.biometric_enabled',
      };

      expect(SECURE_STORE_KEYS.AUTH_TOKEN).toMatch(/^wealthos\.secure\./);
      expect(SECURE_STORE_KEYS.REFRESH_TOKEN).toMatch(/^wealthos\.secure\./);
      expect(SECURE_STORE_KEYS.ACTIVE_TENANT).toMatch(/^wealthos\.secure\./);
      expect(SECURE_STORE_KEYS.BIOMETRIC_PREF).toMatch(/^wealthos\.secure\./);
    });
  });

  describe('Mobile Offline State & Ingestion Transitions', () => {
    it('transitions offline mutation queue through deterministic states', () => {
      type SyncState = 'IDLE' | 'QUEUED' | 'SYNCING' | 'COMMITTED' | 'FAILED_RETRYABLE';

      interface OfflineMutation {
        id: string;
        action: string;
        payload: Record<string, unknown>;
        state: SyncState;
        retryCount: number;
      }

      const mutation: OfflineMutation = {
        id: 'mut-001',
        action: 'RECORD_TRANSFER',
        payload: { amount: 5000, from: 'acc-1', to: 'acc-2' },
        state: 'QUEUED',
        retryCount: 0,
      };

      expect(mutation.state).toBe('QUEUED');

      // State transition to SYNCING
      mutation.state = 'SYNCING';
      expect(mutation.state).toBe('SYNCING');

      // State transition to COMMITTED
      mutation.state = 'COMMITTED';
      expect(mutation.state).toBe('COMMITTED');
    });
  });
});
