'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { FinancialTooltip } from './FinancialTooltip';

export interface HeatmapCell {
  id: string;
  label: string; // e.g. "Day 1", "Mon 2", etc.
  date?: string;
  value: number; // e.g. spend amount or correlation
}

export interface FinancialHeatmapProps {
  cells: HeatmapCell[];
  currency?: string;
  columns?: number;
  palette?: 'emerald' | 'rose' | 'amber' | 'slate';
  accessibleDescription?: string;
  className?: string;
}

export function FinancialHeatmap({
  cells,
  currency = 'INR',
  columns = 7, // 7 days a week default
  palette = 'rose', // spend intensity default
  accessibleDescription,
  className = '',
}: FinancialHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  if (!cells || cells.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[#475569]">
        No activity heatmap data available.
      </div>
    );
  }

  const values = cells.map((c) => c.value);
  const maxVal = Math.max(...values, 1);

  // Intensity color generator based on ratio 0..1
  const getCellColor = (val: number) => {
    if (val === 0) return '#F1F5F9'; // zero spend / neutral gray
    const ratio = Math.min(val / maxVal, 1);

    if (palette === 'emerald') {
      if (ratio < 0.25) return '#D1FAE5';
      if (ratio < 0.5) return '#6EE7B7';
      if (ratio < 0.75) return '#10B981';
      return '#047857';
    }

    if (palette === 'amber') {
      if (ratio < 0.25) return '#FEF3C7';
      if (ratio < 0.5) return '#FCD34D';
      if (ratio < 0.75) return '#F59E0B';
      return '#B45309';
    }

    // Default rose for spending intensity
    if (ratio < 0.25) return '#FFE4E6';
    if (ratio < 0.5) return '#FDA4AF';
    if (ratio < 0.75) return '#F43F5E';
    return '#BE123C';
  };

  return (
    <div
      role="region"
      aria-label={accessibleDescription || 'Financial Activity Intensity Heatmap'}
      className={`space-y-3 relative ${className}`}
    >
      {/* Tooltip Overlay */}
      {hoveredCell && (
        <div className="absolute top-0 right-2 z-20 pointer-events-none">
          <FinancialTooltip
            title={hoveredCell.date || hoveredCell.label}
            items={[
              {
                label: 'Activity Volume',
                value: hoveredCell.value,
                currency,
              },
            ]}
          />
        </div>
      )}

      {/* Grid */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, idx) => {
          const isHovered = hoveredCell?.id === cell.id;
          const bg = getCellColor(cell.value);

          return (
            <div
              key={cell.id || idx}
              onMouseEnter={() => setHoveredCell(cell)}
              onMouseLeave={() => setHoveredCell(null)}
              className={`h-9 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center p-1 ${
                isHovered
                  ? 'ring-2 ring-[#0F172A] scale-105 z-10'
                  : 'border-[#E2E8F0]/50 hover:border-[#0F172A]/40'
              }`}
              style={{ backgroundColor: bg }}
            >
              <span className="text-[9px] font-semibold text-[#0F172A]/80">
                {cell.label}
              </span>
              <span className="text-[8px] font-mono font-bold text-[#0F172A]">
                {cell.value > 0
                  ? formatCurrency(cell.value, { currency, notation: 'compact' })
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scale Legend */}
      <div className="flex items-center justify-between text-[10px] text-[#475569] pt-2 border-t border-[#E2E8F0]">
        <span>Low / Zero Intensity</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[#F1F5F9] border border-[#E2E8F0]" />
          <span className="w-3 h-3 rounded" style={{ backgroundColor: getCellColor(maxVal * 0.2) }} />
          <span className="w-3 h-3 rounded" style={{ backgroundColor: getCellColor(maxVal * 0.5) }} />
          <span className="w-3 h-3 rounded" style={{ backgroundColor: getCellColor(maxVal * 0.8) }} />
          <span className="w-3 h-3 rounded" style={{ backgroundColor: getCellColor(maxVal) }} />
        </div>
        <span>High Intensity ({formatCurrency(maxVal, { currency, notation: 'compact' })})</span>
      </div>
    </div>
  );
}

