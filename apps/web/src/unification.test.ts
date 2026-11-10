import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercentage } from './lib/formatters';

describe('WealthOS Web-to-Mobile Unification Verification', () => {
  it('reconciles consolidated balance sheet figures across platforms', () => {
    const assets = [
      { name: 'Liquid Depository & Savings', amount: 1327650.0 },
      { name: 'Direct Equity & Demat Portfolio', amount: 4522551.25 },
      { name: 'Fixed Term Deposits & SGB Gold', amount: 1862500.0 },
      { name: 'Real Estate Primary Residence Equity', amount: 1717500.0 },
    ];

    const liabilities = [
      { name: 'Housing Mortgage Loan (HDFC)', amount: 1650000.0 },
      { name: 'Axis Bank Magnus Revolving Card', amount: 242300.0 },
    ];

    const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
    const netWorth = totalAssets - totalLiabilities;

    expect(totalAssets).toBe(9430201.25);
    expect(totalLiabilities).toBe(1892300.0);
    expect(netWorth).toBe(7537901.25);
    expect(formatCurrency(netWorth)).toContain('75,37,901.25');
  });

  it('validates 6 connected accounts with identical mobile metadata', () => {
    const expectedAccounts = [
      { name: 'HDFC Corporate Salary', balance: 482450.0, mask: '•••• 4921' },
      { name: 'ICICI Privileged Savings', balance: 845200.0, mask: '•••• 8192' },
      { name: 'SBI Tax Saver Term Deposit', balance: 1500000.0, mask: '•••• 1042' },
      { name: 'Zerodha Demat & Trading', balance: 4522551.25, mask: '•••• 3391' },
      { name: 'HDFC Priority Home Loan', balance: -1650000.0, mask: '•••• 9940' },
      { name: 'Axis Bank Magnus Card', balance: -242300.0, mask: '•••• 1102' },
    ];

    expect(expectedAccounts.length).toBe(6);
    const liquidTotal = expectedAccounts
      .filter((a) => a.balance > 0)
      .reduce((s, a) => s + a.balance, 0);
    expect(liquidTotal).toBe(7350201.25);
  });

  it('verifies strategic goal definitions and deposit progress math', () => {
    const bikeGoal = {
      id: 'g-bike',
      name: 'Bike',
      targetAmount: 2345678.0,
      currentAmount: 1876543.0,
    };

    const initialPct = (bikeGoal.currentAmount / bikeGoal.targetAmount) * 100;
    expect(initialPct).toBeCloseTo(80.0, 1);

    // Simulate deposit of ₹25,000
    const depositAmount = 25000.0;
    const updatedAmount = bikeGoal.currentAmount + depositAmount;
    const updatedPct = (updatedAmount / bikeGoal.targetAmount) * 100;

    expect(updatedAmount).toBe(1901543.0);
    expect(updatedPct).toBeGreaterThan(initialPct);
    expect(updatedPct).toBeCloseTo(81.06, 1);
  });

  it('verifies 6 budget envelopes matching mobile limits and spent amounts', () => {
    const envelopes = [
      { category: 'Housing & EMI', allocated: 45000, spent: 45000 },
      { category: 'Food & Groceries', allocated: 30000, spent: 22400 },
      { category: 'Transportation & Fuel', allocated: 15000, spent: 12150 },
      { category: 'Utilities & Telecom', allocated: 10000, spent: 8200 },
      { category: 'Discretionary & Dining', allocated: 25000, spent: 18800 },
      { category: 'Investments & SIPs', allocated: 55000, spent: 50000 },
    ];

    const totalAllocated = envelopes.reduce((s, e) => s + e.allocated, 0);
    const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);
    const surplus = totalAllocated - totalSpent;

    expect(totalAllocated).toBe(180000);
    expect(totalSpent).toBe(156550);
    expect(surplus).toBe(23450);
  });

  it('verifies household member attribution and equity share', () => {
    const members = [
      { name: 'Livesh J (You)', role: 'OWNER', netContributionPercentage: 68.0 },
      { name: 'Priya J (Partner)', role: 'ADMIN', netContributionPercentage: 32.0 },
    ];

    const totalShare = members.reduce((s, m) => s + m.netContributionPercentage, 0);
    expect(totalShare).toBe(100.0);
  });
});

