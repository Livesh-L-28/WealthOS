/**
 * WealthOS Web Client Offline Store & Pending Operation Queue.
 *
 * Implements an IndexedDB-backed durable storage layer for web offline resilience.
 * Stores minimal required financial snapshots and pending mutations.
 *
 * Privacy & Security Invariants:
 * 1. Financial snapshots are strictly scoped by tenantId.
 * 2. Sensitive authentication tokens are NEVER stored in IndexedDB or localStorage.
 * 3. All cached data is wiped immediately upon user logout or session revocation.
 * 4. Gracefully handles private browsing mode, quota exhaustion, and storage eviction.
 * 5. Explicitly acknowledges browser storage boundaries vs hardware-backed mobile keystores.
 */

export interface WebOfflineMutation {
  id: string;
  tenantId: string;
  operationType: string;
  entityId?: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  clientTimestamp: string;
  state: 'PENDING' | 'SYNCING' | 'ACCEPTED' | 'REJECTED' | 'CONFLICT';
  retryCount: number;
  lastError?: string;
}

export interface WebCachedSnapshot<T = unknown> {
  key: string;
  tenantId: string;
  data: T;
  cachedAt: string;
  schemaVersion: number;
}

const DB_NAME = 'WealthOS_WebOfflineDB';
const DB_VERSION = 1;
const SNAPSHOT_STORE = 'financial_snapshots';
const MUTATION_STORE = 'pending_mutations';

export class WebOfflineStore {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.dbPromise = this.openDb();
    }
  }

  private openDb(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
            const store = db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'compositeKey' });
            store.createIndex('tenantId', 'tenantId', { unique: false });
          }
          if (!db.objectStoreNames.contains(MUTATION_STORE)) {
            const store = db.createObjectStore(MUTATION_STORE, { keyPath: 'id' });
            store.createIndex('tenantId', 'tenantId', { unique: false });
            store.createIndex('state', 'state', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null); // Private browsing / quota error fallback
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Save a cached snapshot for a tenant.
   */
  async saveSnapshot<T>(tenantId: string, key: string, data: T): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
        const store = tx.objectStore(SNAPSHOT_STORE);
        const record: WebCachedSnapshot<T> & { compositeKey: string } = {
          compositeKey: `${tenantId}:${key}`,
          key,
          tenantId,
          data,
          cachedAt: new Date().toISOString(),
          schemaVersion: 1,
        };
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Retrieve a cached snapshot for a tenant.
   */
  async getSnapshot<T>(tenantId: string, key: string): Promise<WebCachedSnapshot<T> | null> {
    const db = await this.dbPromise;
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
        const store = tx.objectStore(SNAPSHOT_STORE);
        const req = store.get(`${tenantId}:${key}`);
        req.onsuccess = () => {
          if (req.result && req.result.tenantId === tenantId) {
            resolve(req.result as WebCachedSnapshot<T>);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Enqueue a pending mutation for offline synchronization.
   */
  async enqueueMutation(
    tenantId: string,
    operationType: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<WebOfflineMutation> {
    const id = `web-mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const mutation: WebOfflineMutation = {
      id,
      tenantId,
      operationType,
      payload,
      idempotencyKey: idempotencyKey || `idem-${id}`,
      clientTimestamp: new Date().toISOString(),
      state: 'PENDING',
      retryCount: 0,
    };

    const db = await this.dbPromise;
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(MUTATION_STORE, 'readwrite');
          tx.objectStore(MUTATION_STORE).put(mutation);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    return mutation;
  }

  /**
   * Get all pending mutations for a tenant.
   */
  async getPendingMutations(tenantId: string): Promise<WebOfflineMutation[]> {
    const db = await this.dbPromise;
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(MUTATION_STORE, 'readonly');
        const store = tx.objectStore(MUTATION_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result as WebOfflineMutation[]) || [];
          resolve(items.filter((m) => m.tenantId === tenantId && (m.state === 'PENDING' || m.state === 'SYNCING')));
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Purge all cached data and pending mutations upon logout.
   */
  async clearAllOfflineData(): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([SNAPSHOT_STORE, MUTATION_STORE], 'readwrite');
        tx.objectStore(SNAPSHOT_STORE).clear();
        tx.objectStore(MUTATION_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const webOfflineStore = new WebOfflineStore();

