import { describe, it, expect, vi, beforeEach } from 'vitest';

const memoryAsyncStore = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => {
  return {
    default: {
      getItem: vi.fn(async (key: string) => memoryAsyncStore.get(key) || null),
      setItem: vi.fn(async (key: string, val: string) => {
        memoryAsyncStore.set(key, val);
      }),
      multiSet: vi.fn(async (pairs: [string, string][]) => {
        for (const [k, v] of pairs) {
          memoryAsyncStore.set(k, v);
        }
      }),
      removeItem: vi.fn(async (key: string) => {
        memoryAsyncStore.delete(key);
      }),
      clear: vi.fn(async () => {
        memoryAsyncStore.clear();
      }),
    },
  };
});

// Provide web storage mock for Node environment
if (typeof (globalThis as any).window === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).window = {
    sessionStorage: {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
  };
}

import { syncService } from './api/domainServices';
import { localStore } from './storage/localStore';
import { BankAccount, Transaction, BudgetEnvelope, FinancialGoal, InvestmentHolding } from './types';
import { apiClient } from './api/client';

describe('Cross-Device Synchronization & OTP Verification Engine', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await localStore.resetToCleanSlate();
  });

  it('syncs complete ledger snapshot from Device A to cloud', async () => {
    const sampleAccounts: BankAccount[] = [
      {
        id: 'acc-hdfc-01',
        name: 'HDFC Premium Salary',
        institution: 'HDFC Bank',
        accountNumberMask: '•••• 4321',
        type: 'SAVINGS',
        category: 'ASSET',
        balance: 185000,
        currency: 'INR',
        status: 'ACTIVE',
        lastSynced: 'Just now',
      },
    ];

    const sampleTxs: Transaction[] = [
      {
        id: 'tx-001',
        title: 'Enterprise Architecture Consulting',
        amount: 185000,
        category: 'Consulting Income',
        type: 'CREDIT',
        accountName: 'HDFC Premium Salary',
        date: 'Today',
        status: 'RECONCILED',
      },
    ];

    const sampleBudgets: BudgetEnvelope[] = [
      {
        id: 'bg-001',
        category: 'Groceries & Provisions',
        budgeted: 25000,
        spent: 4200,
        color: '#10B981',
      },
    ];

    const sampleGoals: FinancialGoal[] = [
      {
        id: 'gl-001',
        title: 'Emergency Reserve Fund',
        targetAmount: 500000,
        currentAmount: 185000,
        targetYear: 2027,
        category: 'Emergency',
      },
    ];

    const sampleHoldings: InvestmentHolding[] = [
      {
        id: 'hl-001',
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        type: 'EQUITY',
        quantity: 50,
        avgBuyPrice: 3800,
        currentPrice: 4120,
        investedValue: 190000,
        currentValue: 206000,
        pnl: 16000,
        pnlPercentage: 8.42,
        fifoLotAge: '120d',
      },
    ];

    // Mock apiClient.request for sync endpoint
    const requestSpy = vi.spyOn(apiClient as any, 'request').mockResolvedValue({
      success: true,
      data: {
        tenant_id: 'tenant-primary-001',
        accounts: sampleAccounts,
        transactions: sampleTxs,
        budgets: sampleBudgets,
        goals: sampleGoals,
        holdings: sampleHoldings,
        updated_at: new Date().toISOString(),
      },
    });

    const success = await syncService.syncLedgerSnapshot({
      accounts: sampleAccounts,
      transactions: sampleTxs,
      budgets: sampleBudgets,
      goals: sampleGoals,
      holdings: sampleHoldings,
    });

    expect(success).toBe(true);
    expect(requestSpy).toHaveBeenCalledWith(
      '/api/v1/sync/ledger-state',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('hydrates Device B from cloud ledger snapshot fetched from Device A', async () => {
    const cloudSnapshot = {
      tenant_id: 'tenant-primary-001',
      accounts: [
        {
          id: 'acc-device-a',
          name: 'SBI Global Custody',
          institution: 'State Bank of India',
          accountNumberMask: '•••• 9988',
          type: 'SAVINGS' as const,
          category: 'ASSET' as const,
          balance: 350000,
          currency: 'INR',
          status: 'ACTIVE' as const,
          lastSynced: 'Just now',
        },
      ],
      transactions: [
        {
          id: 'tx-device-a-1',
          title: 'Direct Client Retainer',
          amount: 350000,
          category: 'Professional Services',
          type: 'CREDIT' as const,
          accountName: 'SBI Global Custody',
          date: 'Today',
          status: 'RECONCILED' as const,
        },
      ],
      budgets: [
        {
          id: 'b-device-a-1',
          category: 'Office & Technology',
          budgeted: 30000,
          spent: 8500,
          color: '#6366F1',
        },
      ],
      goals: [
        {
          id: 'g-device-a-1',
          title: 'Hardware Upgrade Fund',
          targetAmount: 200000,
          currentAmount: 120000,
          targetYear: 2026,
          category: 'Hardware',
        },
      ],
      holdings: [],
      updated_at: '2026-11-13T12:00:00Z',
    };

    // Simulate Device B fetching cloud snapshot
    vi.spyOn(apiClient as any, 'request').mockResolvedValue({
      success: true,
      data: cloudSnapshot,
    });

    const fetched = await syncService.fetchLedgerSnapshot();
    expect(fetched).not.toBeNull();
    expect(fetched?.accounts).toHaveLength(1);
    expect(fetched?.accounts?.[0].name).toBe('SBI Global Custody');
    expect(fetched?.transactions).toHaveLength(1);
    expect(fetched?.budgets).toHaveLength(1);
    expect(fetched?.goals).toHaveLength(1);

    // Hydrate Device B local storage with cloud snapshot
    if (fetched?.accounts) await localStore.saveAccounts(fetched.accounts);
    if (fetched?.transactions) await localStore.saveTransactions(fetched.transactions);
    if (fetched?.budgets) await localStore.saveBudgets(fetched.budgets);
    if (fetched?.goals) await localStore.saveGoals(fetched.goals);

    // Verify localStore on Device B is populated with Device A's records
    const stored = await localStore.loadLedgerState();
    expect(stored.accounts).toHaveLength(1);
    expect(stored.accounts[0].name).toBe('SBI Global Custody');
    expect(stored.accounts[0].balance).toBe(350000);
    expect(stored.transactions).toHaveLength(1);
    expect(stored.transactions[0].title).toBe('Direct Client Retainer');
    expect(stored.budgets).toHaveLength(1);
    expect(stored.goals).toHaveLength(1);
  });

  it('handles offline / network disconnect gracefully without crashing', async () => {
    vi.spyOn(apiClient as any, 'request').mockRejectedValue(new Error('Network unreachable'));

    const pushResult = await syncService.syncLedgerSnapshot({ accounts: [] });
    expect(pushResult).toBe(false);

    const fetchResult = await syncService.fetchLedgerSnapshot();
    expect(fetchResult).toBeNull();
  });
});
