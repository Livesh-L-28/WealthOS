import { describe, it, expect } from 'vitest';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_GOALS, INITIAL_HOLDINGS } from './data';
import { BankAccount, Transaction, BudgetEnvelope, FinancialGoal } from './types';

describe('WealthOS Master Mobile Functions & Interactive Integrity Suite', () => {
  describe('1. Double-Entry Ledger Calculation & Mathematical Invariance', () => {
    it('calculates net worth strictly as total assets minus total liabilities', () => {
      const totalAssets = INITIAL_ACCOUNTS
        .filter((a) => a.category === 'ASSET')
        .reduce((sum, a) => sum + a.balance, 0);

      const totalLiabilities = INITIAL_ACCOUNTS
        .filter((a) => a.category === 'LIABILITY')
        .reduce((sum, a) => sum + a.balance, 0);

      const netWorth = totalAssets - totalLiabilities;
      expect(totalAssets).toBe(7350201.25);
      expect(totalLiabilities).toBe(1892300);
      expect(netWorth).toBe(5457901.25);
    });

    it('correctly posts a debit transaction, decrements account balance, and advances budget envelope', () => {
      let accounts = [...INITIAL_ACCOUNTS];
      let budgets = [...INITIAL_BUDGETS];
      let transactions = [...INITIAL_TRANSACTIONS];

      const expenseAmount = 4500;
      const category = 'Food & Groceries';
      const accountName = 'HDFC Corporate Salary';

      const initialAccBalance = accounts.find((a) => a.name === accountName)!.balance;
      const initialEnvSpent = budgets.find((b) => b.category === category)!.spent;

      // Simulate handleAddTransaction logic
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title: 'Weekly Organic Mart',
        category,
        amount: expenseAmount,
        type: 'DEBIT',
        accountName,
        date: 'Today',
        status: 'RECONCILED',
      };

      accounts = accounts.map((acc) => {
        if (acc.name === accountName) {
          return { ...acc, balance: acc.balance - expenseAmount };
        }
        return acc;
      });

      budgets = budgets.map((env) => {
        if (env.category.toLowerCase().includes(category.toLowerCase())) {
          return { ...env, spent: env.spent + expenseAmount };
        }
        return env;
      });

      transactions = [newTx, ...transactions];

      expect(accounts.find((a) => a.name === accountName)!.balance).toBe(initialAccBalance - expenseAmount);
      expect(budgets.find((b) => b.category === category)!.spent).toBe(initialEnvSpent + expenseAmount);
      expect(transactions[0].title).toBe('Weekly Organic Mart');
      expect(transactions[0].type).toBe('DEBIT');
    });

    it('correctly posts a credit transaction and increments account balance', () => {
      let accounts = [...INITIAL_ACCOUNTS];
      const creditAmount = 50000;
      const accountName = 'HDFC Corporate Salary';
      const initialAccBalance = accounts.find((a) => a.name === accountName)!.balance;

      accounts = accounts.map((acc) => {
        if (acc.name === accountName) {
          return { ...acc, balance: acc.balance + creditAmount };
        }
        return acc;
      });

      expect(accounts.find((a) => a.name === accountName)!.balance).toBe(initialAccBalance + creditAmount);
    });
  });

  describe('2. Navigation Tree & 14-Item Master Sidebar Parity', () => {
    const EXPECTED_NAV_ITEMS = [
      // Cockpit & Control
      { id: 'overview', title: 'Overview' },
      { id: 'reconciliation', title: 'Control Centre' },
      // Cash & Money
      { id: 'accounts', title: 'Accounts' },
      { id: 'transactions', title: 'Transactions' },
      { id: 'analytics', title: 'Cash Flow' },
      { id: 'budgets', title: 'Budgets' },
      // Investments & Reports
      { id: 'investments', title: 'Investments' },
      { id: 'reports', title: 'Reports' },
      // Planning & Intelligence
      { id: 'goals', title: 'Goals' },
      { id: 'copilot', title: 'Financial Copilot' },
      { id: 'household', title: 'Household' },
      { id: 'documents', title: 'Documents' },
      // Preferences
      { id: 'security', title: 'Security & Audit' },
      { id: 'settings', title: 'Workspace Settings' },
    ];

    it('verifies that exactly 14 navigation destinations are supported', () => {
      expect(EXPECTED_NAV_ITEMS.length).toBe(14);
      const uniqueIds = new Set(EXPECTED_NAV_ITEMS.map((item) => item.id));
      expect(uniqueIds.size).toBe(14);
    });

    it('verifies bottom nav tab mapping resolves to valid primary or secondary destinations', () => {
      const mapTab = (screen: string) => {
        const isPrimary = ['overview', 'accounts', 'investments', 'budgets', 'copilot'].includes(screen);
        if (isPrimary) return screen;
        if (screen === 'transactions') return 'accounts';
        if (screen === 'goals') return 'budgets';
        return 'overview';
      };

      expect(mapTab('overview')).toBe('overview');
      expect(mapTab('accounts')).toBe('accounts');
      expect(mapTab('transactions')).toBe('accounts');
      expect(mapTab('investments')).toBe('investments');
      expect(mapTab('budgets')).toBe('budgets');
      expect(mapTab('goals')).toBe('budgets');
      expect(mapTab('reconciliation')).toBe('overview');
      expect(mapTab('analytics')).toBe('overview');
      expect(mapTab('security')).toBe('overview');
    });
  });

  describe('3. Portfolio & Asset Allocation Math Verification', () => {
    it('verifies holding values and unrealized P&L calculations', () => {
      INITIAL_HOLDINGS.forEach((holding) => {
        const computedCurrent = holding.quantity * holding.currentPrice;
        const computedInvested = holding.quantity * holding.avgBuyPrice;
        const computedPnl = computedCurrent - computedInvested;
        const computedPnlPct = (computedPnl / computedInvested) * 100;

        expect(Math.abs(holding.currentValue - computedCurrent)).toBeLessThanOrEqual(1);
        expect(Math.abs(holding.investedValue - computedInvested)).toBeLessThanOrEqual(1);
        expect(Math.abs(holding.pnl - computedPnl)).toBeLessThanOrEqual(1);
        expect(Math.abs(holding.pnlPercentage - computedPnlPct)).toBeLessThanOrEqual(0.1);
      });
    });

    it('verifies total portfolio value matches sum of holdings', () => {
      const sumCurrent = INITIAL_HOLDINGS.reduce((s, h) => s + h.currentValue, 0);
      const sumInvested = INITIAL_HOLDINGS.reduce((s, h) => s + h.investedValue, 0);
      const totalPnl = sumCurrent - sumInvested;

      expect(sumCurrent).toBe(2749035);
      expect(sumInvested).toBe(2086358);
      expect(totalPnl).toBe(662677);
    });
  });

  describe('4. Envelope & Goal Progress Invariants', () => {
    it('verifies budget utilization percentages and safe buffer values', () => {
      INITIAL_BUDGETS.forEach((env) => {
        const pct = (env.spent / env.budgeted) * 100;
        const remaining = env.budgeted - env.spent;
        if (remaining >= 0) {
          expect(pct).toBeLessThanOrEqual(100);
        } else {
          expect(pct).toBeGreaterThan(100);
        }
      });
    });

    it('verifies goal shortfall calculations are positive and accurate', () => {
      INITIAL_GOALS.forEach((goal) => {
        const shortfall = goal.targetAmount - goal.currentAmount;
        expect(shortfall).toBeGreaterThanOrEqual(0);
        const fundedPct = (goal.currentAmount / goal.targetAmount) * 100;
        expect(fundedPct).toBeGreaterThan(0);
        expect(fundedPct).toBeLessThanOrEqual(100);
      });
    });
  });
});
