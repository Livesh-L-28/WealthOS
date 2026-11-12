'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ShieldCheck, Layers, PieChart } from 'lucide-react';
import {
  ChartContainer,
  FinancialDonutChart,
  FinancialHorizontalBarChart,
  FinancialTableFallback,
  DonutSlice,
  HorizontalBarItem,
} from '../charts';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

const ALLOCATION_DATA: DonutSlice[] = [
  { id: 'eq', label: 'Indian Equities (NSE/BSE)', value: 1941967.44, color: '#10B981' },
  { id: 'mf', label: 'Direct Mutual Funds', value: 1572068.88, color: '#6475D8' },
  { id: 'debt', label: 'Fixed Deposits & Sovereign Debt', value: 739797.12, color: '#F59E0B' },
  { id: 'gold', label: 'Gold & Sovereign Gold Bonds', value: 369898.56, color: '#0D9488' },
];

const SECTOR_EXPOSURE: HorizontalBarItem[] = [
  { id: 'bfsi', label: 'Banking & Financial Services', value: 1150000, secondaryValue: 1200000, color: '#10B981' },
  { id: 'it', label: 'Technology & Cloud IT', value: 920000, secondaryValue: 1000000, color: '#6475D8' },
  { id: 'cons', label: 'Consumer Goods & Retail', value: 680000, secondaryValue: 800000, color: '#0D9488' },
  { id: 'pharma', label: 'Healthcare & Pharmaceuticals', value: 540000, secondaryValue: 600000, color: '#8B5CF6' },
  { id: 'energy', label: 'Renewable Energy & Power', value: 410000, secondaryValue: 500000, color: '#F59E0B' },
];

export function PortfolioAllocationChart() {
  const [viewMode, setViewMode] = useState<'asset-class' | 'sectors'>('asset-class');

  const totalValue = 4623732.0;
  const investedCapital = 3468964.0;
  const unrealizedPl = totalValue - investedCapital;
  const unrealizedPlPct = (unrealizedPl / investedCapital) * 100;
  const realizedPl = 185400.0;

  // Table fallback columns and rows
  const tableColumns = [
    { key: 'label', label: 'Asset Class' },
    { key: 'value', label: 'Current Valuation (₹)', isCurrency: true, align: 'right' as const },
    { key: 'sharePct', label: 'Portfolio Share (%)', isPercentage: true, align: 'right' as const },
  ];

  const tableData = ALLOCATION_DATA.map((d) => ({
    label: d.label,
    value: d.value,
    sharePct: (d.value / totalValue) * 100,
  }));

  const narrativeText = `Total portfolio value of ${formatCurrency(
    totalValue
  )} reflects ${formatCurrency(unrealizedPl, { showSign: true })} (${formatPercentage(
    unrealizedPlPct
  )}) unrealized mark-to-market appreciation. Realized gains of ${formatCurrency(
    realizedPl
  )} booked in FY 2026-27.`;

  return (
    <ChartContainer
      title="Investment Portfolio & Asset Allocation"
      subtitle="Multi-asset distribution with live unrealized capital gains and sector concentration"
      termKey="asset-allocation"
      freshnessBadge={{
        label: 'Mark-to-Market',
        variant: 'positive',
        icon: <ShieldCheck className="w-3 h-3" />,
      }}
      valuationDate="BSE/NSE Close: Today 15:30 IST"
      summaryNarrative={narrativeText}
      rightAction={
        <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-0.5 ml-1">
          <button
            onClick={() => setViewMode('asset-class')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'asset-class'
                ? 'bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Asset Class
          </button>
          <button
            onClick={() => setViewMode('sectors')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'sectors'
                ? 'bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Sectors
          </button>
        </div>
      }
      tableView={
        <FinancialTableFallback
          title="Portfolio Asset Allocation Holdings"
          columns={tableColumns}
          data={tableData}
          summaryRow={{
            label: 'Total Reconciled Portfolio',
            value: totalValue,
            sharePct: 100.0,
          }}
          filename="wealthos_portfolio_allocation.csv"
        />
      }
    >
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <div>
          <span className="text-[11px] text-[#64748B] font-medium block">Portfolio Value</span>
          <span className="text-base font-bold font-mono text-[#0F172A]">
            {formatCurrency(totalValue)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[#64748B] font-medium block">Invested Capital</span>
          <span className="text-base font-bold font-mono text-[#0F172A]">
            {formatCurrency(investedCapital)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[#64748B] font-medium block">Unrealized P&L</span>
          <span className="text-base font-bold font-mono text-[#10B981] flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            +{formatCurrency(unrealizedPl, { notation: 'compact' })} ({formatPercentage(unrealizedPlPct)})
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[#64748B] font-medium block">Realized Capital Gains</span>
          <span className="text-base font-bold font-mono text-[#059669]">
            {formatCurrency(realizedPl)}
          </span>
        </div>
      </div>

      {/* Switch between Donut and Sector Bars */}
      {viewMode === 'asset-class' ? (
        <FinancialDonutChart
          slices={ALLOCATION_DATA}
          totalValue={totalValue}
          centerLabel="Portfolio"
          accessibleDescription="Multi-Asset Allocation Donut Chart"
        />
      ) : (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-[#475569] mb-2">
            Sector Weightings vs Target Allocation Limits
          </p>
          <FinancialHorizontalBarChart
            items={SECTOR_EXPOSURE}
            showComparison={true}
            accessibleDescription="Sector Exposure Ranking Bars"
          />
        </div>
      )}
    </ChartContainer>
  );
}
