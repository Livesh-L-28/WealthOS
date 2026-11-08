'use client';

import React from 'react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

export interface TooltipItem {
  label: string;
  value: number;
  color?: string;
  currency?: string;
  previousValue?: number;
}

export interface FinancialTooltipProps {
  title: string;
  subtitle?: string;
  items: TooltipItem[];
  footer?: string;
  x?: number;
  y?: number;
  className?: string;
}

export function FinancialTooltip({
  title,
  subtitle,
  items,
  footer,
  className = '',
}: FinancialTooltipProps) {
  return (
    <div
      role="tooltip"
      className={`bg-[#17231D] text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[180px] pointer-events-none z-30 transition-all ${className}`}
    >
      <div className="border-b border-slate-700 pb-1.5 mb-2">
        <p className="font-semibold text-slate-100 text-[11px]">{title}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const delta =
            item.previousValue !== undefined ? item.value - item.previousValue : undefined;
          const deltaPct =
            item.previousValue !== undefined && item.previousValue !== 0
              ? (delta! / Math.abs(item.previousValue)) * 100
              : undefined;

          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {item.color && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="text-[11px] text-slate-300 truncate max-w-[120px]">
                  {item.label}:
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-slate-50 text-[11px]">
                  {formatCurrency(item.value, { currency: item.currency || 'INR' })}
                </span>
                {deltaPct !== undefined && (
                  <span
                    className={`block text-[9px] font-mono ${
                      delta! >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'
                    }`}
                  >
                    {formatPercentage(deltaPct)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {footer && (
        <div className="mt-2 pt-1.5 border-t border-slate-700 text-[9px] text-slate-400 font-mono">
          {footer}
        </div>
      )}
    </div>
  );
}
