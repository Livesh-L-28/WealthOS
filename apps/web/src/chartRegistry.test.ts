import { describe, it, expect } from 'vitest';
import { CHART_REGISTRY, formatAnalyticalValue } from './components/charts/chartRegistry';

describe('Financial Chart Registry & Formatters', () => {
  it('registers all canonical analytical charts with valid configurations', () => {
    const expectedKeys = [
      'net_worth',
      'cash_flow',
      'income_expenses',
      'asset_allocation',
      'budget_utilization',
      'debt_amortization',
      'wealth_forecast',
      'financial_health',
    ];

    for (const key of expectedKeys) {
      expect(CHART_REGISTRY[key]).toBeDefined();
      const config = CHART_REGISTRY[key];
      expect(config.title).toBeTruthy();
      expect(config.endpoint).toMatch(/^\/api\/v1\/analytics\//);
      expect(config.supportsExport).toBe(true);
      expect(config.supportsTableFallback).toBe(true);
    }
  });

  it('formats currency values in Indian numbering notation', () => {
    expect(formatAnalyticalValue(7537901.25, 'currency', 'INR')).toBe('₹75,37,901.25');
    expect(formatAnalyticalValue(7537901.25, 'currency', 'INR', true)).toBe('₹75.38 L');
    expect(formatAnalyticalValue(12500000.0, 'currency', 'INR', true)).toBe('₹1.25 Cr');
  });

  it('formats percentage values with decimal precision', () => {
    expect(formatAnalyticalValue(28.51, 'percentage')).toBe('28.5%');
    expect(formatAnalyticalValue(84.19, 'percentage')).toBe('84.2%');
  });

  it('formats composite risk health scores out of 100', () => {
    expect(formatAnalyticalValue(88.4, 'score')).toBe('88/100');
    expect(formatAnalyticalValue(92, 'score')).toBe('92/100');
  });

  it('handles null, undefined, and non-numeric values gracefully with em-dash', () => {
    expect(formatAnalyticalValue(null, 'currency')).toBe('—');
    expect(formatAnalyticalValue(undefined, 'percentage')).toBe('—');
    expect(formatAnalyticalValue('invalid', 'score')).toBe('—');
  });
});
