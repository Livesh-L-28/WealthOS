'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  PlusCircle,
  Sparkles,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
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
import {
  DashboardExecutiveSummary,
  DashboardPeriod,
} from '@/components/dashboard/DashboardExecutiveSummary';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import {
  CustomizeDashboardModal,
  DashboardCardConfig,
} from '@/components/dashboard/CustomizeDashboardModal';
import { AddAccountModal } from '@/components/modals/AddAccountModal';
import { AddTransactionModal } from '@/components/modals/AddTransactionModal';
import { AddInvestmentModal } from '@/components/modals/AddInvestmentModal';
import { CreateBudgetModal } from '@/components/modals/CreateBudgetModal';
import { CreateGoalModal } from '@/components/modals/CreateGoalModal';
import { UploadDocumentModal } from '@/components/modals/UploadDocumentModal';
import { TransferFundsModal } from '@/components/modals/TransferFundsModal';
import { RecordIncomeModal } from '@/components/modals/RecordIncomeModal';

const DEFAULT_CARD_CONFIG: DashboardCardConfig[] = [
  { id: 'wealth-trend', label: 'Net Worth Trajectory', description: 'Consolidated area chart with historical milestones', visible: true },
  { id: 'summary-kpis', label: 'Financial Summary Cards', description: 'Assets, liabilities, monthly inflows, and outflows', visible: true },
  { id: 'cashflow', label: 'Monthly Cash Flow', description: 'Inflow vs outflow grouped comparison', visible: true },
  { id: 'allocation', label: 'Portfolio Allocation', description: 'Multi-asset distribution and live unrealized returns', visible: true },
  { id: 'budgets', label: 'Budget Envelope Tracking', description: 'Category spend limits and overspending warnings', visible: true },
  { id: 'health', label: 'Solvency & Financial Health', description: 'Debt ratios and emergency liquidity runway', visible: true },
  { id: 'goals', label: 'Financial Goals Progress', description: 'Milestone trajectories and monthly savings targets', visible: true },
  { id: 'quick-actions', label: 'Quick Actions & Insights', description: 'Copilot alerts and direct entry shortcuts', visible: true },
  { id: 'transactions', label: 'Recent Transactions Ledger', description: 'Settled general journal entries', visible: true },
  { id: 'activity', label: 'Audit Event Log', description: 'Compliance audit trail and system events', visible: true },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('1M');
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [cards, setCards] = useState<DashboardCardConfig[]>(DEFAULT_CARD_CONFIG);

  // Modal states
  const [activeModal, setActiveModal] = useState<
    'account' | 'transaction' | 'investment' | 'budget' | 'goal' | 'document' | 'transfer' | 'income' | null
  >(null);

  // Global keyboard shortcuts for fast executive usability
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setActiveModal('transaction');
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setActiveModal('account');
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setActiveModal('document');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setActiveModal('transfer');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setActiveModal('income');
      } else if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleCard = (id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const handleResetDefaults = () => {
    setCards(DEFAULT_CARD_CONFIG);
  };

  const isCardVisible = (id: string) => {
    const card = cards.find((c) => c.id === id);
    return card ? card.visible : true;
  };

  const handleTriggerAction = (key: string) => {
    if (key === 'account') setActiveModal('account');
    if (key === 'transaction') setActiveModal('transaction');
    if (key === 'investment') setActiveModal('investment');
    if (key === 'budget') setActiveModal('budget');
    if (key === 'goal') setActiveModal('goal');
    if (key === 'document') setActiveModal('document');
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Executive Financial Overview
            </h1>
            <Badge variant="positive" size="sm" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Real-Time Sync</span>
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Consolidated double-entry ledger state and multi-asset wealth intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-medium text-[#0F172A]">
            <span>Onboarding Setup Checklist</span>
            <Badge variant="positive" size="sm">4/4 Complete</Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveModal('transaction')}
            className="gap-1.5"
            title="Press 'T' anywhere"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Add Transaction</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200">T</kbd>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveModal('transfer')}
            className="gap-1.5"
            title="Press 'F' anywhere"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Transfer</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200">F</kbd>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveModal('income')}
            className="gap-1.5"
            title="Press 'I' anywhere"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Salary Split</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200">I</kbd>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveModal('document')}
            className="gap-2"
            title="Press 'D' anywhere"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Import Statement</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200">D</kbd>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveModal('account')}
            className="gap-2"
            title="Press 'A' anywhere"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Account</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-emerald-700 text-emerald-100 rounded">A</kbd>
          </Button>
        </div>
      </div>

      {/* 5-Question Clarity Executive Summary Bar */}
      <DashboardExecutiveSummary
        period={period}
        onPeriodChange={setPeriod}
        onCustomizeClick={() => setIsCustomizeOpen(true)}
        lastUpdatedText="Just now"
      />

      {/* Lightweight Guided Onboarding Checklist */}
      <OnboardingChecklist onTriggerAction={handleTriggerAction} />

      {/* Section 1: Wealth Overview Chart */}
      {isCardVisible('wealth-trend') && <WealthOverviewCard />}

      {/* Section 2: Financial Summary KPI Cards (Assets, Liabilities, Inflow, Outflow) */}
      {isCardVisible('summary-kpis') && <FinancialSummaryCards />}

      {/* Section 3 & 4: Cash Flow Grouped Bars & Investment Portfolio Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isCardVisible('cashflow') && <CashFlowChart />}
        {isCardVisible('allocation') && <PortfolioAllocationChart />}
      </div>

      {/* Section 5 & 6: Budget Envelope Tracking & Financial Health Ratios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isCardVisible('budgets') && <BudgetProgressCard />}
        {isCardVisible('health') && <FinancialHealthCard />}
      </div>

      {/* Section 7 & 10: Financial Goals & Quick Actions with Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isCardVisible('goals') && <FinancialGoalsCard />}
        {isCardVisible('quick-actions') && (
          <QuickActionsCard onTriggerModal={handleTriggerAction} />
        )}
      </div>

      {/* Section 8 & 9: Recent Transactions & Audit Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isCardVisible('transactions') && (
          <div className="lg:col-span-2">
            <RecentTransactionsTable />
          </div>
        )}
        {isCardVisible('activity') && (
          <div>
            <RecentActivityCard />
          </div>
        )}
      </div>

      {/* Modals */}
      <CustomizeDashboardModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        cards={cards}
        onToggleCard={handleToggleCard}
        onResetDefaults={handleResetDefaults}
      />

      <AddAccountModal
        isOpen={activeModal === 'account'}
        onClose={() => setActiveModal(null)}
      />

      <AddTransactionModal
        isOpen={activeModal === 'transaction'}
        onClose={() => setActiveModal(null)}
      />

      <AddInvestmentModal
        isOpen={activeModal === 'investment'}
        onClose={() => setActiveModal(null)}
      />

      <CreateBudgetModal
        isOpen={activeModal === 'budget'}
        onClose={() => setActiveModal(null)}
      />

      <CreateGoalModal
        isOpen={activeModal === 'goal'}
        onClose={() => setActiveModal(null)}
      />

      <UploadDocumentModal
        isOpen={activeModal === 'document'}
        onClose={() => setActiveModal(null)}
      />

      <TransferFundsModal
        isOpen={activeModal === 'transfer'}
        onClose={() => setActiveModal(null)}
      />

      <RecordIncomeModal
        isOpen={activeModal === 'income'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
