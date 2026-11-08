'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ShieldCheck, Activity, GitCommit } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { InfoTooltip } from '../ui/InfoTooltip';
import {
  ChartContainer,
  ChartTimeRange,
  FinancialAreaChart,
  FinancialWaterfallChart,
  FinancialTableFallback,
  WaterfallStep,
} from '../charts';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface DataPoint {
  label: string;
  date: string;
  value: number;
}

const HISTORICAL_DATA: Record<ChartTimeRange, DataPoint[]> = {
  '1M': [
    { label: 'Oct 10', date: '10 Oct 2026', value: 7195050 },
    { label: 'Oct 15', date: '15 Oct 2026', value: 7240200 },
    { label: 'Oct 20', date: '20 Oct 2026', value: 7298500 },
    { label: 'Oct 25', date: '25 Oct 2026', value: 7380000 },
    { label: 'Oct 30', date: '30 Oct 2026', value: 7425100 },
    { label: 'Nov 04', date: '04 Nov 2026', value: 7490000 },
    { label: 'Nov 08', date: '08 Nov 2026', value: 7537901.25 },
  ],
  '3M': [
    { label: 'Aug', date: 'August 2026', value: 6820000 },
    { label: 'Sep', date: 'September 2026', value: 7050000 },
    { label: 'Oct', date: 'October 2026', value: 7350000 },
    { label: 'Nov', date: 'November 2026', value: 7537901.25 },
  ],
  '6M': [
    { label: 'May', date: 'May 2026', value: 6410000 },
    { label: 'Jun', date: 'June 2026', value: 6580000 },
    { label: 'Jul', date: 'July 2026', value: 6720000 },
    { label: 'Aug', date: 'August 2026', value: 6890000 },
    { label: 'Sep', date: 'September 2026', value: 7180000 },
    { label: 'Nov', date: 'November 2026', value: 7537901.25 },
  ],
  '1Y': [
    { label: 'Q4 25', date: 'Q4 2025', value: 5920000 },
    { label: 'Q1 26', date: 'Q1 2026', value: 6250000 },
    { label: 'Q2 26', date: 'Q2 2026', value: 6680000 },
    { label: 'Q3 26', date: 'Q3 2026', value: 7120000 },
    { label: 'Q4 26', date: 'Q4 2026', value: 7537901.25 },
  ],
  'ALL': [
    { label: '2023', date: 'Year 2023', value: 4100000 },
    { label: '2024', date: 'Year 2024', value: 5350000 },
    { label: '2025', date: 'Year 2025', value: 6400000 },
    { label: '2026', date: 'Year 2026', value: 7537901.25 },
  ],
};

const WATERFALL_STEPS: WaterfallStep[] = [
  { label: 'Oct 10 Net', sublabel: 'Starting Net Worth', amount: 7195050, isTotal: true, color: '#475569' },
  { label: 'Income', sublabel: 'Salary & Inflows', amount: 212000, color: '#16A36A' },
  { label: 'Expenses', sublabel: 'Living Costs & Burn', amount: -151550, color: '#DC5B5B' },
  { label: 'Market Gains', sublabel: 'Unrealized MF/Equity Gains', amount: 324401.25, color: '#16A36A' },
  { label: 'Debt EMI', sublabel: 'Principal Amortization', amount: -42000, color: '#D99A32' },
  { label: 'Nov 08 Net', sublabel: 'Current Reconciled Net Worth', amount: 7537901.25, isTotal: true, color: '#087A50' },
];

export function WealthOverviewCard() {
  const [range, setRange] = useState<ChartTimeRange>('1M');
  const [viewMode, setViewMode] = useState<'trend' | 'waterfall'>('trend');

  const data = HISTORICAL_DATA[range];
  const startVal = data[0].value;
  const currentVal = data[data.length - 1].value;
  const delta = currentVal - startVal;
  const deltaPct = (delta / startVal) * 100;

  // Table fallback columns and rows
  const tableColumns = [
    { key: 'date', label: 'Valuation Date' },
    { key: 'label', label: 'Milestone' },
    { key: 'value', label: 'Net Worth (₹)', isCurrency: true, align: 'right' as const },
    { key: 'growthPct', label: 'Change from Start (%)', isPercentage: true, align: 'right' as const },
  ];

  const tableData = data.map((d) => ({
    date: d.date,
    label: d.label,
    value: d.value,
    growthPct: ((d.value - startVal) / startVal) * 100,
  }));

  const narrativeText = `In this ${range} window, consolidated net worth expanded by ${formatCurrency(
    delta,
    { showSign: true }
  )} (${formatPercentage(deltaPct)}) through disciplined operating cash surplus and mutual fund capital gains.`;

  return (
    <ChartContainer
      title="Consolidated Net Worth"
      subtitle="Total assets less current liabilities, verified against general journal double-entry balances"
      termKey="net-worth"
      freshnessBadge={{
        label: 'Double-Entry Grounded',
        variant: 'positive',
        icon: <ShieldCheck className="w-3 h-3" />,
      }}
      valuationDate="Updated Today at 11:50 AM"
      timeRange={range}
      onTimeRangeChange={setRange}
      summaryNarrative={narrativeText}
      rightAction={
        <div className="flex items-center bg-[#F7F9F7] border border-[#E7ECE8] rounded-xl p-0.5 ml-1">
          <button
            onClick={() => setViewMode('trend')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'trend'
                ? 'bg-white text-[#17231D] shadow-xs border border-[#E7ECE8]'
                : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            Trend
          </button>
          <button
            onClick={() => setViewMode('waterfall')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'waterfall'
                ? 'bg-white text-[#17231D] shadow-xs border border-[#E7ECE8]'
                : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            Waterfall
          </button>
        </div>
      }
      tableView={
        <FinancialTableFallback
          title="Consolidated Net Worth History"
          columns={tableColumns}
          data={tableData}
          filename={`wealthos_net_worth_${range.toLowerCase()}.csv`}
        />
      }
    >
      {/* KPI Display Header */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-bold tracking-tight text-[#17231D] font-mono">
          {formatCurrency(currentVal)}
        </span>
        <span className="inline-flex items-center text-xs font-semibold text-[#16A36A] bg-[#16A36A]/10 px-2 py-0.5 rounded-full border border-[#16A36A]/20">
          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
          {formatCurrency(delta, { showSign: true })} ({formatPercentage(deltaPct)})
        </span>
      </div>

      {/* Visual Chart Switcher */}
      {viewMode === 'trend' ? (
        <FinancialAreaChart
          data={data}
          color="#16A36A"
          gradientId="netWorthTrendGradient"
          metricName="Net Worth"
          accessibleDescription="Consolidated Net Worth Historical Trajectory Area Chart"
        />
      ) : (
        <FinancialWaterfallChart
          steps={WATERFALL_STEPS}
          accessibleDescription="Net Worth Movement Waterfall Walk"
        />
      )}
    </ChartContainer>
  );
}
