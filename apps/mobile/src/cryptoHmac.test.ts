import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeHmacSha256,
  timingSafeEqual,
  generateSecureRandomHex,
  DeviceSecretManager,
  SignedEnvelope,
} from './crypto';
import { MemorySecureStoreDriver } from './storage';

describe('Offline Cryptographic HMAC & Device Keystore Audit', () => {
  let storage: MemorySecureStoreDriver;
  let secretManager: DeviceSecretManager;

  beforeEach(() => {
    storage = new MemorySecureStoreDriver();
    secretManager = new DeviceSecretManager(storage);
  });

  describe('1. Standards Conformance (RFC 4231 HMAC-SHA256 Test Vectors)', () => {
    it('passes RFC 4231 Test Case 2 (Key: "Jefe", Data: "what do ya want for nothing?")', () => {
      // Key: "Jefe" -> hex 4a656665
      const keyHex = '4a656665';
      const data = 'what do ya want for nothing?';
      const expected = '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843';
      const result = computeHmacSha256(keyHex, data);
      expect(result).toBe(expected);
    });

    it('passes RFC 4231 Test Case 1 (20-byte key of 0x0b, Data: "Hi There")', () => {
      const keyHex = '0b'.repeat(20);
      const data = 'Hi There';
      const expected = 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7';
      const result = computeHmacSha256(keyHex, data);
      expect(result).toBe(expected);
    });
  });

  describe('2. Device Secret Generation & Keystore Persistence', () => {
    it('generates a 256-bit (64 hex char) secret on first boot', async () => {
      const { key, version } = await secretManager.getActiveKey();
      expect(key).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(version).toBe(1);
    });

    it('persists the secret in SecureStore and retrieves the identical key on subsequent boots', async () => {
      const first = await secretManager.getActiveKey();
      const second = await secretManager.getActiveKey();
      expect(second.key).toBe(first.key);
      expect(second.version).toBe(first.version);
    });
  });

  describe('3. HMAC Generation, Envelope Signing & Verification', () => {
    it('signs an offline transaction mutation into an authenticated envelope', async () => {
      const payload = {
        action: 'CREATE_TRANSACTION',
        amount: 5000,
        category: 'Dining',
        account: '906488f3-9054-46e3-8f23-de222446f32c',
      };
      const envelope = await secretManager.signPayload(payload, 'tenant-123');

      expect(envelope.signature).toHaveLength(64);
      expect(envelope.keyVersion).toBe(1);
      expect(envelope.nonce).toHaveLength(16);
      expect(envelope.tenantId).toBe('tenant-123');

      const verification = await secretManager.verifyEnvelope(envelope, 'tenant-123');
      expect(verification.isValid).toBe(true);
    });
  });

  describe('4. Tampering & Integrity Detection', () => {
    it('detects payload tampering and rejects invalid signatures', async () => {
      const payload = { amount: 5000, recipient: 'Merchant A' };
      const envelope = await secretManager.signPayload(payload, 'tenant-123');

      // Attacker attempts to alter the expense amount from 5000 to 500000
      const tamperedEnvelope: SignedEnvelope<any> = {
        ...envelope,
        payload: { amount: 500000, recipient: 'Merchant A' },
      };

      const result = await secretManager.verifyEnvelope(tamperedEnvelope, 'tenant-123');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Cryptographic signature mismatch');
    });

    it('detects nonce tampering and rejects modified nonces', async () => {
      const payload = { amount: 2000 };
      const envelope = await secretManager.signPayload(payload, 'tenant-123');

      const tamperedEnvelope = { ...envelope, nonce: 'tampered-nonce-0' };
      const result = await secretManager.verifyEnvelope(tamperedEnvelope, 'tenant-123');
      expect(result.isValid).toBe(false);
    });

    it('detects timestamp tampering and rejects modified timestamps', async () => {
      const payload = { amount: 2000 };
      const envelope = await secretManager.signPayload(payload, 'tenant-123');

      const tamperedEnvelope = { ...envelope, timestamp: envelope.timestamp + 100000 };
      const result = await secretManager.verifyEnvelope(tamperedEnvelope, 'tenant-123');
      expect(result.isValid).toBe(false);
    });
  });

  describe('5. Multi-Tenant Queue Isolation', () => {
    it('rejects envelopes presented across different tenant contexts', async () => {
      const payload = { transfer: 1000 };
      const envelope = await secretManager.signPayload(payload, 'tenant-alpha');

      // Attempt to verify Tenant Alpha's signed mutation under Tenant Beta context
      const result = await secretManager.verifyEnvelope(envelope, 'tenant-beta');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Cross-tenant signature violation');
    });
  });

  describe('6. Key Rotation & Backward Compatibility', () => {
    it('supports seamless key rotation while retaining verification of older envelopes', async () => {
      const envelopeV1 = await secretManager.signPayload({ tx: 'v1-record' }, 'tenant-corp');
      expect(envelopeV1.keyVersion).toBe(1);

      // Rotate device key
      const { newKey, newVersion } = await secretManager.rotateKey();
      expect(newVersion).toBe(2);
      expect(newKey).not.toBe((await secretManager.getKeyByVersion(1))!);

      // Historical envelope v1 still verifies successfully
      const v1Check = await secretManager.verifyEnvelope(envelopeV1, 'tenant-corp');
      expect(v1Check.isValid).toBe(true);

      // New envelope uses v2 key
      const envelopeV2 = await secretManager.signPayload({ tx: 'v2-record' }, 'tenant-corp');
      expect(envelopeV2.keyVersion).toBe(2);

      const v2Check = await secretManager.verifyEnvelope(envelopeV2, 'tenant-corp');
      expect(v2Check.isValid).toBe(true);
    });
  });

  describe('7. Timing Attack Defense & Corruption Handling', () => {
    it('timingSafeEqual detects equality and inequality in constant time', () => {
      expect(timingSafeEqual('abcdef', 'abcdef')).toBe(true);
      expect(timingSafeEqual('abcdef', 'abcdeg')).toBe(false);
      expect(timingSafeEqual('abcdef', 'abcde')).toBe(false);
      expect(timingSafeEqual('', '')).toBe(true);
    });

    it('safely handles malformed and corrupted envelope structures', async () => {
      // @ts-expect-error Testing null input
      const res1 = await secretManager.verifyEnvelope(null, 'tenant-123');
      expect(res1.isValid).toBe(false);

      // @ts-expect-error Testing empty object
      const res2 = await secretManager.verifyEnvelope({}, 'tenant-123');
      expect(res2.isValid).toBe(false);

      const res3 = await secretManager.verifyEnvelope(
        { payload: {}, signature: 'bad', keyVersion: 999, timestamp: 0, nonce: '', tenantId: 'tenant-123' },
        'tenant-123'
      );
      expect(res3.isValid).toBe(false);
      expect(res3.reason).toContain('Unknown key version');
    });
  });
});

