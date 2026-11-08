import { describe, it, expect } from 'vitest';
import { validateDeepLink } from './deeplink';
import { OfflineSyncQueue } from './storage';

describe('WealthOS Mobile Security Engine', () => {
  describe('Deep Link Validation & Open Redirect Defense', () => {
    it('accepts valid allowlisted deep links with matching state', () => {
      const res = validateDeepLink('wealthos://auth/callback?code=auth_code_123&state=state_abc', 'state_abc');
      expect(res.isValid).toBe(true);
      expect(res.path).toBe('/auth/callback');
      expect(res.params.code).toBe('auth_code_123');
    });

    it('accepts internal navigation deep links', () => {
      const res = validateDeepLink('wealthos://dashboard');
      expect(res.isValid).toBe(true);
      expect(res.path).toBe('/dashboard');
    });

    it('rejects untrusted protocol schemes', () => {
      const res1 = validateDeepLink('javascript:alert(1)');
      expect(res1.isValid).toBe(false);
      expect(res1.error).toMatch(/Untrusted protocol scheme/);

      const res2 = validateDeepLink('http://app.wealthos.com/dashboard');
      expect(res2.isValid).toBe(false);
      expect(res2.error).toMatch(/Untrusted protocol scheme/);

      const res3 = validateDeepLink('attacker-app://dashboard');
      expect(res3.isValid).toBe(false);
    });

    it('rejects untrusted domains on https links', () => {
      const res = validateDeepLink('https://phishing-wealthos.com/dashboard');
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/Untrusted host/);
    });

    it('rejects non-allowlisted internal routes', () => {
      const res = validateDeepLink('wealthos://admin/internal/debug');
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/Path not allowlisted/);
    });

    it('strictly rejects credentials or tokens in URL query parameters', () => {
      const res1 = validateDeepLink('wealthos://auth/callback?access_token=jwt_secret_token');
      expect(res1.isValid).toBe(false);
      expect(res1.error).toMatch(/Insecure URL parameter rejected/);

      const res2 = validateDeepLink('wealthos://dashboard?token=xyz');
      expect(res2.isValid).toBe(false);
      expect(res2.error).toMatch(/Insecure URL parameter rejected/);

      const res3 = validateDeepLink('wealthos://dashboard?password=secret');
      expect(res3.isValid).toBe(false);
    });

    it('detects and rejects state parameter mismatch during auth callback', () => {
      const res = validateDeepLink('wealthos://auth/callback?code=abc&state=attacker_state', 'expected_user_state');
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/State mismatch/);
    });

    it('blocks open redirect vulnerabilities in parameters', () => {
      const res1 = validateDeepLink('wealthos://dashboard?redirect=https://evil-site.com');
      expect(res1.isValid).toBe(false);
      expect(res1.error).toMatch(/Open redirect detected/);

      const res2 = validateDeepLink('wealthos://dashboard?redirect=//evil-site.com');
      expect(res2.isValid).toBe(false);
      expect(res2.error).toMatch(/Open redirect detected/);

      // Safe relative internal redirect is permitted
      const resSafe = validateDeepLink('wealthos://dashboard?redirect=/accounts');
      expect(resSafe.isValid).toBe(true);
    });
  });

  describe('Offline Mutation Queue Cryptographic Tamper Protection', () => {
    it('detects offline mutation payload tampering and halts execution', () => {
      const queue = new OfflineSyncQueue();
      const mut = queue.enqueue('POST_TRANSFER', {
        source_account: 'acc-1',
        destination_account: 'acc-2',
        amount: '1000.00',
      });

      expect(mut.checksum).toBeTruthy();

      // Simulate local storage tampering by malicious actor or corrupted cache
      mut.payload.amount = '1000000.00'; // Inflate transfer amount

      // Attempting to sync must fail closed with tampering error
      expect(() => queue.startSyncing(mut.id)).toThrow(/Tampering detected/);

      const snapshot = queue.getSnapshot().find((m) => m.id === mut.id);
      expect(snapshot?.state).toBe('FAILED_FATAL');
      expect(snapshot?.errorMessage).toMatch(/integrity verification failed/);
    });
  });
});

