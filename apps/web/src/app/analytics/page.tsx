'use client';

import React, { useState } from 'react';
import {
  Calendar,
  TrendingDown,
  TrendingUp,
  Clock,
  PieChart,
  BarChart3,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  DollarSign,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import {
  ChartContainer,
  FinancialBarChart,
  FinancialHorizontalBarChart,
  FinancialHeatmap,
  FinancialTableFallback,
  BarSeriesGroup,
  HorizontalBarItem,
  HeatmapCell,
} from '@/components/charts';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

type TimeCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  type: 'NEED' | 'WANT' | 'INVESTMENT';
  account: string;
}

const EXPENSE_DATA: Record<TimeCadence, {
  totalSpend: number;
  previousSpend: number;
  budgetCeiling: number;
  cadenceLabel: string;
  comparisonLabel: string;
  bars: { label: string; amount: number; isProjected?: boolean }[];
  categories: { name: string; amount: number; percentage: number; color: string }[];
  recentExpenses: ExpenseItem[];
}> = {
  DAILY: {
    totalSpend: 4850.0,
    previousSpend: 6200.0,
    budgetCeiling: 7500.0,
    cadenceLabel: 'Today (8 Nov 2026)',
    comparisonLabel: 'vs Yesterday (₹6,200)',
    bars: [
      { label: '08:00', amount: 350 },
      { label: '11:00', amount: 1200 },
      { label: '13:00', amount: 850 },
      { label: '16:00', amount: 450 },
      { label: '19:00', amount: 1500 },
      { label: '21:00 (Est)', amount: 500, isProjected: true },
    ],
    categories: [
      { name: 'Dining & Groceries', amount: 2050, percentage: 42.3, color: 'bg-emerald-500' },
      { name: 'Transportation & Fuel', amount: 1450, percentage: 29.9, color: 'bg-[#16A36A]' },
      { name: 'Coffee & Incidentals', amount: 850, percentage: 17.5, color: 'bg-amber-500' },
      { name: 'Digital Subscriptions', amount: 500, percentage: 10.3, color: 'bg-violet-500' },
    ],
    recentExpenses: [
      { id: 'e-1', name: 'Whole Foods Organic Market', category: 'Groceries', amount: 1500, date: '19:15', type: 'NEED', account: 'Primary Savings' },
      { id: 'e-2', name: 'Shell Premium Fuel Station', category: 'Transportation', amount: 1450, date: '16:40', type: 'NEED', account: 'Infinite Card' },
      { id: 'e-3', name: 'Blue Tokai Specialty Coffee', category: 'Dining', amount: 550, date: '13:10', type: 'WANT', account: 'Primary Savings' },
      { id: 'e-4', name: 'Uber Executive Transit', category: 'Transportation', amount: 850, date: '11:20', type: 'NEED', account: 'Infinite Card' },
      { id: 'e-5', name: 'Artisan Bakery Breakfast', category: 'Dining', amount: 500, date: '08:30', type: 'WANT', account: 'Primary Savings' },
    ],
  },
  WEEKLY: {
    totalSpend: 34200.0,
    previousSpend: 39500.0,
    budgetCeiling: 45000.0,
    cadenceLabel: 'This Week (W45 Nov)',
    comparisonLabel: 'vs Last Week (₹39,500)',
    bars: [
      { label: 'Mon', amount: 3800 },
      { label: 'Tue', amount: 5200 },
      { label: 'Wed', amount: 4100 },
      { label: 'Thu', amount: 6400 },
      { label: 'Fri', amount: 8900 },
      { label: 'Sat', amount: 4850 },
      { label: 'Sun (Est)', amount: 3200, isProjected: true },
    ],
    categories: [
      { name: 'Housing & Utilities', amount: 12500, percentage: 36.5, color: 'bg-[#16A36A]' },
      { name: 'Food & Dining Out', amount: 9800, percentage: 28.7, color: 'bg-emerald-500' },
      { name: 'Technology & Cloud', amount: 5400, percentage: 15.8, color: 'bg-blue-500' },
      { name: 'Lifestyle & Shopping', amount: 4200, percentage: 12.3, color: 'bg-amber-500' },
      { name: 'Healthcare', amount: 2300, percentage: 6.7, color: 'bg-rose-500' },
    ],
    recentExpenses: [
      { id: 'w-1', name: 'AWS Cloud Server Hosting', category: 'Technology', amount: 5400, date: 'Fri, 6 Nov', type: 'NEED', account: 'Corporate Infinite' },
      { id: 'w-2', name: 'Family Weekend Dining & Social', category: 'Dining', amount: 3500, date: 'Fri, 6 Nov', type: 'WANT', account: 'Primary Savings' },
      { id: 'w-3', name: 'Weekly Organic Grocery Stock', category: 'Groceries', amount: 4200, date: 'Thu, 5 Nov', type: 'NEED', account: 'Primary Savings' },
      { id: 'w-4', name: 'High-Speed Fiber Broadband', category: 'Utilities', amount: 2100, date: 'Tue, 3 Nov', type: 'NEED', account: 'Primary Savings' },
    ],
  },
  MONTHLY: {
    totalSpend: 151550.0,
    previousSpend: 168200.0,
    budgetCeiling: 180000.0,
    cadenceLabel: 'November 2026',
    comparisonLabel: 'vs October 2026 (₹168,200)',
    bars: [
      { label: 'Week 1', amount: 42500 },
      { label: 'Week 2 (Current)', amount: 34200 },
      { label: 'Week 3 (Est)', amount: 38000, isProjected: true },
      { label: 'Week 4 (Est)', amount: 36850, isProjected: true },
    ],
    categories: [
      { name: 'Rent & Real Estate Lease', amount: 85000, percentage: 56.1, color: 'bg-[#16A36A]' },
      { name: 'Food, Groceries & Dining', amount: 31500, percentage: 20.8, color: 'bg-emerald-500' },
      { name: 'Technology & Cloud Tools', amount: 22800, percentage: 15.0, color: 'bg-blue-500' },
      { name: 'Mobility & Fuel', amount: 8500, percentage: 5.6, color: 'bg-amber-500' },
      { name: 'Health & Wellness', amount: 3750, percentage: 2.5, color: 'bg-rose-500' },
    ],
    recentExpenses: [
      { id: 'm-1', name: 'Executive Residence Lease Rental', category: 'Rent', amount: 85000, date: '1 Nov 2026', type: 'NEED', account: 'Treasury Reserve' },
      { id: 'm-2', name: 'AWS Cloud Infrastructure Service', category: 'Technology', amount: 14250, date: '7 Nov 2026', type: 'NEED', account: 'Primary Savings' },
      { id: 'm-3', name: 'Gym & Personal Training Membership', category: 'Wellness', amount: 3750, date: '2 Nov 2026', type: 'WANT', account: 'Primary Savings' },
      { id: 'm-4', name: 'Corporate Travel Fuel Card', category: 'Travel', amount: 4850, date: '3 Nov 2026', type: 'NEED', account: 'Infinite Card' },
    ],
  },
  YEARLY: {
    totalSpend: 1845000.0,
    previousSpend: 1980000.0,
    budgetCeiling: 2200000.0,
    cadenceLabel: 'Calendar Year 2026',
    comparisonLabel: 'vs CY 2025 (₹1,980,000)',
    bars: [
      { label: 'Q1', amount: 480000 },
      { label: 'Q2', amount: 510000 },
      { label: 'Q3', amount: 460000 },
      { label: 'Q4 (Projected)', amount: 395000, isProjected: true },
    ],
    categories: [
      { name: 'Housing & Mortgages', amount: 1020000, percentage: 55.3, color: 'bg-[#16A36A]' },
      { name: 'Living Expenses & Food', amount: 380000, percentage: 20.6, color: 'bg-emerald-500' },
      { name: 'Business Tech & Cloud', amount: 245000, percentage: 13.3, color: 'bg-blue-500' },
      { name: 'Vacations & Travel', amount: 120000, percentage: 6.5, color: 'bg-amber-500' },
      { name: 'Insurance & Taxes', amount: 80000, percentage: 4.3, color: 'bg-rose-500' },
    ],
    recentExpenses: [
      { id: 'y-1', name: 'Annual Comprehensive Health Insurance', category: 'Insurance', amount: 45000, date: 'May 2026', type: 'NEED', account: 'Primary Savings' },
      { id: 'y-2', name: 'Annual Software License Enterprise Suite', category: 'Technology', amount: 62000, date: 'Jan 2026', type: 'NEED', account: 'Corporate Infinite' },
      { id: 'y-3', name: 'International Family Vacation Flight Tickets', category: 'Travel', amount: 85000, date: 'Jul 2026', type: 'WANT', account: 'Infinite Card' },
    ],
  },
};

