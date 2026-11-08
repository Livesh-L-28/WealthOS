'use client';

import React, { useState } from 'react';
import {
  PieChart,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  TrendingDown,
  ShieldAlert,
  Calendar,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { CreateBudgetModal, NewBudgetData } from '@/components/modals/CreateBudgetModal';

interface BudgetCategory {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  currency: string;
}

const BUDGET_DATA: BudgetCategory[] = [
  {
    id: 'b-1',
    category: 'Housing & Mortgage',
    allocated: 80000.0,
    spent: 80000.0,
    currency: 'INR',
  },
  {
    id: 'b-2',
    category: 'Groceries & Dining',
    allocated: 35000.0,
    spent: 31500.0,
    currency: 'INR',
  },
  {
    id: 'b-3',
    category: 'Technology & Cloud Hosting',
    allocated: 20000.0,
    spent: 22800.0, // > 110% Overspent
    currency: 'INR',
  },
  {
    id: 'b-4',
    category: 'Travel & Mobility',
    allocated: 15000.0,
    spent: 8500.0,
    currency: 'INR',
  },
  {
    id: 'b-5',
    category: 'Health & Wellness',
    allocated: 10000.0,
    spent: 8750.0, // 87.5% Warning
    currency: 'INR',
  },
];

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetCategory[]>(BUDGET_DATA);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallUtilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const surplus = totalAllocated - totalSpent;

  const handleBudgetCreated = (newB: NewBudgetData) => {
    const record: BudgetCategory = {
      id: `b-${Date.now()}`,
      category: newB.category,
      allocated: newB.allocated,
      spent: 0,
      currency: 'INR',
    };
    setBudgets((prev) => [...prev, record]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">Budgets & Envelope Tracking</h1>
            <Badge variant="positive" size="sm">
              <Calendar className="w-3 h-3 mr-1 inline" />
              November 2026
            </Badge>
          </div>
          <p className="text-xs text-[#717D74] mt-1">
            Category spend envelope allocations with real-time overspending alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Budget Envelope</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Total Budget Pool
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#6475D8]/10 flex items-center justify-center text-[#6475D8]">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#17231D] mt-2">
            ₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#758078] mt-1">Allocated across 5 active envelopes</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Settled Expenditure
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F7F9F7] flex items-center justify-center text-[#17231D]">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#17231D] mt-2">
            ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#758078] mt-1">
            {overallUtilization.toFixed(1)}% of total allocation consumed
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Budget Headroom
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#16A36A]/10 flex items-center justify-center text-[#16A36A]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#16A36A] mt-2">
            ₹{surplus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#16A36A] font-medium mt-1">Available spending capacity</p>
        </Card>
      </div>

      {/* Envelope Progress Bars */}
      <Card>
        <CardHeader
          title="Envelope Allocations & Health Indicators"
          subtitle="Real-time variance gauges against current billing cycle"
        />

        <div className="space-y-5">
          {budgets.map((b) => {
            const ratio = (b.spent / b.allocated) * 100;
            const isOverspent = ratio > 100;
            const isWarning = ratio >= 85 && ratio <= 100;

            return (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-2">
                    {isOverspent && (
                      <AlertCircle className="w-4 h-4 text-[#DC5B5B] flex-shrink-0" />
                    )}
                    {isWarning && (
                      <AlertTriangle className="w-4 h-4 text-[#D99A32] flex-shrink-0" />
                    )}
                    {!isOverspent && !isWarning && (
                      <CheckCircle2 className="w-4 h-4 text-[#16A36A] flex-shrink-0" />
                    )}
                    <span className="font-semibold text-sm text-[#17231D]">{b.category}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-[#758078]">
                      ₹{b.spent.toLocaleString('en-IN')} / ₹{b.allocated.toLocaleString('en-IN')}
                    </span>
                    <Badge
                      variant={
                        isOverspent
                          ? 'negative'
                          : isWarning
                          ? 'warning'
                          : 'positive'
                      }
                      size="sm"
                    >
                      {ratio.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                <div className="w-full bg-[#E7ECE8] rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      isOverspent
                        ? 'bg-[#DC5B5B]'
                        : isWarning
                        ? 'bg-[#D99A32]'
                        : 'bg-[#16A36A]'
                    }`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-[#758078] pt-1">
                  <span>
                    {isOverspent
                      ? `Overspent by ₹${(b.spent - b.allocated).toLocaleString('en-IN')}`
                      : `Remaining: ₹${(b.allocated - b.spent).toLocaleString('en-IN')}`}
                  </span>
                  <span className="font-medium text-[#17231D]">
                    {isOverspent ? 'Budget Exceeded' : isWarning ? 'Close to Limit' : 'Within Budget'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Create Budget Modal */}
      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBudgetCreated={handleBudgetCreated}
      />
    </div>
  );
}
