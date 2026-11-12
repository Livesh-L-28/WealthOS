'use client';

import React, { useState } from 'react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

export interface FinancialDonutChartProps {
  slices: DonutSlice[];
  totalValue?: number;
  centerLabel?: string;
  currency?: string;
  size?: number;
  strokeWidth?: number;
  accessibleDescription?: string;
  className?: string;
}

export function FinancialDonutChart({
  slices,
  totalValue,
  centerLabel = 'Total Value',
  currency = 'INR',
  size = 200,
  strokeWidth = 24,
  accessibleDescription,
  className = '',
}: FinancialDonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<DonutSlice | null>(null);

  if (!slices || slices.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[#475569]">
        No distribution data available.
      </div>
    );
  }

  const computedTotal = totalValue || slices.reduce((acc, s) => acc + s.value, 0);

  // Compute percentages
  const slicesWithPct = slices.map((s) => ({
    ...s,
    percentage: computedTotal > 0 ? (s.value / computedTotal) * 100 : 0,
  }));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPct = 0;

  return (
    <div
      role="region"
      aria-label={accessibleDescription || `${centerLabel} Donut Distribution`}
      className={`grid grid-cols-1 md:grid-cols-2 items-center gap-6 ${className}`}
    >
      {/* SVG Donut */}
      <div className="flex justify-center relative select-none">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 overflow-visible"
        >
          {slicesWithPct.map((slice, idx) => {
            const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPct / 100) * circumference);
            accumulatedPct += slice.percentage;

            const isHovered = hoveredSlice?.id === slice.id;

            return (
              <circle
                key={slice.id || idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredSlice(slice)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        {/* Center Label & Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
            {hoveredSlice ? hoveredSlice.label : centerLabel}
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#0F172A] tracking-tight mt-0.5">
            {formatCurrency(hoveredSlice ? hoveredSlice.value : computedTotal, {
              currency,
              notation: 'compact',
            })}
          </span>
          {hoveredSlice && (
            <span className="text-[10px] font-bold font-mono text-[#10B981] mt-0.5">
              {formatPercentage(hoveredSlice.percentage, { showSign: false })}
            </span>
          )}
        </div>
      </div>

      {/* Interactive Legend with Exact Amounts & Percentages */}
      <div className="space-y-2.5">
        {slicesWithPct.map((slice, idx) => {
          const isHovered = hoveredSlice?.id === slice.id;
          return (
            <div
              key={slice.id || idx}
              onMouseEnter={() => setHoveredSlice(slice)}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                isHovered
                  ? 'bg-[#F8FAFC] border-[#10B981]/40 shadow-xs'
                  : 'border-transparent hover:bg-[#F8FAFC]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-md flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <div className="truncate">
                  <span className="text-xs font-semibold text-[#0F172A] block truncate">
                    {slice.label}
                  </span>
                  <span className="text-[10px] text-[#475569] font-mono">
                    {formatPercentage(slice.percentage, { showSign: false })} of Total
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-3">
                <span className="text-xs font-bold font-mono text-[#0F172A] block">
                  {formatCurrency(slice.value, { currency })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

