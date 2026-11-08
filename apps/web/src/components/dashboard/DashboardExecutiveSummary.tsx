'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Scale,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  RefreshCw,
  SlidersHorizontal,
  Info,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { InfoTooltip } from '../ui/InfoTooltip';
import { Badge } from '../ui/Badge';

export type DashboardPeriod = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

interface DashboardExecutiveSummaryProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  onCustomizeClick: () => void;
  lastUpdatedText?: string;
  onRefresh?: () => void;
}

export function DashboardExecutiveSummary({
  period,
  onPeriodChange,
  onCustomizeClick,
  lastUpdatedText = 'Just now',
  onRefresh,
}: DashboardExecutiveSummaryProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Reporting Period & Stale Data Timestamp */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#E7ECE8] shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#17231D] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#16A36A]" />
            Reporting Period:
          </span>
          <div className="flex items-center bg-[#F7F9F7] border border-[#E7ECE8] rounded-xl p-0.5">
            {(
              [
                { id: '1M', label: 'This Month' },
                { id: '3M', label: 'Last 3M' },
                { id: 'YTD', label: 'Year-to-Date' },
                { id: 'ALL', label: 'All Time' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPeriodChange(p.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition ${
                  period === p.id
                    ? 'bg-white text-[#17231D] font-semibold shadow-xs'
                    : 'text-[#717D74] hover:text-[#17231D]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Stale data / last sync indicator */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#717D74] bg-[#FAFCFA] px-2.5 py-1 rounded-xl border border-[#E7ECE8]">
            <span className="w-2 h-2 rounded-full bg-[#16A36A]"></span>
            <span>Synced: {lastUpdatedText}</span>
            <button
              type="button"
              onClick={handleRefreshClick}
              className={`p-0.5 text-[#717D74] hover:text-[#17231D] rounded transition ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              title="Refresh ledger state"
              aria-label="Refresh ledger state"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Customize View Toggle */}
          <button
            type="button"
            onClick={onCustomizeClick}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#17231D] bg-[#F7F9F7] hover:bg-[#F0F4F1] rounded-xl border border-[#E7ECE8] transition"
          >
            <SlidersHorizontal className="w-3 h-3 text-[#717D74]" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* 5-Question Executive Clarity Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Q1: How much money do I currently have? (Net Worth) */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7ECE8] shadow-xs relative group hover:border-[#16A36A]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717D74] flex items-center gap-1">
              1. Total Net Worth
              <InfoTooltip termKey="net-worth" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#16A36A]/15 text-[#087A50] tracking-wider">
                ACTUAL
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#16A36A]/10 text-[#16A36A] flex items-center justify-center">
                <Scale className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-[#17231D] mt-2">
            ₹75,37,901
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#16A36A] mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+4.2% this period</span>
          </div>
          <p className="text-[10px] text-[#717D74] mt-1">
            Own ₹94.3L &minus; Owe ₹18.9L
          </p>
        </div>

        {/* Q2: What do I own? (Assets) */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7ECE8] shadow-xs relative group hover:border-[#16A36A]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717D74] flex items-center gap-1">
              2. What I Own (Assets)
              <InfoTooltip termKey="assets" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#16A36A]/15 text-[#087A50] tracking-wider">
                ACTUAL
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#16A36A]/10 text-[#16A36A] flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-[#17231D] mt-2">
            ₹94,30,201
          </p>
          <p className="text-[11px] text-[#16A36A] font-medium mt-1">
            Cash, Stocks & Funds
          </p>
          <p className="text-[10px] text-[#717D74] mt-1">
            ₹17.3L Liquid &bull; ₹76.9L Invested
          </p>
        </div>

        {/* Q3: How much do I owe? (Liabilities) */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7ECE8] shadow-xs relative group hover:border-[#DC5B5B]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717D74] flex items-center gap-1">
              3. What I Owe (Debts)
              <InfoTooltip termKey="liabilities" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#16A36A]/15 text-[#087A50] tracking-wider">
                ACTUAL
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#DC5B5B]/10 text-[#DC5B5B] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-[#DC5B5B] mt-2">
            ₹18,92,300
          </p>
          <p className="text-[11px] text-[#717D74] font-medium mt-1">
            Solvency Ratio: 4.98x
            <InfoTooltip termKey="solvency-ratio" />
          </p>
          <p className="text-[10px] text-[#717D74] mt-1">
            Low risk: 5x asset buffer
          </p>
        </div>

        {/* Q4: How much am I earning and spending? (Cashflow) */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7ECE8] shadow-xs relative group hover:border-[#16A36A]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717D74] flex items-center gap-1">
              4. Net Cash Flow
              <InfoTooltip termKey="cash-flow" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#16A36A]/15 text-[#087A50] tracking-wider">
                ACTUAL
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#6475D8]/10 text-[#6475D8] flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-[#16A36A] mt-2">
            +₹60,450
          </p>
          <p className="text-[11px] text-[#17231D] font-medium mt-1">
            28.5% Savings Rate
          </p>
          <p className="text-[10px] text-[#717D74] mt-1">
            In ₹2.12L &minus; Out ₹1.51L
          </p>
        </div>

        {/* Q5: How are my investments & goals progressing? */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7ECE8] shadow-xs relative group hover:border-[#16A36A]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717D74] flex items-center gap-1">
              5. Goals Progress
              <InfoTooltip content="Percentage of active milestone targets currently funded across your wealth accounts." />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#3B82F6]/15 text-[#1D4ED8] tracking-wider">
                PROJECTED
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#16A36A]/10 text-[#16A36A] flex items-center justify-center">
                <Target className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-[#17231D] mt-2">
            42.6%
          </p>
          <div className="w-full bg-[#E7ECE8] rounded-full h-1.5 mt-2">
            <div className="bg-[#16A36A] h-1.5 rounded-full" style={{ width: '42.6%' }}></div>
          </div>
          <p className="text-[10px] text-[#717D74] mt-1">
            ₹40.3L saved of ₹99.0L
          </p>
        </div>
      </div>
    </div>
  );
}
