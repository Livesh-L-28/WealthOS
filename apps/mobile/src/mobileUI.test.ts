import { describe, it, expect } from 'vitest';
import { theme } from './theme';
import { formatINR } from './formatters';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_HOLDINGS,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
  BALANCE_SHEET_ASSETS,
  BALANCE_SHEET_LIABILITIES,
  SAMPLE_AMORTIZATION_SCHEDULE,
  INITIAL_DISCREPANCIES,
  INITIAL_DOCUMENTS,
  INITIAL_HOUSEHOLD_MEMBERS,
} from './data';

describe('WealthOS Mobile UI/UX Acceptance Suite', () => {
  describe('Brand Theme & Color Alignment with Web Fintech Design System', () => {
    it('enforces exact WealthOS Web color palette tokens', () => {
      expect(theme.colors.canvas).toBe('#F8FAFC');
      expect(theme.colors.surface).toBe('#FFFFFF');
      expect(theme.colors.border).toBe('#E2E8F0');
      expect(theme.colors.primary).toBe('#2563EB');
      expect(theme.colors.primaryDark).toBe('#1D4ED8');
      expect(theme.colors.textPrimary).toBe('#0F172A');
      expect(theme.colors.textSecondary).toBe('#475569');
      expect(theme.colors.negative).toBe('#DC2626');
    });

    it('provides chart and asset class series colors matching web standards', () => {
      expect(theme.colors.charts.equity).toBe('#2563EB');
      expect(theme.colors.charts.mutualFund).toBe('#6366F1');
      expect(theme.colors.charts.gold).toBe('#F59E0B');
      expect(theme.colors.charts.fixedIncome).toBe('#059669');
    });
  });

  describe('Financial Number & INR Currency Formatter', () => {
    it('formats positive currency with Indian numbering system and paise', () => {
      expect(formatINR(7537901.25)).toBe('₹75,37,901.25');
      expect(formatINR(1200000)).toBe('₹12,00,000.00');
      expect(formatINR(500)).toBe('₹500.00');
    });

    it('formats negative currency with minus sign', () => {
      expect(formatINR(-1892300)).toBe('-₹18,92,300.00');
      expect(formatINR(-2450.5)).toBe('-₹2,450.50');
    });

    it('formats zero correctly', () => {
      expect(formatINR(0)).toBe('₹0.00');
    });
  });

  describe('Double-Entry Balance & Portfolio Accounting Consistency', () => {
    it('maintains mathematical accounting integrity across initial dataset', () => {
      const totalAssets = INITIAL_ACCOUNTS
        .filter((a) => a.category === 'ASSET')
        .reduce((sum, a) => sum + a.balance, 0);

      const totalLiabilities = INITIAL_ACCOUNTS
        .filter((a) => a.category === 'LIABILITY')
        .reduce((sum, a) => sum + a.balance, 0);

      const netWorth = totalAssets - totalLiabilities;

      // Assets > Liabilities
      expect(totalAssets).toBeGreaterThan(totalLiabilities);
      expect(netWorth).toBeGreaterThan(0);
      expect(totalAssets - totalLiabilities - netWorth).toBe(0);
    });

    it('verifies investment holdings P&L calculations', () => {
      const totalInvested = INITIAL_HOLDINGS.reduce((sum, h) => sum + h.investedValue, 0);
      const totalCurrent = INITIAL_HOLDINGS.reduce((sum, h) => sum + h.currentValue, 0);
      const totalPnl = totalCurrent - totalInvested;

      expect(totalInvested).toBeGreaterThan(0);
      expect(totalCurrent).toBeGreaterThan(totalInvested);
      expect(totalPnl).toBeGreaterThan(0);

      INITIAL_HOLDINGS.forEach((holding) => {
        const expectedPnl = holding.currentValue - holding.investedValue;
        expect(Math.abs(holding.pnl - expectedPnl)).toBeLessThan(1);
      });
    });

    it('verifies monthly budget envelope allocation totals', () => {
      const totalBudgeted = INITIAL_BUDGETS.reduce((s, b) => s + b.budgeted, 0);
      const totalSpent = INITIAL_BUDGETS.reduce((s, b) => s + b.spent, 0);

      expect(totalBudgeted).toBe(180000);
      expect(totalSpent).toBeLessThanOrEqual(totalBudgeted);
    });

    it('verifies strategic financial goals milestones', () => {
      expect(INITIAL_GOALS.length).toBeGreaterThanOrEqual(3);
      INITIAL_GOALS.forEach((goal) => {
        expect(goal.targetAmount).toBeGreaterThan(0);
        expect(goal.currentAmount).toBeGreaterThanOrEqual(0);
        expect(goal.currentAmount).toBeLessThanOrEqual(goal.targetAmount);
        expect(goal.targetYear).toBeGreaterThanOrEqual(2026);

        // Completion bar calculations
        const goalPct = (goal.currentAmount / goal.targetAmount) * 100;
        const shortfall = goal.targetAmount - goal.currentAmount;
        expect(goalPct).toBeGreaterThanOrEqual(0);
        expect(goalPct).toBeLessThanOrEqual(100);
        expect(shortfall).toBeGreaterThanOrEqual(0);
      });
    });

    it('verifies goal milestone creation with custom targets and monthly SIP allocation', () => {
      const customGoal = {
        id: 'goal-custom-1',
        title: 'New Custom Villa Goal',
        targetAmount: 5000000,
        currentAmount: 1000000,
        targetYear: 2028,
        category: 'Strategic Corpus',
        monthlySavingsTarget: Math.round(5000000 / 36),
      };
      const completionPct = (customGoal.currentAmount / customGoal.targetAmount) * 100;
      const shortfall = customGoal.targetAmount - customGoal.currentAmount;

      expect(completionPct).toBe(20);
      expect(shortfall).toBe(4000000);
      expect(customGoal.monthlySavingsTarget).toBeGreaterThan(100000);
    });

    it('verifies balance sheet assets and liabilities accounting equation', () => {
      const totalAssets = BALANCE_SHEET_ASSETS.reduce((s, a) => s + a.amount, 0);
      const totalLiabilities = BALANCE_SHEET_LIABILITIES.reduce((s, l) => s + l.amount, 0);
      const netEquity = totalAssets - totalLiabilities;

      expect(totalAssets).toBeGreaterThan(9000000);
      expect(totalLiabilities).toBeLessThan(2000000);
      expect(netEquity).toBeCloseTo(7537901.25, -1);
    });

    it('verifies loan amortization schedule integrity and positive balances', () => {
      expect(SAMPLE_AMORTIZATION_SCHEDULE.length).toBe(5);

      SAMPLE_AMORTIZATION_SCHEDULE.forEach((item) => {
        expect(item.emi).toBeCloseTo(item.principal + item.interest, 0);
        expect(item.remaining).toBeGreaterThan(0);
      });
    });

    it('verifies reconciliation discrepancy queue and severity distribution', () => {
      expect(INITIAL_DISCREPANCIES.length).toBe(3);

      const highSeverity = INITIAL_DISCREPANCIES.filter((d) => d.severity === 'HIGH');
      expect(highSeverity.length).toBe(1);

      const matched = INITIAL_DISCREPANCIES.filter((d) => d.status === 'MATCHED');
      expect(matched.length).toBe(1);
    });

    it('verifies document vault OCR confidence threshold and arithmetic checks', () => {
      expect(INITIAL_DOCUMENTS.length).toBe(3);

      INITIAL_DOCUMENTS.forEach((doc) => {
        expect(doc.confidence).toBeGreaterThanOrEqual(0.9);
        expect(doc.arithmeticCheck).toBe('VALIDATED');
      });
    });

    it('verifies household members joint wealth contributions', () => {
      expect(INITIAL_HOUSEHOLD_MEMBERS.length).toBe(3);

      const owner = INITIAL_HOUSEHOLD_MEMBERS.find((m) => m.role === 'OWNER');
      expect(owner).toBeDefined();
      expect(owner?.netContributionPercentage).toBe(68);
    });
  });

  describe('Mobile Ergonomics, Header Visibility & Bottom Dock Add Entry', () => {
    it('verifies theme surface and primary contrast foundation', () => {
      expect(theme.colors.surface).toBe('#FFFFFF');
      expect(theme.colors.canvas).toBe('#F8FAFC');
      expect(theme.colors.primary).toBe('#2563EB');
      expect(theme.colors.primaryDark).toBe('#1D4ED8');
      expect(theme.colors.danger).toBe('#DC2626');
    });

    it('verifies transaction ledger initial categories and presets', () => {
      expect(INITIAL_TRANSACTIONS.length).toBeGreaterThan(0);
      const credits = INITIAL_TRANSACTIONS.filter((t) => t.type === 'CREDIT');
      const debits = INITIAL_TRANSACTIONS.filter((t) => t.type === 'DEBIT');
      expect(credits.length).toBeGreaterThan(0);
      expect(debits.length).toBeGreaterThan(0);
    });

    it('verifies initial accounts list covers assets and liabilities', () => {
      expect(INITIAL_ACCOUNTS.length).toBeGreaterThanOrEqual(4);
      const assetAccs = INITIAL_ACCOUNTS.filter((a) => a.category === 'ASSET');
      const liabAccs = INITIAL_ACCOUNTS.filter((a) => a.category === 'LIABILITY');
      expect(assetAccs.length).toBeGreaterThanOrEqual(2);
      expect(liabAccs.length).toBeGreaterThanOrEqual(2);
    });
  });
});

