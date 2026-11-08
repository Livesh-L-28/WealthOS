'use client';

import React, { useState } from 'react';
import {
  Target,
  PlusCircle,
  TrendingUp,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  currency: string;
}

const GOALS_DATA: GoalItem[] = [
  {
    id: 'g-1',
    name: 'Emergency Reserve Fund (6 Months Expenses)',
    targetAmount: 600000.0,
    currentAmount: 480000.0,
    targetDate: '2027-03-31',
    monthlyContribution: 30000.0,
    currency: 'INR',
  },
  {
    id: 'g-2',
    name: 'Commercial Real Estate Down Payment',
    targetAmount: 2500000.0,
    currentAmount: 1250000.0,
    targetDate: '2028-12-31',
    monthlyContribution: 50000.0,
    currency: 'INR',
  },
  {
    id: 'g-3',
    name: 'Sabbatical & Angel Venture Fund',
    targetAmount: 1500000.0,
    currentAmount: 450000.0,
    targetDate: '2029-06-30',
    monthlyContribution: 35000.0,
    currency: 'INR',
  },
];

export default function GoalsPage() {
  const [goals] = useState<GoalItem[]>(GOALS_DATA);

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Financial Goals & Milestones</h1>
          <p className="text-xs text-slate-400 mt-1">
            Target capital milestones, monthly contribution trajectories, and goal attainment forecasts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" className="gap-2">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Goal</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Target Milestone
            </span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{totalTarget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sum of active financial milestones</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Accumulated Capital
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{totalSaved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">
            {overallProgress.toFixed(1)}% of total targets achieved
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monthly Inflow Target
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{goals.reduce((sum, g) => sum + g.monthlyContribution, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Required monthly savings commitment</p>
        </Card>
      </div>

      {/* Goals List */}
      <Card>
        <CardHeader
          title="Active Goals"
          subtitle="Progress tracking against scheduled deadline dates"
        />
        <div className="space-y-6">
          {goals.map((g) => {
            const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);

            return (
              <div
                key={g.id}
                className="space-y-3 p-4 rounded-lg bg-slate-900/40 border border-slate-800/80"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">{g.name}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" /> Target Date: {g.targetDate} &bull; Monthly: ₹{g.monthlyContribution.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pct >= 80 ? 'positive' : 'brand'} size="sm">
                      {pct.toFixed(1)}% Completed
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Current: ₹{g.currentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span>Target: ₹{g.targetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

