'use client';

import React from 'react';
import { ArrowUpRight, ShieldCheck, Wallet } from 'lucide-react';
import {
  ChartContainer,
  FinancialBarChart,
  FinancialTableFallback,
  BarSeriesGroup,
} from '../charts';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface MonthlyCashFlow {
  month: string;
  sublabel: string;
  income: number;
  expenses: number;
  net: number;
}

const CASH_FLOW_DATA: MonthlyCashFlow[] = [
  { month: 'Aug 2026', sublabel: 'August 2026', income: 195000, expenses: 162000, net: 33000 },
  { month: 'Sep 2026', sublabel: 'September 2026', income: 202000, expenses: 158000, net: 44000 },
  { month: 'Oct 2026', sublabel: 'October 2026', income: 198000, expenses: 168200, net: 29800 },
  { month: 'Nov 2026', sublabel: 'November 2026 (MTD)', income: 212000, expenses: 151550, net: 60450 },
];

export function CashFlowChart() {
  const current = CASH_FLOW_DATA[CASH_FLOW_DATA.length - 1];
  const savingsRate = (current.net / current.income) * 100;

  // Format into BarSeriesGroup for FinancialBarChart
  const barGroups: BarSeriesGroup[] = CASH_FLOW_DATA.map((d) => ({
    label: d.month.split(' ')[0], // e.g. "Aug", "Nov"
    sublabel: d.sublabel,
    values: [
      {
        key: 'income',
        label: 'Inflow (Earned)',
        value: d.income,
        color: '#16A36A',
      },
      {
        key: 'expenses',
        label: 'Outflow (Spent)',
        value: d.expenses,
        color: '#6475D8',
      },
    ],
  }));

  // Table fallback
  const tableColumns = [
    { key: 'month', label: 'Month' },
    { key: 'income', label: 'Total Inflows (₹)', isCurrency: true, align: 'right' as const },
    { key: 'expenses', label: 'Total Outflows (₹)', isCurrency: true, align: 'right' as const },
    { key: 'net', label: 'Net Cash Surplus (₹)', isCurrency: true, align: 'right' as const },
    { key: 'savingsRate', label: 'Savings Rate (%)', isPercentage: true, align: 'right' as const },
  ];

  const tableData = CASH_FLOW_DATA.map((d) => ({
    month: d.month,
    income: d.income,
    expenses: d.expenses,
    net: d.net,
    savingsRate: (d.net / d.income) * 100,
  }));

  const narrativeText = `Current month retained cash flow stands at ${formatCurrency(
    current.net
  )} (${formatPercentage(savingsRate, { showSign: false })} savings rate). Operating liquidity excludes internal transfers.`;

  return (
    <ChartContainer
      title="Income vs Expenses (Monthly Cash Flow)"
      subtitle="Visual comparison of money coming in versus money going out with internal transfers strictly excluded"
      termKey="cash-flow"
      freshnessBadge={{
        label: 'Zero Double-Counting',
        variant: 'positive',
        icon: <ShieldCheck className="w-3 h-3" />,
      }}
      summaryNarrative={narrativeText}
      tableView={
        <FinancialTableFallback
          title="Monthly Cash Flow Audit Ledger"
          columns={tableColumns}
          data={tableData}
          filename="wealthos_cash_flow_ledger.csv"
        />
      }
    >
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
        <div>
          <span className="text-[11px] text-[#717D74] font-medium block">Monthly Income</span>
          <span className="text-lg font-bold font-mono text-[#16A36A]">
            {formatCurrency(current.income)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[#717D74] font-medium block">Monthly Expenses</span>
          <span className="text-lg font-bold font-mono text-[#6475D8]">
            {formatCurrency(current.expenses)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[#717D74] font-medium block">Remaining Cash Flow</span>
          <span className="text-lg font-bold font-mono text-[#087A50] flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            +{formatCurrency(current.net)} ({formatPercentage(savingsRate, { showSign: false })})
          </span>
        </div>
      </div>

      {/* Grouped Bar Chart */}
      <FinancialBarChart
        groups={barGroups}
        accessibleDescription="Monthly Inflows vs Outflows Grouped Bar Chart"
      />
    </ChartContainer>
  );
}
