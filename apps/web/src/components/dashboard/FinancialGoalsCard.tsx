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
    id: 'g-bike',
    title: 'Bike',
    current: 1876543,
    target: 2345678,
    targetDate: 'Dec 2030',
    monthly: 35000,
  },
  {
    id: 'g-fire',
    title: 'Financial Independence (FIRE)',
    current: 4250000,
    target: 10000000,
    targetDate: 'Dec 2032',
    monthly: 75000,
  },
  {
    id: 'g-ev',
    title: 'Luxury EV (BMW i4 M50)',
    current: 1850000,
    target: 7500000,
    targetDate: 'Jun 2027',
    monthly: 50000,
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
            className="text-xs font-semibold text-[#10B981] hover:text-[#059669] inline-flex items-center gap-0.5"
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
            <div key={goal.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-[#0F172A]">{goal.title}</span>
                <span className="text-xs font-mono font-bold text-[#10B981]">{pct.toFixed(0)}%</span>
              </div>

              <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#10B981] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#64748B] pt-1">
                <span className="font-mono">
                  ₹{goal.current.toLocaleString('en-IN')} of ₹{goal.target.toLocaleString('en-IN')}
                </span>
                <span className="font-semibold text-[#10B981] text-[10px]">
                  ₹{(goal.target - goal.current).toLocaleString('en-IN')} remaining
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#64748B]">
                <span>Paced at ₹{goal.monthly.toLocaleString('en-IN')}/mo</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#64748B]" />
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

