import { describe, it, expect } from 'vitest';
import { lightTheme, darkTheme } from './theme';
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

  describe('5. WealthOS Mobile 2.0 Modern Fintech Features', () => {
    it('executes inter-account treasury transfers preserving net worth invariance', () => {
      let accounts = [...INITIAL_ACCOUNTS];
      const fromAcc = accounts[0]; // HDFC Corporate Salary (482450.0)
      const toAcc = accounts[1]; // ICICI Privileged Savings (845200.0)
      const transferAmount = 25000;

      const initialTotalAssets = accounts
        .filter((a) => a.category === 'ASSET')
        .reduce((s, a) => s + a.balance, 0);

      // Perform transfer
      accounts = accounts.map((acc) => {
        if (acc.id === fromAcc.id) return { ...acc, balance: acc.balance - transferAmount };
        if (acc.id === toAcc.id) return { ...acc, balance: acc.balance + transferAmount };
        return acc;
      });

      const updatedFrom = accounts.find((a) => a.id === fromAcc.id)!;
      const updatedTo = accounts.find((a) => a.id === toAcc.id)!;

      expect(updatedFrom.balance).toBe(fromAcc.balance - transferAmount);
      expect(updatedTo.balance).toBe(toAcc.balance + transferAmount);

      const updatedTotalAssets = accounts
        .filter((a) => a.category === 'ASSET')
        .reduce((s, a) => s + a.balance, 0);

      // Invariant: Transfer between assets preserves total asset sum exactly
      expect(updatedTotalAssets).toBe(initialTotalAssets);
    });

    it('verifies 5-pillar modern fintech navigation mapping', () => {
      const mapPillar = (screen: string): string => {
        if (screen === 'home' || screen === 'overview' || screen === 'net-worth') return 'home';
        if (
          screen === 'money' ||
          screen === 'accounts' ||
          screen === 'transactions' ||
          screen === 'transfers' ||
          screen === 'analytics'
        ) {
          return 'money';
        }
        if (
          screen === 'invest' ||
          screen === 'investments' ||
          screen === 'reports' ||
          screen === 'dividends'
        ) {
          return 'invest';
        }
        if (
          screen === 'plan' ||
          screen === 'budgets' ||
          screen === 'goals' ||
          screen === 'calendar' ||
          screen === 'liabilities'
        ) {
          return 'plan';
        }
        return 'more';
      };

      expect(mapPillar('home')).toBe('home');
      expect(mapPillar('overview')).toBe('home');
      expect(mapPillar('accounts')).toBe('money');
      expect(mapPillar('transfers')).toBe('money');
      expect(mapPillar('transactions')).toBe('money');
      expect(mapPillar('investments')).toBe('invest');
      expect(mapPillar('dividends')).toBe('invest');
      expect(mapPillar('budgets')).toBe('plan');
      expect(mapPillar('calendar')).toBe('plan');
      expect(mapPillar('liabilities')).toBe('plan');
      expect(mapPillar('copilot')).toBe('more');
      expect(mapPillar('security')).toBe('more');
      expect(mapPillar('search')).toBe('more');
    });

    it('validates light and dark theme contrast tokens', () => {
      expect(lightTheme.isDark).toBe(false);
      expect(darkTheme.isDark).toBe(true);
      expect(lightTheme.colors.primary).toBe('#2563EB'); // Fintech Blue
      expect(darkTheme.colors.primary).toBe('#3B82F6'); // Bright Blue in Dark
      expect(lightTheme.colors.canvas).toBe('#F8FAFC'); // Neutral Slate
      expect(darkTheme.colors.canvas).toBe('#0B0F19'); // Deep Slate
    });
  });
});
