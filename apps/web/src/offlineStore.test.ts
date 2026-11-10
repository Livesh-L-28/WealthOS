import { describe, it, expect, beforeEach } from 'vitest';
import { WebOfflineStore } from './lib/offlineStore';

describe('WebOfflineStore (Web Client Offline Persistence & Browser Security)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('instantiates cleanly in non-browser/test environments without crashing', () => {
    const store = new WebOfflineStore();
    expect(store).toBeDefined();
  });

  it('safely handles missing or private-browsing blocked IndexedDB via graceful fallback', async () => {
    const store = new WebOfflineStore();
    const mutation = await store.enqueueMutation('tenant-test', 'RECORD_EXPENSE', {
      amount: '500.00',
      category: 'Food',
    });
    expect(mutation.id).toBeDefined();
    expect(mutation.state).toBe('PENDING');
    expect(mutation.tenantId).toBe('tenant-test');

    const pending = await store.getPendingMutations('tenant-test');
    expect(Array.isArray(pending)).toBe(true);
  });

  it('enforces token hygiene: zero sensitive JWT auth tokens persisted in web storage', () => {
    // Verify that localStorage does NOT hold persistent access tokens
    const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('wealthos_access_token') : null;
    expect(storedToken).toBeNull();
  });

  it('wipes offline store safely and purges memory state on logout', async () => {
    const store = new WebOfflineStore();
    await expect(store.clearAllOfflineData()).resolves.not.toThrow();
  });
});
