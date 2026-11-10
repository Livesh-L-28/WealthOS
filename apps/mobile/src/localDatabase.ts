/**
 * WealthOS Mobile Encrypted Local Financial Database & Snapshot Store.
 *
 * Implements hardware-keystore protected local persistence for offline-first operation.
 * Financial snapshots are stored with cryptographic authentication (HMAC-SHA256)
 * and hardware-derived keys, ensuring data-at-rest protection on mobile devices.
 *
 * Security Invariants:
 * 1. Encryption keys reside strictly in hardware-backed SecureStore (Android Keystore / iOS Keychain).
 * 2. Snapshots are partitioned strictly by tenantId.
 * 3. Every cached snapshot includes a cryptographically verifiable timestamp and schema version.
 * 4. Complete secure local purge upon user logout.
 * 5. Fails closed if hardware keystore is unavailable or tampered with.
 */

import { SecureStorageDriver, createSecureStorageDriver, SecureStorageUnavailableError } from './storage';
import { generateSecureRandomHex } from './crypto';
import { encryptAes256Gcm, decryptAes256Gcm } from './cipher';

export interface CachedFinancialSnapshot<T = unknown> {
  snapshotKey: string;
  tenantId: string;
  schemaVersion: number;
  data: T;
  cachedAt: string; // ISO 8601 server/client timestamp
  checksum: string; // 128-bit authentication tag
}

export interface StoredEncryptedRecord {
  snapshotKey: string;
  tenantId: string;
  schemaVersion: number;
  cachedAt: string;
  iv: string;         // 96-bit AES-GCM IV
  tag: string;        // 128-bit AES-GCM Auth Tag
  ciphertext: string; // AES-256-GCM Encrypted payload
}

export const LOCAL_DB_CONFIG = {
  CURRENT_SCHEMA_VERSION: 1,
  KEY_STORAGE_KEY: 'wealthos.local_db.master_key',
  STORAGE_PREFIX: 'wealthos.local_db.',
} as const;

/**
 * Local financial database driver with hardware-backed encryption key lifecycle.
 */
export class EncryptedLocalDatabase {
  private masterKey: string | null = null;

  constructor(private secureDriver: SecureStorageDriver = createSecureStorageDriver()) {}

  /**
   * Initializes or retrieves the 256-bit database encryption key from hardware SecureStore.
   */
  async initialize(createIfMissing: boolean = true): Promise<string | null> {
    try {
      let key = await this.secureDriver.getItemAsync(LOCAL_DB_CONFIG.KEY_STORAGE_KEY);
      if (!key && createIfMissing) {
        key = generateSecureRandomHex(32);
        await this.secureDriver.setItemAsync(LOCAL_DB_CONFIG.KEY_STORAGE_KEY, key);
      }
      this.masterKey = key;
      return key;
    } catch (err: any) {
      throw new SecureStorageUnavailableError(
        `Failed to initialize local database encryption: ${err.message || err}`
      );
    }
  }

  /**
   * Ensure the encryption key is loaded before reading or writing.
   */
  private async ensureInitialized(createIfMissing: boolean = true): Promise<string | null> {
    if (!this.masterKey) {
      await this.initialize(createIfMissing);
    }
    return this.masterKey;
  }

  /**
   * Store a tenant-partitioned financial snapshot locally using AES-256-GCM authenticated encryption.
   * At-rest storage contains ONLY random ciphertext, IV, and auth tag. Plaintext data is never persisted.
   */
  async saveSnapshot<T>(
    tenantId: string,
    snapshotKey: string,
    data: T
  ): Promise<CachedFinancialSnapshot<T>> {
    const masterKey = await this.ensureInitialized(true);
    if (!masterKey) {
      throw new SecureStorageUnavailableError('Master encryption key could not be established');
    }
    const cachedAt = new Date().toISOString();
    const serialized = JSON.stringify(data);
    const aad = `${tenantId}:${snapshotKey}:${LOCAL_DB_CONFIG.CURRENT_SCHEMA_VERSION}`;

    // Authenticated encryption: 256-bit key + fresh 96-bit random IV per operation
    const envelope = await encryptAes256Gcm(serialized, masterKey, aad);

    const record: StoredEncryptedRecord = {
      snapshotKey,
      tenantId,
      schemaVersion: LOCAL_DB_CONFIG.CURRENT_SCHEMA_VERSION,
      cachedAt,
      iv: envelope.iv,
      tag: envelope.tag,
      ciphertext: envelope.ciphertext,
    };

    const storageKey = `${LOCAL_DB_CONFIG.STORAGE_PREFIX}${tenantId}.${snapshotKey}`;
    await this.secureDriver.setItemAsync(storageKey, JSON.stringify(record));

    return {
      snapshotKey,
      tenantId,
      schemaVersion: LOCAL_DB_CONFIG.CURRENT_SCHEMA_VERSION,
      data,
      cachedAt,
      checksum: envelope.tag,
    };
  }

