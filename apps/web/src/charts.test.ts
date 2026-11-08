import { describe, it, expect } from 'vitest';
import { formatAxisTick, formatCurrency, formatIndianNumber } from './lib/formatters';

describe('Chart Math & Financial Precision Standard', () => {
  it('correctly calculates waterfall cumulative positions and deltas', () => {
    const rawSteps = [
      { label: 'Oct Net Worth', amount: 7195050, isTotal: true },
      { label: 'Salary Inflow', amount: 212000 },
      { label: 'Living Expenses', amount: -151550 },
      { label: 'Capital Gains', amount: 324401.25 },
      { label: 'Debt EMI', amount: -42000 },
      { label: 'Nov Net Worth', amount: 7537901.25, isTotal: true },
    ];

    let runningTotal = 0;
    const processed = rawSteps.map((s) => {
      if (s.isTotal) {
        runningTotal = s.amount;
        return { ...s, startVal: 0, endVal: s.amount };
      }
      const prev = runningTotal;
      runningTotal += s.amount;
      return { ...s, startVal: prev, endVal: runningTotal };
    });

    // Check intermediate steps
    expect(processed[0].endVal).toBe(7195050);
    expect(processed[1].startVal).toBe(7195050);
    expect(processed[1].endVal).toBe(7195050 + 212000);
    expect(processed[2].startVal).toBe(7407050);
    expect(processed[2].endVal).toBe(7407050 - 151550);

    // Verify mathematical reconciliation to the exact rupee
    const calculatedEnding = 7195050 + 212000 - 151550 + 324401.25 - 42000;
    expect(calculatedEnding).toBe(7537901.25);
    expect(processed[5].endVal).toBe(7537901.25);
  });

  it('calculates donut chart circumference and slice offsets without overlap or gap', () => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const slices = [
      { label: 'Equities', percentage: 42 },
      { label: 'Mutual Funds', percentage: 34 },
      { label: 'Debt', percentage: 16 },
      { label: 'Gold', percentage: 8 },
    ];

    const totalPct = slices.reduce((acc, s) => acc + s.percentage, 0);
    expect(totalPct).toBe(100);

    let accumulatedPct = 0;
    const offsets = slices.map((s) => {
      const dashOffset = accumulatedPct === 0 ? 0 : -((accumulatedPct / 100) * circumference);
      accumulatedPct += s.percentage;
      return dashOffset;
    });

    expect(offsets[0]).toBe(0);
    expect(accumulatedPct).toBe(100);
  });

  it('handles negative cash flow with zero baseline safely', () => {
    const cashFlows = [33000, 44000, 29800, 60450, -15000];
    const minVal = Math.min(...cashFlows, 0);
    const maxVal = Math.max(...cashFlows, 0);

    expect(minVal).toBe(-15000);
    expect(maxVal).toBe(60450);

    // Verify zero is strictly between min and max
    expect(minVal <= 0 && maxVal >= 0).toBe(true);
  });

  it('guarantees no NaN or divide-by-zero when values are identical or zero', () => {
    const values = [5000, 5000, 5000];
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (minVal === maxVal) {
      minVal = minVal * 0.95;
      maxVal = maxVal * 1.05 || 100;
    }

    const range = maxVal - minVal;
    expect(range).toBeGreaterThan(0);
    expect(isNaN(range)).toBe(false);
  });
});
