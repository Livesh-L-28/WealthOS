import React from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  PlusCircle,
  Sparkles,
  Download,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WealthOverviewCard } from '@/components/dashboard/WealthTrendChart';
import { FinancialSummaryCards } from '@/components/dashboard/FinancialSummaryCards';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { PortfolioAllocationChart } from '@/components/dashboard/PortfolioAllocationChart';
import { BudgetProgressCard } from '@/components/dashboard/BudgetProgressCard';
import { FinancialHealthCard } from '@/components/dashboard/FinancialHealthCard';
import { FinancialGoalsCard } from '@/components/dashboard/FinancialGoalsCard';
import { RecentTransactionsTable } from '@/components/dashboard/RecentTransactionsTable';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">
              Executive Financial Overview
            </h1>
            <Badge variant="positive" size="sm" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Real-Time Sync</span>
            </Badge>
          </div>
          <p className="text-xs text-[#758078] mt-1">
            Consolidated double-entry ledger state and multi-asset wealth intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E7ECE8] text-xs font-medium text-[#17231D]">
            <span>Onboarding Setup Checklist</span>
            <Badge variant="positive" size="sm">4/4 Complete</Badge>
          </div>
          <Link href="/documents">
            <Button variant="outline" size="sm" className="gap-2">
              <UploadCloud className="w-3.5 h-3.5 text-[#16A36A]" />
              <span>Import Statement</span>
            </Button>
          </Link>
          <Link href="/accounts">
            <Button variant="primary" size="sm" className="gap-2">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Section 1: Wealth Overview Chart */}
      <WealthOverviewCard />

      {/* Section 2: Financial Summary KPI Cards (Assets, Liabilities, Inflow, Outflow) */}
      <FinancialSummaryCards />

      {/* Section 3 & 4: Cash Flow Grouped Bars & Investment Portfolio Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowChart />
        <PortfolioAllocationChart />
      </div>

      {/* Section 5 & 6: Budget Envelope Tracking & Financial Health Ratios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetProgressCard />
        <FinancialHealthCard />
      </div>

      {/* Section 7 & 10: Financial Goals & Quick Actions with Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialGoalsCard />
        <QuickActionsCard />
      </div>

      {/* Section 8 & 9: Recent Transactions & Audit Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTransactionsTable />
        </div>
        <div>
          <RecentActivityCard />
        </div>
      </div>
    </div>
  );
}
