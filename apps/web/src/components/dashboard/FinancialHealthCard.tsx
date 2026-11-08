'use client';

import React from 'react';
import { ShieldCheck, HeartPulse, Check, Info } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { InfoTooltip } from '../ui/InfoTooltip';
import {
  ChartContainer,
  FinancialTableFallback,
  FinancialHorizontalBarChart,
  HorizontalBarItem,
} from '../charts';
import { formatPercentage } from '@/lib/formatters';

interface HealthMetric {
  label: string;
  termKey?: 'solvency-ratio' | 'diversification';
  value: string;
  score: number; // 0..100
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
  target: string;
  explanation: string;
}

const HEALTH_METRICS: HealthMetric[] = [
  {
    label: 'Savings Rate',
    value: '28.5%',
    score: 95,
    status: 'EXCELLENT',
    target: '> 20.0%',
    explanation: 'Surplus cash flow retained after settled expenses and taxes.',
  },
  {
    label: 'Debt-to-Asset Solvency',
    termKey: 'solvency-ratio',
    value: '20.0%',
    score: 90,
    status: 'EXCELLENT',
    target: '< 35.0%',
    explanation: 'Total debt (₹18.9L) represents low leverage against assets (₹94.3L).',
  },
  {
    label: 'Emergency Liquidity',
    value: '3.2 Months',
    score: 53,
    status: 'NEEDS_ATTENTION',
    target: '6.0 Months',
    explanation: 'Liquid cash covers 3.2 months of non-discretionary burn.',
  },
  {
    label: 'Asset Diversification',
    termKey: 'diversification',
    value: 'Balanced',
    score: 85,
    status: 'GOOD',
    target: 'Multi-Asset',
    explanation: 'Equities (42%), Mutual Funds (34%), Debt (16%), Gold (8%).',
  },
];

export function FinancialHealthCard() {
  const tableColumns = [
    { key: 'label', label: 'Financial Health Metric' },
    { key: 'value', label: 'Current Value' },
    { key: 'target', label: 'Target Benchmark' },
    { key: 'score', label: 'Pillar Score (/100)', align: 'right' as const },
    { key: 'status', label: 'Audit Status' },
  ];

  const tableData = HEALTH_METRICS.map((m) => ({
    label: m.label,
    value: m.value,
    target: m.target,
    score: `${m.score} / 100`,
    status: m.status === 'EXCELLENT' ? 'Optimal' : m.status === 'GOOD' ? 'Good' : 'Approaching Benchmark',
  }));

  const narrativeText =
    'Overall financial health score stands at 88/100 (EXCELLENT). Solvency and savings rate provide robust risk containment, while emergency runway is expanding toward the 6-month target.';

  return (
    <ChartContainer
      title="Financial Health & Solvency Ratios"
      subtitle="Deterministic solvency ratios and risk containment benchmarks verified across assets and debt"
      freshnessBadge={{
        label: 'Score: 88/100',
        variant: 'positive',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
      }}
      summaryNarrative={narrativeText}
      tableView={
        <FinancialTableFallback
          title="Financial Health & Risk Scorecard"
          columns={tableColumns}
          data={tableData}
          filename="wealthos_financial_health_scorecard.csv"
        />
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {HEALTH_METRICS.map((m, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#17231D] flex items-center">
                  {m.label}
                  {m.termKey && <InfoTooltip termKey={m.termKey} />}
                </span>
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
                <span className="text-xl font-bold font-mono text-[#17231D]">{m.value}</span>
                <span className="text-[11px] text-[#717D74]">Goal: {m.target}</span>
              </div>

              {/* Visual Health Score Bar */}
              <div className="mt-2.5 h-1.5 w-full bg-[#E7ECE8] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    m.status === 'EXCELLENT'
                      ? 'bg-[#16A36A]'
                      : m.status === 'GOOD'
                      ? 'bg-[#6475D8]'
                      : 'bg-[#D99A32]'
                  }`}
                  style={{ width: `${m.score}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-[#717D74] mt-2 pt-2 border-t border-[#E7ECE8]">
              {m.explanation}
            </p>
          </div>
        ))}
      </div>
    </ChartContainer>
  );
}