const NOVEMBER_DAILY_HEATMAP: HeatmapCell[] = [
  { id: 'nov-1', label: '1', date: '01 Nov 2026', value: 85000 },
  { id: 'nov-2', label: '2', date: '02 Nov 2026', value: 3750 },
  { id: 'nov-3', label: '3', date: '03 Nov 2026', value: 4850 },
  { id: 'nov-4', label: '4', date: '04 Nov 2026', value: 1200 },
  { id: 'nov-5', label: '5', date: '05 Nov 2026', value: 4200 },
  { id: 'nov-6', label: '6', date: '06 Nov 2026', value: 8900 },
  { id: 'nov-7', label: '7', date: '07 Nov 2026', value: 14250 },
  { id: 'nov-8', label: '8', date: '08 Nov 2026', value: 4850 },
  { id: 'nov-9', label: '9', date: '09 Nov 2026', value: 1800 },
  { id: 'nov-10', label: '10', date: '10 Nov 2026', value: 2400 },
  { id: 'nov-11', label: '11', date: '11 Nov 2026', value: 1100 },
  { id: 'nov-12', label: '12', date: '12 Nov 2026', value: 3200 },
  { id: 'nov-13', label: '13', date: '13 Nov 2026', value: 5400 },
  { id: 'nov-14', label: '14', date: '14 Nov 2026', value: 6800 },
  { id: 'nov-15', label: '15', date: '15 Nov 2026', value: 2900 },
  { id: 'nov-16', label: '16', date: '16 Nov 2026', value: 1500 },
  { id: 'nov-17', label: '17', date: '17 Nov 2026', value: 2200 },
  { id: 'nov-18', label: '18', date: '18 Nov 2026', value: 1750 },
  { id: 'nov-19', label: '19', date: '19 Nov 2026', value: 3100 },
  { id: 'nov-20', label: '20', date: '20 Nov 2026', value: 4600 },
  { id: 'nov-21', label: '21', date: '21 Nov 2026', value: 5800 },
  { id: 'nov-22', label: '22', date: '22 Nov 2026', value: 2100 },
  { id: 'nov-23', label: '23', date: '23 Nov 2026', value: 1400 },
  { id: 'nov-24', label: '24', date: '24 Nov 2026', value: 1900 },
  { id: 'nov-25', label: '25', date: '25 Nov 2026', value: 2800 },
  { id: 'nov-26', label: '26', date: '26 Nov 2026', value: 3400 },
  { id: 'nov-27', label: '27', date: '27 Nov 2026', value: 4900 },
  { id: 'nov-28', label: '28', date: '28 Nov 2026', value: 6200 },
  { id: 'nov-29', label: '29', date: '29 Nov 2026', value: 3800 },
  { id: 'nov-30', label: '30', date: '30 Nov 2026', value: 2500 },
];

