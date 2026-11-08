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
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
      { name: 'Transportation & Fuel', amount: 1450, percentage: 29.9, color: 'bg-indigo-500' },
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
      { name: 'Housing & Utilities', amount: 12500, percentage: 36.5, color: 'bg-indigo-500' },
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
      { name: 'Rent & Real Estate Lease', amount: 85000, percentage: 56.1, color: 'bg-indigo-500' },
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
      { name: 'Housing & Mortgages', amount: 1020000, percentage: 55.3, color: 'bg-indigo-500' },
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

  return (
    <div className="space-y-8">
      {/* Header & Cadence Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Expense Intelligence & Burn Radar</h1>
            <Badge variant="positive" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Real-Time</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic cash flow tracking across daily, weekly, monthly, and annual billing cadences.
          </p>
        </div>

        {/* Time Cadence Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeCadence[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setCadence(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                cadence === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {current.cadenceLabel}
            </span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
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
            <span className="text-slate-500">{current.comparisonLabel}</span>
          </div>
        </Card>

        {/* Budget Ceiling & Burn Runway */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Budget Ceiling
            </span>
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              ₹{current.budgetCeiling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Utilization</span>
              <span className={utilizationPct > 90 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                {utilizationPct.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              50/30/20 Discipline
            </span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold text-emerald-400">76% Needs</span>
              <span className="text-xs text-slate-400">24% Wants</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Healthy essential cost containment within 80% ceiling.
            </p>
          </div>
        </Card>

        {/* Estimated Savings */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Headroom Remaining
            </span>
            <DollarSign className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-300">
              ₹{(current.budgetCeiling - current.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Available surplus for investment deployment.
          </p>
        </Card>
      </div>

      {/* Time-Series Cadence Breakdown & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cadence Velocity Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title={`Expense Distribution — ${current.cadenceLabel}`}
              subtitle="Chronological outflow distribution and projected end-of-period run-rates"
            />
            <div className="mt-6">
              <div className="flex items-end gap-3 h-48 pt-4 pb-2 border-b border-slate-800">
                {current.bars.map((bar, idx) => {
                  const maxAmount = Math.max(...current.bars.map((b) => b.amount));
                  const heightPct = (bar.amount / maxAmount) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        ₹{bar.amount.toLocaleString('en-IN')}
                      </div>
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          bar.isProjected
                            ? 'bg-slate-700/60 border border-dashed border-slate-500 hover:bg-slate-600'
                            : 'bg-indigo-600 hover:bg-indigo-500'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[11px] text-slate-400 font-medium truncate max-w-[60px] text-center">
                        {bar.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block"></span>
                    Actual Settled Expense
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 border border-dashed border-slate-500 inline-block"></span>
                    Projected Run-Rate
                  </span>
                </div>
                <span>Double-entry verified</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Category Breakdown */}
        <div>
          <Card>
            <CardHeader
              title="Top Burn Categories"
              subtitle="Spending concentration and allocation shares"
            />
            <div className="mt-4 space-y-3">
              {current.categories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat.name}</span>
                    <span className="text-slate-400">
                      ₹{cat.amount.toLocaleString('en-IN')} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${cat.color}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Itemized Expense Log */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Itemized Expense Log ({current.cadenceLabel})</h2>
            <p className="text-xs text-slate-400">Line-item journal entries linked to primary bank accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter:</span>
            {(['ALL', 'NEED', 'WANT'] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filterType === ft
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
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
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Merchant / Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Settlement Account</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-200">{expense.name}</td>
                  <td className="py-3 px-4 text-slate-400">{expense.category}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        expense.type === 'NEED'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {expense.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{expense.account}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{expense.date}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-rose-400">
                    -₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