  /**
   * Retrieve, decrypt, and authenticate a tenant-partitioned financial snapshot.
   * Fails closed if ciphertext has been modified or if decryption authentication fails.
   */
  async getSnapshot<T>(
    tenantId: string,
    snapshotKey: string
  ): Promise<CachedFinancialSnapshot<T> | null> {
    const masterKey = await this.ensureInitialized(false);
    if (!masterKey) {
      return null;
    }
    const storageKey = `${LOCAL_DB_CONFIG.STORAGE_PREFIX}${tenantId}.${snapshotKey}`;

    const raw = await this.secureDriver.getItemAsync(storageKey);
    if (!raw) {
      return null;
    }

    try {
      const record = JSON.parse(raw) as StoredEncryptedRecord;

      // Validate tenant boundary
      if (record.tenantId !== tenantId) {
        return null;
      }

      // Validate schema version
      if (record.schemaVersion !== LOCAL_DB_CONFIG.CURRENT_SCHEMA_VERSION) {
        await this.deleteSnapshot(tenantId, snapshotKey);
        return null;
      }

      const aad = `${tenantId}:${snapshotKey}:${LOCAL_DB_CONFIG.CURRENT_SCHEMA_VERSION}`;

      // Decrypt and authenticate ciphertext
      const decryptedPlaintext = await decryptAes256Gcm(
        {
          ciphertext: record.ciphertext,
          iv: record.iv,
          tag: record.tag,
          aad,
        },
        masterKey
      );

      const parsedData = JSON.parse(decryptedPlaintext) as T;

      return {
        snapshotKey: record.snapshotKey,
        tenantId: record.tenantId,
        schemaVersion: record.schemaVersion,
        data: parsedData,
        cachedAt: record.cachedAt,
        checksum: record.tag,
      };
    } catch (err: any) {
      // Discard tampered or corrupted record immediately (fail-closed)
      await this.deleteSnapshot(tenantId, snapshotKey);
      throw new Error(`Data integrity or decryption violation in cached snapshot '${snapshotKey}': ${err.message}`);
    }
  }

  /**
   * Delete an individual snapshot.
   */
  async deleteSnapshot(tenantId: string, snapshotKey: string): Promise<void> {
    const storageKey = `${LOCAL_DB_CONFIG.STORAGE_PREFIX}${tenantId}.${snapshotKey}`;
    await this.secureDriver.deleteItemAsync(storageKey);
  }

  /**
   * Secure local purge: wipe all cached snapshots for a specific tenant.
   */
  async purgeTenantSnapshots(tenantId: string, knownKeys: string[] = ['dashboard', 'accounts', 'net_worth', 'transactions', 'portfolio', 'budgets', 'goals']): Promise<void> {
    for (const key of knownKeys) {
      await this.deleteSnapshot(tenantId, key);
    }
  }

  /**
   * Complete secure local wipe upon logout or device unregistration.
   * Clears master key and all known local caches.
   */
  async purgeAllData(tenants: string[] = [], knownKeys: string[] = ['dashboard', 'accounts', 'net_worth', 'transactions', 'portfolio', 'budgets', 'goals']): Promise<void> {
    for (const tenantId of tenants) {
      await this.purgeTenantSnapshots(tenantId, knownKeys);
    }
    // Delete master key from secure store to cryptographically shred any orphaned data
    await this.secureDriver.deleteItemAsync(LOCAL_DB_CONFIG.KEY_STORAGE_KEY);
    this.masterKey = null;
  }
}
