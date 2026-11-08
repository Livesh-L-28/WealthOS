import { describe, it, expect } from 'vitest';
import { theme } from './theme';
import { formatINR } from './formatters';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_HOLDINGS,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
} from './data';

describe('WealthOS Mobile UI/UX Acceptance Suite', () => {
  describe('Brand Theme & Color Alignment with Web Fintech Design System', () => {
    it('enforces exact WealthOS Web color palette tokens', () => {
      expect(theme.colors.canvas).toBe('#F7F9F7');
      expect(theme.colors.surface).toBe('#FFFFFF');
      expect(theme.colors.border).toBe('#E7ECE8');
      expect(theme.colors.primary).toBe('#16A36A');
      expect(theme.colors.primaryDark).toBe('#087A50');
      expect(theme.colors.textPrimary).toBe('#17231D');
      expect(theme.colors.textSecondary).toBe('#758078');
      expect(theme.colors.negative).toBe('#DC5B5B');
    });

    it('provides chart and asset class series colors matching web standards', () => {
      expect(theme.colors.charts.equity).toBe('#16A36A');
      expect(theme.colors.charts.mutualFund).toBe('#6475D8');
      expect(theme.colors.charts.gold).toBe('#D99A32');
      expect(theme.colors.charts.fixedIncome).toBe('#0D9488');
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
      });
    });
  });
});
