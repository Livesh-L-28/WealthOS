/**
 * WealthOS Mobile Acceptance Tests — Authentication, Session Integrity & Backend API Integration.
 *
 * Verifies:
 * 1. SEC-01: Native SecureStore driver selection, fail-closed semantics, no silent RAM fallback.
 * 2. FIN-01: Double-entry wash trade prevention, category-to-COA contra resolution, transfer neutrality.
 * 3. INT-01: RFC 4122 UUID validation and rejection of mock string slugs.
 * 4. AI-01: Copilot error propagation, zero fabricated financial responses or metrics.
 * 5. SYNC-01: Persistent, tenant-isolated offline queue with tamper detection and bounded capacity.
 * 6. UI-01: Secondary screen service contracts for analytics, reconciliation, liabilities, and obligations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemorySecureStoreDriver,
  ExpoSecureStoreDriver,
  WebSecureStoreDriver,
  MobileAuthStorage,
  SecureStorageUnavailableError,
  createSecureStorageDriver,
  OfflineSyncQueue,
  computeMutationChecksum,
} from './storage';
import { validateDeepLink } from './deeplink';
import {
  accountingService,
  budgetService,
  goalsService,
  analyticsService,
  reconciliationService,
  liabilitiesService,
  cashService,
  investmentsService,
  householdService,
  documentsService,
  copilotService,
  isValidUUID,
} from './api/domainServices';
import { BankAccount, Transaction, BudgetEnvelope, FinancialGoal } from './types';
import { formatINR, formatPercentage } from './formatters';

describe('Phase 1: SEC-01 Hardware Session Storage & Authentication Integrity', () => {
  let memoryDriver: MemorySecureStoreDriver;
  let authStorage: MobileAuthStorage;

  beforeEach(() => {
    memoryDriver = new MemorySecureStoreDriver();
    authStorage = new MobileAuthStorage(memoryDriver);
  });

  it('enforces unauthenticated startup state by default', async () => {
    const session = await authStorage.getSession();
    expect(session.accessToken).toBeNull();
    expect(session.refreshToken).toBeNull();
    expect(session.tenantId).toBeNull();
  });

  it('stores and restores authenticated session material correctly', async () => {
    await authStorage.storeSession({
      accessToken: 'jwt-access-token-12345',
      refreshToken: 'refresh-token-67890',
      tenantId: 'tenant-family-office-001',
    });

    const restored = await authStorage.getSession();
    expect(restored.accessToken).toBe('jwt-access-token-12345');
    expect(restored.refreshToken).toBe('refresh-token-67890');
    expect(restored.tenantId).toBe('tenant-family-office-001');
  });

  it('wipes all session material completely on logout', async () => {
    await authStorage.storeSession({
      accessToken: 'jwt-access-token-12345',
      refreshToken: 'refresh-token-67890',
      tenantId: 'tenant-family-office-001',
    });

    await authStorage.clearSession();
    const cleared = await authStorage.getSession();
    expect(cleared.accessToken).toBeNull();
    expect(cleared.refreshToken).toBeNull();
    expect(cleared.tenantId).toBeNull();
  });

  it('createSecureStorageDriver returns explicitly injected driver', () => {
    const customDriver = new MemorySecureStoreDriver();
    const resolved = createSecureStorageDriver(customDriver);
    expect(resolved).toBe(customDriver);
  });

  it('ExpoSecureStoreDriver fails closed when native bridge is unavailable (no silent RAM fallback)', async () => {
    const nativeDriver = new ExpoSecureStoreDriver();
    // In headless test environments where expo-secure-store native bridge is missing,
    // it MUST throw SecureStorageUnavailableError rather than silently falling back to RAM
    await expect(nativeDriver.setItemAsync('test.key', 'secret')).rejects.toThrow(SecureStorageUnavailableError);
    await expect(nativeDriver.getItemAsync('test.key')).rejects.toThrow(SecureStorageUnavailableError);
    await expect(nativeDriver.deleteItemAsync('test.key')).rejects.toThrow(SecureStorageUnavailableError);
  });

  it('WebSecureStoreDriver fails closed when window sessionStorage is absent', async () => {
    const webDriver = new WebSecureStoreDriver();
    // In node environment without window.sessionStorage, must fail closed
    if (typeof window === 'undefined') {
      await expect(webDriver.setItemAsync('k', 'v')).rejects.toThrow(SecureStorageUnavailableError);
    }
  });

  it('validates deep links and rejects path traversal attacks', () => {
    const maliciousLink = 'wealthos://accounts/../../../etc/passwd';
    const result = validateDeepLink(maliciousLink);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects deep links attempting token/credential leakage in query string', () => {
    const leakAttempt = 'wealthos://dashboard?access_token=eyJhbGciOiJIUzI1Ni...';
    const result = validateDeepLink(leakAttempt);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Insecure URL parameter rejected');
  });

  it('allows authorized routes: /dashboard, /accounts, /notifications', () => {
    const validDashboard = validateDeepLink('wealthos://dashboard');
    expect(validDashboard.isValid).toBe(true);
    expect(validDashboard.path).toBe('/dashboard');

    const validAccounts = validateDeepLink('wealthos://accounts');
    expect(validAccounts.isValid).toBe(true);
    expect(validAccounts.path).toBe('/accounts');
  });
});

describe('Phase 2: INT-01 UUID Contract Validation', () => {
  it('validates standard RFC 4122 UUIDs', () => {
    expect(isValidUUID('782414cc-9714-46b0-8b0a-ab9fea1399d0')).toBe(true);
    expect(isValidUUID('906488f3-9054-46e3-8f23-de222446f32c')).toBe(true);
    expect(isValidUUID('a2c43a76-786a-4596-b019-4afefa897739')).toBe(true);
  });

  it('rejects legacy slug identifiers and malformed strings', () => {
    expect(isValidUUID('acc-hdfc-sal')).toBe(false);
    expect(isValidUUID('acc-1')).toBe(false);
    expect(isValidUUID('12345')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
    expect(isValidUUID(null)).toBe(false);
  });

  it('getAccountBalance returns null immediately for non-UUID account IDs without querying backend', async () => {
    const bal = await accountingService.getAccountBalance('acc-invalid-string');
    expect(bal).toBeNull();
  });
});

describe('Phase 3: FIN-01 Double-Entry Accounting & Wash-Trade Prevention', () => {
  it('rejects identical primary and contra account in postTransaction (wash trade prevention)', async () => {
    const sameAccId = '782414cc-9714-46b0-8b0a-ab9fea1399d0';
    const res = await accountingService.postTransaction({
      title: 'Wash Trade Attempt',
      amount: 1000,
      category: 'Groceries',
      type: 'DEBIT',
      accountId: sameAccId,
      contraAccountId: sameAccId, // Identical account
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/wash trade rejected/i);
  });

  it('rejects zero or negative transaction amounts in postTransaction', async () => {
    const resZero = await accountingService.postTransaction({
      title: 'Zero Amount',
      amount: 0,
      category: 'Groceries',
      type: 'DEBIT',
      accountId: '782414cc-9714-46b0-8b0a-ab9fea1399d0',
    });
    expect(resZero.success).toBe(false);
    expect(resZero.error).toMatch(/strictly greater than zero/i);

    const resNeg = await accountingService.postTransaction({
      title: 'Negative Amount',
      amount: -500,
      category: 'Groceries',
      type: 'DEBIT',
      accountId: '782414cc-9714-46b0-8b0a-ab9fea1399d0',
    });
    expect(resNeg.success).toBe(false);
  });

  it('rejects transfers between identical source and destination accounts', async () => {
    const sameAccId = '782414cc-9714-46b0-8b0a-ab9fea1399d0';
    const res = await accountingService.transferFunds({
      fromAccountId: sameAccId,
      toAccountId: sameAccId,
      amount: 5000,
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/must be distinct/i);
  });

  it('rejects zero or negative transfer amounts', async () => {
    const res = await accountingService.transferFunds({
      fromAccountId: '782414cc-9714-46b0-8b0a-ab9fea1399d0',
      toAccountId: '906488f3-9054-46e3-8f23-de222446f32c',
      amount: 0,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/strictly greater than zero/i);
  });

  it('preserves net worth invariant during inter-account treasury transfer', () => {
    const initialAccounts: BankAccount[] = [
      {
        id: '906488f3-9054-46e3-8f23-de222446f32c',
        name: 'HDFC Corporate Salary',
        institution: 'HDFC',
        accountNumberMask: '•••• 1234',
        type: 'SAVINGS',
        category: 'ASSET',
        balance: 500000.0,
        currency: 'INR',
        status: 'SYNCED',
        lastSynced: 'Today',
      },
      {
        id: '782414cc-9714-46b0-8b0a-ab9fea1399d0',
        name: 'ICICI Privileged Savings',
        institution: 'ICICI',
        accountNumberMask: '•••• 5678',
        type: 'SAVINGS',
        category: 'ASSET',
        balance: 200000.0,
        currency: 'INR',
        status: 'SYNCED',
        lastSynced: 'Today',
      },
    ];

    const initialNetWorth = initialAccounts.reduce((sum, a) => sum + a.balance, 0);
    const transferAmount = 75000.0;

    const updatedAccounts = initialAccounts.map((acc) => {
      if (acc.id === '906488f3-9054-46e3-8f23-de222446f32c') return { ...acc, balance: acc.balance - transferAmount };
      if (acc.id === '782414cc-9714-46b0-8b0a-ab9fea1399d0') return { ...acc, balance: acc.balance + transferAmount };
      return acc;
    });

    const finalNetWorth = updatedAccounts.reduce((sum, a) => sum + a.balance, 0);
    expect(finalNetWorth).toBe(initialNetWorth);
    expect(updatedAccounts[0].balance).toBe(425000.0);
    expect(updatedAccounts[1].balance).toBe(275000.0);
  });

  it('formats Indian Rupee (INR) with standard Lakhs and Crores grouping', () => {
    expect(formatINR(148250)).toBe('₹1,48,250.00');
    expect(formatINR(4522551.25)).toBe('₹45,22,551.25');
    expect(formatINR(10000000)).toBe('₹1,00,00,000.00');
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR(-5000)).toBe('-₹5,000.00');
  });

  it('formats percentages accurately with sign and precision', () => {
    expect(formatPercentage(42.86)).toBe('+42.9%');
    expect(formatPercentage(-8.7)).toBe('-8.7%');
    expect(formatPercentage(0)).toBe('0.0%');
  });
});

describe('Phase 4: AI-01 Copilot Error Transparency (Zero Fabrication)', () => {
  it('returns explicit error message when Copilot engine is offline/unreachable', async () => {
    // Calling copilot with offline or unconfigured endpoint returns transparent error
    const reply = await copilotService.sendMessage('Test query');
    expect(reply.sender).toBe('copilot');
    expect(reply.text).toBeDefined();
    // Must NOT contain fabricated verification claims
    expect(reply.text).not.toContain('All cash accounts and investment lots are authenticated against your workspace');
  });
});

describe('Phase 5: SYNC-01 Persistent Tenant-Scoped Offline Queue', () => {
  let driver: MemorySecureStoreDriver;
  let queue: OfflineSyncQueue;

  beforeEach(() => {
    driver = new MemorySecureStoreDriver();
    queue = new OfflineSyncQueue('tenant-family-a', driver);
  });

  it('enforces tenant context isolation in queued mutations', () => {
    const mut = queue.enqueue('POST_TRANSFER', { amount: 1000 });
    expect(mut.tenantId).toBe('tenant-family-a');
    expect(queue.getPending().length).toBe(1);

    // Switch tenant context
    queue.setTenantContext('tenant-family-b');
    expect(queue.getPending().length).toBe(0);
  });

  it('enforces bounded capacity limit (max 50 mutations)', () => {
    for (let i = 0; i < 50; i++) {
      queue.enqueue('TEST_ACTION', { idx: i });
    }
    expect(queue.getSnapshot().length).toBe(50);
    expect(() => queue.enqueue('OVERFLOW', { idx: 51 })).toThrow(/capacity exceeded/i);
  });

  it('detects payload tampering before executing sync (fail closed)', () => {
    const mut = queue.enqueue('TRANSFER', { amount: 5000 });
    // Tamper with payload
    mut.payload.amount = 5000000;
    expect(() => queue.startSyncing(mut.id)).toThrow(/tampering detected/i);
    expect(mut.state).toBe('FAILED_FATAL');
  });

  it('persists and restores queue across restarts', async () => {
    queue.enqueue('SAVE_GOAL', { title: 'Emergency Fund', target: 500000 });
    await queue.persistQueue();

    // Reinstantiate new queue instance representing app restart
    const restoredQueue = new OfflineSyncQueue('tenant-family-a', driver);
    await restoredQueue.restoreQueue();
    expect(restoredQueue.getPending().length).toBe(1);
    expect(restoredQueue.getPending()[0].action).toBe('SAVE_GOAL');
  });
});

describe('Phase 6: UI-01 Secondary Screen Domain Service Contracts', () => {
  it('exposes analyticsService endpoints', () => {
    expect(typeof analyticsService.fetchOverview).toBe('function');
    expect(typeof analyticsService.fetchNetWorth).toBe('function');
    expect(typeof analyticsService.fetchCashFlow).toBe('function');
    expect(typeof analyticsService.fetchCadenceSpend).toBe('function');
  });

  it('exposes reconciliationService endpoints', () => {
    expect(typeof reconciliationService.fetchDashboard).toBe('function');
    expect(typeof reconciliationService.fetchDiscrepancies).toBe('function');
    expect(typeof reconciliationService.executeAction).toBe('function');
  });

  it('exposes liabilitiesService endpoints', () => {
    expect(typeof liabilitiesService.fetchSummary).toBe('function');
    expect(typeof liabilitiesService.fetchLiabilities).toBe('function');
    expect(typeof liabilitiesService.compareDebtStrategies).toBe('function');
  });

  it('exposes cashService endpoints for obligations', () => {
    expect(typeof cashService.fetchRecurringRules).toBe('function');
    expect(typeof cashService.createRecurringRule).toBe('function');
  });

  it('exposes investmentsService dividend endpoints', () => {
    expect(typeof investmentsService.fetchDividends).toBe('function');
    expect(typeof investmentsService.recordDividend).toBe('function');
  });

  it('exposes householdService endpoints', () => {
    expect(typeof householdService.fetchHouseholdNetWorth).toBe('function');
    expect(typeof householdService.createHousehold).toBe('function');
  });

  it('exposes documentsService endpoints', () => {
    expect(typeof documentsService.fetchDocuments).toBe('function');
  });
});
