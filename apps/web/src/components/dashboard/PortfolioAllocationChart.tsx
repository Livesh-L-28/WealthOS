'use client';

import React from 'react';
import { Card, CardHeader } from '../ui/Card';
import { TrendingUp, ArrowUpRight, PieChart } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface AssetAllocationSlice {
  label: string;
  percentage: number;
  value: number;
  color: string;
}

const ALLOCATION_DATA: AssetAllocationSlice[] = [
  { label: 'Indian Equities (NSE)', percentage: 42, value: 1941967.44, color: '#16A36A' },
  { label: 'Direct Mutual Funds', percentage: 34, value: 1572068.88, color: '#6475D8' },
  { label: 'Fixed Deposits & Debt', percentage: 16, value: 739797.12, color: '#D99A32' },
  { label: 'Gold & Sovereign Bonds', percentage: 8, value: 369898.56, color: '#0D9488' },
];

export function PortfolioAllocationChart() {
  const totalValue = 4623732.0;
  const investedCapital = 3468964.0;
  const unrealizedPl = totalValue - investedCapital;
  const unrealizedPlPct = (unrealizedPl / investedCapital) * 100;
  const realizedPl = 185400.0;

  // Compute SVG Donut Chart stroke offsets
  // Circumference for r=70: 2 * PI * 70 ≈ 439.82
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPct = 0;

  return (
    <Card>
      <CardHeader
        title="Investment Portfolio & Asset Allocation"
        subtitle="Mark-to-market positions, FIFO tax lot cost basis, and multi-asset distribution"
      />

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
        <div>
          <span className="text-[11px] text-[#758078] font-medium block">Portfolio AUM</span>
          <span className="text-base font-bold text-[#17231D]">₹46,23,732.00</span>
        </div>
        <div>
          <span className="text-[11px] text-[#758078] font-medium block">Invested Capital</span>
          <span className="text-base font-bold text-[#17231D]">₹34,68,964.00</span>
        </div>
        <div>
          <span className="text-[11px] text-[#758078] font-medium block">Unrealized P&L</span>
          <span className="text-base font-bold text-[#16A36A] flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5" />
            +₹11.54L (+33.3%)
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[#758078] font-medium block">Realized Capital Gain</span>
          <span className="text-base font-bold text-[#087A50]">₹1,85,400.00</span>
        </div>
      </div>

      {/* Donut Chart & Legend Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
        {/* SVG Donut Chart */}
        <div className="flex justify-center relative">
          <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
            {ALLOCATION_DATA.map((slice, idx) => {
              const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPct / 100) * circumference);
              accumulatedPct += slice.percentage;

              return (
                <circle
                  key={idx}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="24"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:opacity-90"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider">Total AUM</span>
            <span className="text-lg font-bold text-[#17231D]">₹46.2L</span>
            <span className="text-[10px] text-[#16A36A] font-semibold">+33.3% Return</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3">
          {ALLOCATION_DATA.map((slice, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-[#F7F9F7] transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }}></span>
                <span className="font-medium text-[#17231D]">{slice.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[#758078]">
                  ₹{(slice.value / 100000).toFixed(2)}L
                </span>
                <span className="font-semibold text-[#17231D] w-10 text-right">
                  {slice.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
