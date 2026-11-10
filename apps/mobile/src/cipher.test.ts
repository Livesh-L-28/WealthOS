import { describe, it, expect } from 'vitest';
import { encryptAes256Gcm, decryptAes256Gcm } from './cipher';
import { generateSecureRandomHex } from './crypto';

describe('AES-256-GCM Cipher Primitives (Mobile Data-At-Rest Confidentiality)', () => {
  const masterKey = generateSecureRandomHex(32);

  it('encrypts plaintext into high-entropy ciphertext with a unique 96-bit IV', async () => {
    const sensitiveData = JSON.stringify({ net_worth: '2500000.00', account_number: '1234567890' });
    const envelope = await encryptAes256Gcm(sensitiveData, masterKey, 'tenant-alpha:dashboard');

    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.ciphertext).not.toContain('2500000.00'); // Confidentiality proven
    expect(envelope.ciphertext).not.toContain('account_number');
    expect(envelope.iv.length).toBe(24); // 12 bytes in hex = 24 chars
    expect(envelope.tag.length).toBe(32); // 16 bytes in hex = 32 chars

    const decrypted = await decryptAes256Gcm(envelope, masterKey);
    expect(decrypted).toBe(sensitiveData);
  });

  it('generates distinct IVs for identical plaintexts (zero nonce reuse)', async () => {
    const plaintext = 'Identical financial balance 5000.00';
    const env1 = await encryptAes256Gcm(plaintext, masterKey);
    const env2 = await encryptAes256Gcm(plaintext, masterKey);

    expect(env1.iv).not.toBe(env2.iv);
    expect(env1.ciphertext).not.toBe(env2.ciphertext); // Different ciphertext due to fresh IV
  });

  it('fails closed when ciphertext is tampered with (bit-flip rejection)', async () => {
    const plaintext = 'Secret ledger payload';
    const envelope = await encryptAes256Gcm(plaintext, masterKey, 'tenant-sec:audit');

    // Flip a bit in the ciphertext
    const tamperedCipher = 'ff' + envelope.ciphertext.slice(2);
    const tamperedEnvelope = { ...envelope, ciphertext: tamperedCipher };

    await expect(decryptAes256Gcm(tamperedEnvelope, masterKey)).rejects.toThrow(
      /Decryption or integrity verification failed/
    );
  });

  it('fails closed when AAD does not match (cross-tenant relocation prevention)', async () => {
    const plaintext = 'Confidential tenant data';
    const envelope = await encryptAes256Gcm(plaintext, masterKey, 'tenant-corp-01:portfolio');

    // Attempt decryption under tenant-corp-02 AAD
    const spoofedEnvelope = { ...envelope, aad: 'tenant-corp-02:portfolio' };

    await expect(decryptAes256Gcm(spoofedEnvelope, masterKey)).rejects.toThrow(
      /Decryption or integrity verification failed/
    );
  });
});

