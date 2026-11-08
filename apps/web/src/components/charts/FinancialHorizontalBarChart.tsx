'use client';

import React from 'react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

export interface HorizontalBarItem {
  id: string;
  label: string;
  value: number;
  secondaryValue?: number; // e.g. Allocated budget or Target
  color?: string;
  category?: string;
  icon?: React.ReactNode;
}

export interface FinancialHorizontalBarChartProps {
  items: HorizontalBarItem[];
  currency?: string;
  maxValue?: number;
  showComparison?: boolean; // If true, compares value with secondaryValue (e.g. Spent vs Allocated)
  accessibleDescription?: string;
  className?: string;
}

export function FinancialHorizontalBarChart({
  items,
  currency = 'INR',
  maxValue,
  showComparison = false,
  accessibleDescription,
  className = '',
}: FinancialHorizontalBarChartProps) {
  if (!items || items.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[#758078]">
        No category ranking data available.
      </div>
    );
  }

  const computedMax =
    maxValue ||
    Math.max(
      ...items.map((i) => Math.max(i.value, i.secondaryValue || 0)),
      1
    );

  return (
    <div
      role="region"
      aria-label={accessibleDescription || 'Category Ranking Chart'}
      className={`space-y-3 ${className}`}
    >
      {items.map((item, idx) => {
        const pctOfMax = Math.min((item.value / computedMax) * 100, 100);
        const utilizationPct =
          item.secondaryValue && item.secondaryValue > 0
            ? (item.value / item.secondaryValue) * 100
            : null;

        // Semantic status color
        let barColor = item.color || '#16A36A';
        let statusBadge = null;

        if (showComparison && utilizationPct !== null) {
          if (utilizationPct > 100) {
            barColor = '#DC5B5B'; // Over budget
            statusBadge = (
              <span className="text-[10px] font-bold text-[#DC5B5B] bg-[#DC5B5B]/10 px-1.5 py-0.5 rounded">
                Over by {formatPercentage(utilizationPct - 100, { showSign: false })}
              </span>
            );
          } else if (utilizationPct >= 85) {
            barColor = '#D99A32'; // Warning
            statusBadge = (
              <span className="text-[10px] font-bold text-[#D99A32] bg-[#D99A32]/10 px-1.5 py-0.5 rounded">
                {formatPercentage(utilizationPct, { showSign: false })} Used
              </span>
            );
          } else {
            statusBadge = (
              <span className="text-[10px] font-bold text-[#16A36A] bg-[#16A36A]/10 px-1.5 py-0.5 rounded">
                {formatPercentage(utilizationPct, { showSign: false })} Used
              </span>
            );
          }
        }

        return (
          <div key={item.id || idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#758078] w-4">{idx + 1}.</span>
                {item.icon && <span className="text-[#16A36A]">{item.icon}</span>}
                <span className="font-semibold text-[#17231D]">{item.label}</span>
                {statusBadge}
              </div>

              <div className="text-right flex items-baseline gap-2">
                <span className="font-mono font-bold text-[#17231D]">
                  {formatCurrency(item.value, { currency })}
                </span>
                {item.secondaryValue !== undefined && (
                  <span className="font-mono text-[11px] text-[#758078]">
                    / {formatCurrency(item.secondaryValue, { currency })}
                  </span>
                )}
              </div>
            </div>

            {/* Visual Bar Track */}
            <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pctOfMax}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

