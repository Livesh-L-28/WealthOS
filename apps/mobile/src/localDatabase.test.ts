import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptedLocalDatabase, LOCAL_DB_CONFIG } from './localDatabase';
import { MemorySecureStoreDriver } from './storage';

describe('EncryptedLocalDatabase (Mobile Offline-First Persistence & AES-256-GCM)', () => {
  let memoryDriver: MemorySecureStoreDriver;
  let db: EncryptedLocalDatabase;

  beforeEach(() => {
    memoryDriver = new MemorySecureStoreDriver();
    db = new EncryptedLocalDatabase(memoryDriver);
  });

  it('initializes and generates a 256-bit encryption key on first run', async () => {
    await db.initialize();
    const storedKey = await memoryDriver.getItemAsync(LOCAL_DB_CONFIG.KEY_STORAGE_KEY);
    expect(storedKey).toBeDefined();
    expect(storedKey?.length).toBe(64); // 32 bytes in hex = 64 characters
  });

  it('guarantees confidentiality: persisted data at rest is high-entropy ciphertext with no plaintext', async () => {
    const tenantId = 'tenant-confidential-01';
    const snapshotKey = 'portfolio';
    const sensitivePayload = {
      holding: 'RELIANCE',
      quantity: 500,
      total_valuation: '1450000.50',
      account_number: '••••9921',
    };

    await db.saveSnapshot(tenantId, snapshotKey, sensitivePayload);

    // Inspect the actual persisted record in driver (Simulate local file extraction)
    const storageKey = `${LOCAL_DB_CONFIG.STORAGE_PREFIX}${tenantId}.${snapshotKey}`;
    const rawPersisted = await memoryDriver.getItemAsync(storageKey);
    expect(rawPersisted).not.toBeNull();

    const storedRecord = JSON.parse(rawPersisted!);
    // Prove Confidentiality
    expect(storedRecord.ciphertext).toBeDefined();
    expect(storedRecord.iv).toBeDefined();
    expect(storedRecord.tag).toBeDefined();
    expect(rawPersisted).not.toContain('RELIANCE');
    expect(rawPersisted).not.toContain('1450000.50');
    expect(rawPersisted).not.toContain('••••9921');
  });

  it('persists and retrieves a financial snapshot with verified decryption', async () => {
    const tenantId = 'tenant-alpha-001';
    const snapshotKey = 'dashboard';
    const mockData = {
      net_worth: '1250000.00',
      liquid_cash: '320000.00',
      active_accounts: 3,
    };

    const saved = await db.saveSnapshot(tenantId, snapshotKey, mockData);
    expect(saved.tenantId).toBe(tenantId);
    expect(saved.checksum).toBeDefined();

    const retrieved = await db.getSnapshot<typeof mockData>(tenantId, snapshotKey);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.data.net_worth).toBe('1250000.00');
    expect(retrieved?.tenantId).toBe(tenantId);
  });

  it('enforces tenant isolation and rejects cross-tenant retrieval', async () => {
    const tenantA = 'tenant-alpha';
    const tenantB = 'tenant-beta';
    const mockData = { balance: '50000.00' };

    await db.saveSnapshot(tenantA, 'accounts', mockData);

    const crossTenantResult = await db.getSnapshot(tenantB, 'accounts');
    expect(crossTenantResult).toBeNull();
  });

  it('detects tampering and discards corrupted snapshots (fail-closed)', async () => {
    const tenantId = 'tenant-sec-01';
    await db.saveSnapshot(tenantId, 'net_worth', { total: '100000.00' });

    // Tamper with the raw ciphertext in storage
    const storageKey = `${LOCAL_DB_CONFIG.STORAGE_PREFIX}${tenantId}.net_worth`;
    const raw = await memoryDriver.getItemAsync(storageKey);
    const parsed = JSON.parse(raw!);
    // Bit flip in ciphertext
    parsed.ciphertext = '00' + parsed.ciphertext.slice(2);
    await memoryDriver.setItemAsync(storageKey, JSON.stringify(parsed));

    // Retrieval should throw integrity violation and purge corrupted record
    await expect(db.getSnapshot(tenantId, 'net_worth')).rejects.toThrow(/integrity or decryption violation/);

    // Confirm corrupted snapshot was purged immediately from disk
    const afterPurge = await memoryDriver.getItemAsync(storageKey);
    expect(afterPurge).toBeNull();
  });

  it('securely wipes all snapshots and shreds master key on logout', async () => {
    const tenantId = 'tenant-wipe-test';
    await db.saveSnapshot(tenantId, 'dashboard', { metrics: true });
    await db.saveSnapshot(tenantId, 'accounts', { list: [1, 2] });

    await db.purgeAllData([tenantId]);

    // Master key shredded
    const key = await memoryDriver.getItemAsync(LOCAL_DB_CONFIG.KEY_STORAGE_KEY);
    expect(key).toBeNull();

    // Snapshot retrieval fails closed
    const retrievedDash = await db.getSnapshot(tenantId, 'dashboard');
    expect(retrievedDash).toBeNull();
  });
});
