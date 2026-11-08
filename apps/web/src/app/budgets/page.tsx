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
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
  const [budgets] = useState<BudgetCategory[]>(BUDGET_DATA);

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallUtilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Budgets & Spend Tracking</h1>
          <p className="text-xs text-slate-400 mt-1">
            Category spend envelope allocations with real-time overspending alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>November 2026</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-2">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Budget</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Budget Pool
            </span>
            <PieChart className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Allocated across {budgets.length} expense categories</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Actual MTD Spend
            </span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Remaining Buffer: ₹{(totalAllocated - totalSpent).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overall Spend Ratio
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            {overallUtilization.toFixed(1)}%
          </p>
          <p className="text-[11px] text-amber-400 mt-1">Target limit: &le; 90.0% of monthly income</p>
        </Card>
      </div>

      {/* Category Envelopes List */}
      <Card>
        <CardHeader
          title="Category Allocations & Status"
          subtitle="Real-time warning threshold triggers at 85% and critical alerts at 100%+"
        />
        <div className="space-y-6">
          {budgets.map((b) => {
            const ratio = (b.spent / b.allocated) * 100;
            const isOverspent = ratio > 100;
            const isWarning = ratio >= 85 && ratio <= 100;

            const barColor = isOverspent
              ? 'bg-rose-500'
              : isWarning
              ? 'bg-amber-500'
              : 'bg-emerald-500';

            return (
              <div key={b.id} className="space-y-2 p-3 rounded bg-slate-900/50 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{b.category}</span>
                    {isOverspent && (
                      <Badge variant="negative" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-1 inline" /> Overspent ({ratio.toFixed(0)}%)
                      </Badge>
                    )}
                    {isWarning && (
                      <Badge variant="warning" size="sm">
                        Near Limit ({ratio.toFixed(0)}%)
                      </Badge>
                    )}
                    {!isOverspent && !isWarning && (
                      <Badge variant="positive" size="sm">
                        On Track ({ratio.toFixed(0)}%)
                      </Badge>
                    )}
                  </div>
                  <div className="font-mono text-xs text-slate-300">
                    ₹{b.spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ₹
                    {b.allocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

