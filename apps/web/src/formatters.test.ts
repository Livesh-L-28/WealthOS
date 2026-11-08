import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatIndianNumber,
  formatPercentage,
  formatAxisTick,
  generateAccessibleChartSummary,
} from './lib/formatters';

describe('Financial Formatting Standard', () => {
  describe('formatIndianNumber', () => {
    it('correctly groups thousands, lakhs, and crores', () => {
      expect(formatIndianNumber(1000)).toBe('1,000.00');
      expect(formatIndianNumber(100000)).toBe('1,00,000.00');
      expect(formatIndianNumber(1234567.89)).toBe('12,34,567.89');
      expect(formatIndianNumber(7537901.25)).toBe('75,37,901.25');
      expect(formatIndianNumber(10000000)).toBe('1,00,00,000.00');
    });

    it('handles negative numbers properly', () => {
      expect(formatIndianNumber(-150000.5)).toBe('-1,50,000.50');
    });

    it('handles zero and nullish inputs gracefully', () => {
      expect(formatIndianNumber(0)).toBe('0.00');
      expect(formatIndianNumber(null)).toBe('0.00');
      expect(formatIndianNumber(undefined)).toBe('0.00');
    });
  });

  describe('formatCurrency', () => {
    it('formats standard INR with symbol and 2 decimals', () => {
      expect(formatCurrency(7537901.25)).toBe('₹75,37,901.25');
      expect(formatCurrency(0)).toBe('₹0.00');
    });

    it('formats compact INR with Lakhs (₹L) and Crores (₹Cr)', () => {
      expect(formatCurrency(7537901.25, { notation: 'compact' })).toBe('₹75.38 L');
      expect(formatCurrency(12500000, { notation: 'compact' })).toBe('₹1.25 Cr');
      expect(formatCurrency(85000, { notation: 'compact' })).toBe('₹85.0 K');
      expect(formatCurrency(450, { notation: 'compact' })).toBe('₹450.00');
    });

    it('handles negative currency with minus and parentheses', () => {
      expect(formatCurrency(-50000)).toBe('-₹50,000.00');
      expect(formatCurrency(-50000, { useParenthesesForNegative: true })).toBe('(₹50,000.00)');
    });

    it('supports positive signed values', () => {
      expect(formatCurrency(342850, { showSign: true })).toBe('+₹3,42,850.00');
    });

    it('formats international currencies like USD', () => {
      expect(formatCurrency(1500000, { currency: 'USD', notation: 'compact' })).toBe('$1.50M');
      expect(formatCurrency(5400.5, { currency: 'USD' })).toBe('$5,400.50');
    });
  });

  describe('formatPercentage', () => {
    it('formats positive and negative percentages with signs', () => {
      expect(formatPercentage(4.76)).toBe('+4.76%');
      expect(formatPercentage(-2.3)).toBe('-2.30%');
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(15.5, { showSign: false })).toBe('15.50%');
    });
  });

  describe('formatAxisTick', () => {
    it('formats clean Y-axis ticks in INR and USD', () => {
      expect(formatAxisTick(0)).toBe('0');
      expect(formatAxisTick(7500000)).toBe('₹75L');
      expect(formatAxisTick(10000000)).toBe('₹1Cr');
      expect(formatAxisTick(50000)).toBe('₹50K');
      expect(formatAxisTick(-25000)).toBe('-₹25K');
      expect(formatAxisTick(2000000, 'USD')).toBe('$2.0M');
    });
  });

  describe('generateAccessibleChartSummary', () => {
    it('produces descriptive narration for screen readers', () => {
      const summary = generateAccessibleChartSummary('Net Worth Trend', [
        { label: 'Oct 10', value: 7195050 },
        { label: 'Nov 08', value: 7537901.25 },
      ]);
      expect(summary).toContain('Net Worth Trend');
      expect(summary).toContain('₹71,95,050.00');
      expect(summary).toContain('₹75,37,901.25');
      expect(summary).toContain('increased');
    });
  });
});

