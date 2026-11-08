'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '../ui/Card';
import { Target, ChevronRight, Calendar } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface GoalSummary {
  id: string;
  title: string;
  current: number;
  target: number;
  targetDate: string;
  monthly: number;
}

const DASHBOARD_GOALS: GoalSummary[] = [
  {
    id: 'g-1',
    title: 'Emergency Safety Reserve',
    current: 480000,
    target: 900000,
    targetDate: 'Mar 2027',
    monthly: 35000,
  },
  {
    id: 'g-2',
    title: 'Commercial Property Down Payment',
    current: 1250000,
    target: 2500000,
    targetDate: 'Dec 2028',
    monthly: 50000,
  },
  {
    id: 'g-3',
    title: 'Angel Venture Fund',
    current: 450000,
    target: 1500000,
    targetDate: 'Jun 2029',
    monthly: 35000,
  },
];

export function FinancialGoalsCard() {
  return (
    <Card>
      <CardHeader
        title="Active Wealth Goals"
        subtitle="Systematic milestone progress and deadline trajectories"
        action={
          <Link
            href="/goals"
            className="text-xs font-semibold text-[#16A36A] hover:text-[#087A50] inline-flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      <div className="space-y-4">
        {DASHBOARD_GOALS.map((goal) => {
          const pct = (goal.current / goal.target) * 100;

          return (
            <div key={goal.id} className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-[#17231D]">{goal.title}</span>
                <span className="text-xs font-mono font-bold text-[#16A36A]">{pct.toFixed(0)}%</span>
              </div>

              <div className="w-full bg-[#E7ECE8] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#16A36A] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#717D74] pt-1">
                <span className="font-mono">
                  ₹{goal.current.toLocaleString('en-IN')} of ₹{goal.target.toLocaleString('en-IN')}
                </span>
                <span className="font-semibold text-[#16A36A] text-[10px]">
                  ₹{(goal.target - goal.current).toLocaleString('en-IN')} remaining
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#717D74]">
                <span>Paced at ₹{goal.monthly.toLocaleString('en-IN')}/mo</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#717D74]" />
                  Target: {goal.targetDate}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

