import { describe, it, expect } from 'vitest';
import { getCategoryVisualMeta } from './categoryMeta';

describe('getCategoryVisualMeta', () => {
  it('correctly categorizes income and salary entries', () => {
    const salary = getCategoryVisualMeta('Corporate Salary', 'CREDIT', false);
    expect(salary.icon).toBe('💼');
    expect(salary.textColor).toBe('#059669');

    const dividend = getCategoryVisualMeta('Investment Dividend Payout', 'CREDIT', false);
    expect(dividend.icon).toBe('💰');
    expect(dividend.textColor).toBe('#D97706');

    const gains = getCategoryVisualMeta('Stock Sale / Capital Gain', 'CREDIT', false);
    expect(gains.icon).toBe('📈');
  });

  it('correctly categorizes debit outflow expenses', () => {
    const dining = getCategoryVisualMeta('Dining & Restaurants', 'DEBIT', false);
    expect(dining.icon).toBe('🍔');
    expect(dining.textColor).toBe('#D97706');

    const groceries = getCategoryVisualMeta('Food & Groceries', 'DEBIT', false);
    expect(groceries.icon).toBe('🛒');

    const fuel = getCategoryVisualMeta('Transport & Fuel', 'DEBIT', false);
    expect(fuel.icon).toBe('🚗');

    const rent = getCategoryVisualMeta('Housing & Rent', 'DEBIT', false);
    expect(rent.icon).toBe('🏠');

    const bills = getCategoryVisualMeta('Utilities & Bills', 'DEBIT', false);
    expect(bills.icon).toBe('💡');

    const shopping = getCategoryVisualMeta('Shopping & Retail', 'DEBIT', false);
    expect(shopping.icon).toBe('🛍️');

    const health = getCategoryVisualMeta('Healthcare & Wellness', 'DEBIT', false);
    expect(health.icon).toBe('🏥');

    const travel = getCategoryVisualMeta('Travel & Vacation', 'DEBIT', false);
    expect(travel.icon).toBe('✈️');

    const tech = getCategoryVisualMeta('Technology & Cloud', 'DEBIT', false);
    expect(tech.icon).toBe('💻');

    const sip = getCategoryVisualMeta('Mutual Fund SIP', 'DEBIT', false);
    expect(sip.icon).toBe('📈');
  });

  it('supports dark mode tinting with WCAG compliant colors', () => {
    const darkDining = getCategoryVisualMeta('Dining & Restaurants', 'DEBIT', true);
    expect(darkDining.icon).toBe('🍔');
    expect(darkDining.bgColor).toContain('rgba');
    expect(darkDining.textColor).toBe('#FBBF24');

    const darkSalary = getCategoryVisualMeta('Corporate Salary', 'CREDIT', true);
    expect(darkSalary.icon).toBe('💼');
    expect(darkSalary.textColor).toBe('#34D399');
  });

  it('handles unknown or empty categories gracefully with safe fallbacks', () => {
    const unknownDebit = getCategoryVisualMeta('', 'DEBIT', false);
    expect(unknownDebit.icon).toBe('🏷️');

    const unknownCredit = getCategoryVisualMeta('', 'CREDIT', false);
    expect(unknownCredit.icon).toBe('↓');
  });
});