const CAPITAL_GAINS_ITEMS: HorizontalBarItem[] = [
  { id: 'ltcg', label: 'LTCG (Sec 112A) — ₹1.25L Exemption Applied', value: 285400, secondaryValue: 125000, color: '#16A36A' },
  { id: 'stcg', label: 'STCG (Sec 111A) — 20% Flat Rate', value: 98000, color: '#6475D8' },
  { id: 'div', label: 'Ordinary Income (Dividend & Fixed Income)', value: 42500, color: '#D99A32' },
];

export default function AnalyticsPage() {
  const [cadence, setCadence] = useState<TimeCadence>('MONTHLY');
  const [filterType, setFilterType] = useState<'ALL' | 'NEED' | 'WANT'>('ALL');

  const current = EXPENSE_DATA[cadence];
  const delta = current.previousSpend - current.totalSpend;
  const isSavingMore = delta >= 0;
  const utilizationPct = (current.totalSpend / current.budgetCeiling) * 100;

  const filteredExpenses = current.recentExpenses.filter((e) =>
    filterType === 'ALL' ? true : e.type === filterType
  );

  const velocityGroups: BarSeriesGroup[] = current.bars.map((bar) => ({
    label: bar.label.split(' ')[0],
    sublabel: bar.label,
    values: [
      {
        key: 'amount',
        label: bar.isProjected ? 'Projected Run-Rate' : 'Actual Settled Expense',
        value: bar.amount,
        color: bar.isProjected ? '#758078' : '#16A36A',
      },
    ],
  }));

  const categoryItems: HorizontalBarItem[] = current.categories.map((cat, idx) => ({
    id: `cat-${idx}`,
    label: cat.name,
    value: cat.amount,
    color:
      idx === 0
        ? '#16A36A'
        : idx === 1
        ? '#6475D8'
        : idx === 2
        ? '#0D9488'
        : idx === 3
        ? '#D99A32'
        : '#8B5CF6',
  }));

  const tableColumns = [
    { key: 'label', label: 'Period Interval' },
    { key: 'amount', label: 'Outflow Amount (₹)', isCurrency: true, align: 'right' as const },
    { key: 'status', label: 'Accounting Status' },
  ];

  const tableData = current.bars.map((b) => ({
    label: b.label,
    amount: b.amount,
    status: b.isProjected ? 'Projected Scenario' : 'Settled General Journal Entry',
  }));

  return (
    <div className="space-y-8">
      {/* Header & Cadence Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">Expense Intelligence & Burn Radar</h1>
            <Badge variant="positive" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Real-Time</span>
            </Badge>
            <InfoTooltip termKey="cash-flow" />
          </div>
          <p className="text-xs text-[#758078] mt-1">
            Deterministic cash flow tracking across daily, weekly, monthly, and annual billing cadences.
          </p>
        </div>

        {/* Time Cadence Switcher */}
        <div className="flex items-center bg-[#F7F9F7] border border-[#E7ECE8] rounded-lg p-1">
          {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeCadence[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setCadence(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                cadence === tab
                  ? 'bg-[#16A36A] text-white shadow-sm'
                  : 'text-[#758078] hover:text-[#17231D]'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Spend */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              {current.cadenceLabel}
            </span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#17231D]">
              ₹{current.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {isSavingMore ? (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  -₹{Math.abs(delta).toLocaleString('en-IN')}
                </span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-medium">
                  +₹{Math.abs(delta).toLocaleString('en-IN')}
                </span>
              </>
            )}
            <span className="text-[#9BA39D]">{current.comparisonLabel}</span>
          </div>
        </Card>

        {/* Budget Ceiling & Burn Runway */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Budget Ceiling
            </span>
            <BarChart3 className="w-4 h-4 text-[#16A36A]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#17231D]">
              ₹{current.budgetCeiling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-[#758078] mb-1">
              <span>Utilization</span>
              <span className={utilizationPct > 90 ? 'text-rose-400 font-bold' : 'text-[#17231D]'}>
                {utilizationPct.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-[#F0F4F1] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${
                  utilizationPct > 90
                    ? 'bg-rose-500'
                    : utilizationPct > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(utilizationPct, 100)}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Needs vs Wants Breakdown */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              50/30/20 Discipline
            </span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold text-emerald-400">76% Needs</span>
              <span className="text-xs text-[#758078]">24% Wants</span>
            </div>
            <p className="text-xs text-[#9BA39D] mt-1">
              Healthy essential cost containment within 80% ceiling.
            </p>
          </div>
        </Card>

        {/* Estimated Savings */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Headroom Remaining
            </span>
            <DollarSign className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-300">
              ₹{(current.budgetCeiling - current.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-[#9BA39D] mt-1">
            Available surplus for investment deployment.
          </p>
        </Card>
      </div>

      {/* Time-Series Cadence Breakdown & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cadence Velocity Chart */}
        <div className="lg:col-span-2">
          <ChartContainer
            title={`Expense Distribution — ${current.cadenceLabel}`}
            subtitle="Chronological outflow distribution and projected end-of-period run-rates"
            freshnessBadge={{
              label: 'Double-Entry Verified',
              variant: 'positive',
              icon: <ShieldCheck className="w-3 h-3" />,
            }}
            summaryNarrative={`Total outflow of ${formatCurrency(
              current.totalSpend
            )} is tracking against budget ceiling of ${formatCurrency(current.budgetCeiling)}.`}
            tableView={
              <FinancialTableFallback
                title={`Outflow Ledger — ${current.cadenceLabel}`}
                columns={tableColumns}
                data={tableData}
                filename={`wealthos_expense_velocity_${cadence.toLowerCase()}.csv`}
              />
            }
          >
            <FinancialBarChart
              groups={velocityGroups}
              accessibleDescription={`Expense Distribution for ${current.cadenceLabel}`}
            />
          </ChartContainer>
        </div>

        {/* Category Breakdown */}
        <div>
          <ChartContainer
            title="Top Burn Categories"
            subtitle="Spending concentration and allocation shares"
            freshnessBadge={{
              label: 'Categorized',
              variant: 'neutral',
              icon: <PieChart className="w-3 h-3" />,
            }}
          >
            <div className="pt-2">
              <FinancialHorizontalBarChart
                items={categoryItems}
                showComparison={false}
                accessibleDescription="Top Burn Categories Ranking"
              />
            </div>
          </ChartContainer>
        </div>
      </div>

      {/* 30-Day Spending Intensity Heatmap */}
      <ChartContainer
        title="30-Day Spending Intensity Heatmap (November 2026)"
        subtitle="Daily burn intensity visualization detecting peak spending clusters and non-discretionary settlement spikes"
        freshnessBadge={{
          label: 'Verified Journal Feeds',
          variant: 'positive',
          icon: <ShieldCheck className="w-3 h-3" />,
        }}
        summaryNarrative="Peak monthly burn occurred on 1st Nov due to executive residence lease payment (₹85,000.00). Daily run-rate stabilized below ₹5,000 baseline."
      >
        <FinancialHeatmap
          cells={NOVEMBER_DAILY_HEATMAP}
          columns={10}
          palette="rose"
          accessibleDescription="November 2026 Daily Outflow Intensity Heatmap"
        />
      </ChartContainer>

      {/* Itemized Expense Log */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7ECE8]">
          <div>
            <h2 className="text-base font-semibold text-[#17231D]">Itemized Expense Log ({current.cadenceLabel})</h2>
            <p className="text-xs text-[#758078]">Line-item journal entries linked to primary bank accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#758078]">Filter:</span>
            {(['ALL', 'NEED', 'WANT'] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filterType === ft
                    ? 'bg-slate-700 text-white'
                    : 'text-[#758078] hover:text-[#17231D]'
                }`}
              >
                {ft === 'ALL' ? 'All' : ft === 'NEED' ? 'Needs' : 'Wants'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E7ECE8] text-[#758078] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Merchant / Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Settlement Account</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7ECE8]">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-[#F0F4F1] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#17231D]">{expense.name}</td>
                  <td className="py-3 px-4 text-[#758078]">{expense.category}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        expense.type === 'NEED'
                          ? 'bg-[#16A36A]/10 text-[#16A36A] border border-[#16A36A]/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {expense.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#758078]">{expense.account}</td>
                  <td className="py-3 px-4 text-[#9BA39D] font-mono">{expense.date}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-rose-400">
                    -₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SECTION: INDIA TAX READINESS (FY 2026-27 / AY 2027-28) */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7ECE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A36A]/10 flex items-center justify-center text-[#16A36A]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#17231D]">India Tax Readiness & Planning</h2>
                <Badge variant="brand" size="sm">FY 2026-27 &bull; AY 2027-28</Badge>
              </div>
              <p className="text-xs text-[#758078] mt-0.5">
                Statutory heads of income, transfer neutrality filtering, and dual-regime tax optimization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="positive">Recommended: New Regime (Sec 115BAC)</Badge>
          </div>
        </div>

        {/* Informational Disclaimer Banner */}
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Informational Readiness Tool:</strong> WealthOS structures and estimates your tax position for preparatory review. It does not file returns with the Income Tax Department (ITD) and does not replace a qualified Chartered Accountant (CA).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <span className="text-xs font-semibold text-[#758078] uppercase">Gross Total Income</span>
            <p className="text-xl font-bold text-[#17231D] mt-1">₹20,70,000</p>
            <p className="text-[11px] text-[#758078] mt-0.5">Salary + Capital Gains + Other</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <span className="text-xs font-semibold text-[#758078] uppercase">Transfer Neutrality</span>
            <p className="text-xl font-bold text-[#16A36A] mt-1">₹2,50,000 Excluded</p>
            <p className="text-[11px] text-[#758078] mt-0.5">Self-transfers excluded from income</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <span className="text-xs font-semibold text-[#758078] uppercase">Standard Deduction</span>
            <p className="text-xl font-bold text-[#17231D] mt-1">₹75,000</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Section 115BAC default</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <span className="text-xs font-semibold text-[#758078] uppercase">Dual-Regime Tax Savings</span>
            <p className="text-xl font-bold text-[#16A36A] mt-1">₹24,800 Saved</p>
            <p className="text-[11px] text-[#758078] mt-0.5">New Regime vs Old Regime</p>
          </div>
        </div>

        {/* Regime Comparison Table */}
        <div className="mt-4 p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
          <h4 className="text-xs font-bold text-[#17231D] uppercase tracking-wider mb-3">
            Regime Comparison Matrix (Finance Act 2024 / 2026.1)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-white border border-[#16A36A]/30 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#17231D]">New Tax Regime (Section 115BAC)</span>
                <Badge variant="positive">Active Choice</Badge>
              </div>
              <div className="flex justify-between text-[#758078]">
                <span>Standard Deduction:</span>
                <span className="font-mono text-[#17231D]">₹75,000</span>
              </div>
              <div className="flex justify-between text-[#758078]">
                <span>Taxable Ordinary Income:</span>
                <span className="font-mono text-[#17231D]">₹18,70,000</span>
              </div>
              <div className="flex justify-between text-[#758078]">
                <span>Tax on Income + Cess (4%):</span>
                <span className="font-mono font-bold text-[#17231D]">₹2,69,360</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#E7ECE8] space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#758078]">Old Tax Regime</span>
                <Badge variant="neutral">Optional</Badge>
              </div>
              <div className="flex justify-between text-[#758078]">
                <span>Deductions (80C, 80D, Std):</span>
                <span className="font-mono text-[#17231D]">₹2,35,000</span>
              </div>
              <div className="flex justify-between text-[#758078]">
                <span>Taxable Ordinary Income:</span>
                <span className="font-mono text-[#17231D]">₹17,10,000</span>
              </div>
              <div className="flex justify-between text-[#758078]">
                <span>Tax on Income + Cess (4%):</span>
                <span className="font-mono font-bold text-rose-600">₹2,94,160</span>
              </div>
            </div>
          </div>
        </div>

        {/* Capital Gains Classification Visualizer */}
        <div className="mt-4 p-4 rounded-xl bg-white border border-[#E7ECE8]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-[#17231D] uppercase tracking-wider">
                Capital Gains Classification & Statutory Thresholds (FY 2026-27)
              </h4>
              <p className="text-[11px] text-[#758078]">
                Realized equity capital gains separated into LTCG and STCG with automatic Section 112A ₹1.25L exemption applied
              </p>
            </div>
            <Badge variant="positive" size="sm">AIS/26AS Reconciled</Badge>
          </div>
          <FinancialHorizontalBarChart
            items={CAPITAL_GAINS_ITEMS}
            showComparison={true}
            accessibleDescription="Capital Gains Classification and Exemptions"
          />
        </div>
      </Card>

      {/* SECTION: FINANCIAL RISK INTELLIGENCE & HEALTH SCORE */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7ECE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#17231D]">Financial Health & Risk Intelligence</h2>
                <Badge variant="positive">Score: 88 / 100 &bull; EXCELLENT</Badge>
              </div>
              <p className="text-xs text-[#758078] mt-0.5">
                Deterministic risk monitoring across liquidity, debt service, concentration, and reconciliation
              </p>
            </div>
          </div>
        </div>

        {/* 5-Pillar Score Weights Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-[#F7F9F7] border border-[#E7ECE8] text-center">
            <span className="text-[11px] text-[#758078] block">Emergency (25%)</span>
            <span className="text-lg font-bold text-[#17231D] mt-1 block">100 / 100</span>
            <span className="text-[10px] text-emerald-600 font-medium">Optimal (6.2m)</span>
          </div>
          <div className="p-3 rounded-lg bg-[#F7F9F7] border border-[#E7ECE8] text-center">
            <span className="text-[11px] text-[#758078] block">Debt Service (25%)</span>
            <span className="text-lg font-bold text-[#17231D] mt-1 block">85 / 100</span>
            <span className="text-[10px] text-emerald-600 font-medium">Moderate (26%)</span>
          </div>
          <div className="p-3 rounded-lg bg-[#F7F9F7] border border-[#E7ECE8] text-center">
            <span className="text-[11px] text-[#758078] block">Cash Flow (20%)</span>
            <span className="text-lg font-bold text-[#17231D] mt-1 block">85 / 100</span>
            <span className="text-[10px] text-emerald-600 font-medium">Net Surplus</span>
          </div>
          <div className="p-3 rounded-lg bg-[#F7F9F7] border border-[#E7ECE8] text-center">
            <span className="text-[11px] text-[#758078] block">Diversification (15%)</span>
            <span className="text-lg font-bold text-[#17231D] mt-1 block">85 / 100</span>
            <span className="text-[10px] text-emerald-600 font-medium">Balanced</span>
          </div>
          <div className="p-3 rounded-lg bg-[#F7F9F7] border border-[#E7ECE8] text-center">
            <span className="text-[11px] text-[#758078] block">Data Quality (15%)</span>
            <span className="text-lg font-bold text-[#17231D] mt-1 block">95 / 100</span>
            <span className="text-[10px] text-emerald-600 font-medium">Reconciled</span>
          </div>
        </div>

        {/* Evidence-Backed Active Risk Signals */}
        <div className="mt-4 space-y-3">
          <div className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#17231D]">Loan Maturity Approaching</span>
                  <Badge variant="neutral" size="sm">INFORMATIONAL</Badge>
                </div>
                <p className="text-xs text-[#758078] mt-0.5">
                  Executive EV Loan with State Bank of India reaches final installment on 15-Dec-2026. Verify closure NOC.
                </p>
                <div className="flex gap-3 text-[11px] text-[#758078] mt-1 font-mono">
                  <span>Maturity: 15-Dec-2026</span>
                  <span>Principal Remaining: ₹21,500</span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">Acknowledge</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
