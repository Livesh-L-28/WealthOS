'use client';

import React from 'react';
import { Card, CardHeader } from '../ui/Card';
import { PieChart, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  status: 'HEALTHY' | 'WARNING' | 'EXCEEDED';
}

const CATEGORIES: BudgetCategory[] = [
  { id: 'b-1', name: 'Housing & Executive Residence', allocated: 85000, spent: 85000, status: 'HEALTHY' },
  { id: 'b-2', name: 'Food, Groceries & Dining', allocated: 35000, spent: 31500, status: 'WARNING' },
  { id: 'b-3', name: 'Technology & Cloud Hosting', allocated: 20000, spent: 22800, status: 'EXCEEDED' },
  { id: 'b-4', name: 'Mobility, Fuel & Transit', allocated: 15000, spent: 8500, status: 'HEALTHY' },
  { id: 'b-5', name: 'Health & Wellness', allocated: 10000, spent: 3750, status: 'HEALTHY' },
];

export function BudgetProgressCard() {
  const totalAllocated = 180000;
  const totalSpent = 151550;
  const remaining = totalAllocated - totalSpent;
  const utilization = (totalSpent / totalAllocated) * 100;

  return (
    <Card>
      <CardHeader
        title="Monthly Budget & Envelope Tracking"
        subtitle="Active spend envelopes with real-time threshold warnings"
        action={
          <Badge variant={utilization > 90 ? 'warning' : 'positive'}>
            {utilization.toFixed(1)}% Utilized
          </Badge>
        }
      />

      {/* Main Budget Progress Bar */}
      <div className="mb-6 p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
        <div className="flex justify-between items-baseline mb-2">
          <div>
            <span className="text-xs text-[#758078] font-medium">Spent so far: </span>
            <span className="text-base font-bold text-[#17231D]">
              ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#758078] font-medium">Remaining: </span>
            <span className="text-base font-bold text-[#16A36A]">
              ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="w-full bg-[#E7ECE8] rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              utilization > 90
                ? 'bg-[#DC5B5B]'
                : utilization > 80
                ? 'bg-[#D99A32]'
                : 'bg-[#16A36A]'
            }`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-[#758078] mt-1.5 font-medium">
          <span>Budget Pool: ₹{totalAllocated.toLocaleString('en-IN')}</span>
          <span>Target Period: November 2026</span>
        </div>
      </div>

      {/* Category Progress Bars */}
      <div className="space-y-3.5">
        {CATEGORIES.map((cat) => {
          const pct = (cat.spent / cat.allocated) * 100;

          return (
            <div key={cat.id} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  {cat.status === 'HEALTHY' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
                  )}
                  {cat.status === 'WARNING' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D99A32]" />
                  )}
                  {cat.status === 'EXCEEDED' && (
                    <AlertCircle className="w-3.5 h-3.5 text-[#DC5B5B]" />
                  )}
                  <span className="font-semibold text-[#17231D]">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#17231D]">
                    ₹{cat.spent.toLocaleString('en-IN')} / ₹{cat.allocated.toLocaleString('en-IN')}
                  </span>
                  <span
                    className={`font-semibold ${
                      cat.status === 'EXCEEDED'
                        ? 'text-[#DC5B5B]'
                        : cat.status === 'WARNING'
                        ? 'text-[#D99A32]'
                        : 'text-[#16A36A]'
                    }`}
                  >
                    ({pct.toFixed(0)}%)
                  </span>
                </div>
              </div>

              <div className="w-full bg-[#F0F4F1] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${
                    cat.status === 'EXCEEDED'
                      ? 'bg-[#DC5B5B]'
                      : cat.status === 'WARNING'
                      ? 'bg-[#D99A32]'
                      : 'bg-[#16A36A]'
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

