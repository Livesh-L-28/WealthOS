'use client';

import React from 'react';
import { Card, CardHeader } from '../ui/Card';
import { ShieldCheck, HeartPulse, Check, Info } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface HealthMetric {
  label: string;
  value: string;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
  target: string;
  explanation: string;
}

const HEALTH_METRICS: HealthMetric[] = [
  {
    label: 'Savings Rate',
    value: '28.5%',
    status: 'EXCELLENT',
    target: '> 20.0%',
    explanation: 'Surplus cash flow retained after settled expenses and taxes.',
  },
  {
    label: 'Debt-to-Asset Solvency',
    value: '20.0%',
    status: 'EXCELLENT',
    target: '< 35.0%',
    explanation: 'Total debt (₹18.9L) represents low leverage against assets (₹94.3L).',
  },
  {
    label: 'Emergency Liquidity',
    value: '3.2 Months',
    status: 'NEEDS_ATTENTION',
    target: '6.0 Months',
    explanation: 'Liquid cash covers 3.2 months of non-discretionary burn.',
  },
  {
    label: 'Asset Diversification',
    value: 'Balanced',
    status: 'GOOD',
    target: 'Multi-Asset',
    explanation: 'Equities (42%), Mutual Funds (34%), Debt (16%), Gold (8%).',
  },
];

export function FinancialHealthCard() {
  return (
    <Card>
      <CardHeader
        title="Financial Health & Solvency Ratios"
        subtitle="Deterministic solvency ratios and risk containment benchmarks"
        action={
          <Badge variant="positive" className="gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Score: 88/100</span>
          </Badge>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {HEALTH_METRICS.map((m, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#17231D]">{m.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    m.status === 'EXCELLENT'
                      ? 'bg-[#16A36A]/10 text-[#087A50]'
                      : m.status === 'GOOD'
                      ? 'bg-[#6475D8]/10 text-[#6475D8]'
                      : 'bg-[#D99A32]/10 text-[#D99A32]'
                  }`}
                >
                  {m.status === 'EXCELLENT' ? 'Optimal' : m.status === 'GOOD' ? 'Good' : 'Approaching'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#17231D]">{m.value}</span>
                <span className="text-[11px] text-[#758078]">Goal: {m.target}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#758078] mt-2 pt-2 border-t border-[#E7ECE8]">
              {m.explanation}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
