'use client';

import React, { useState } from 'react';
import { formatAxisTick, formatCurrency } from '@/lib/formatters';
import { FinancialTooltip } from './FinancialTooltip';

export interface BarSeriesGroup {
  label: string;
  sublabel?: string;
  values: {
    key: string;
    label: string;
    value: number;
    color: string;
  }[];
}

export interface FinancialBarChartProps {
  groups: BarSeriesGroup[];
  currency?: string;
  height?: number;
  width?: number;
  showGrid?: boolean;
  accessibleDescription?: string;
  className?: string;
}

export function FinancialBarChart({
  groups,
  currency = 'INR',
  height = 200,
  width = 600,
  showGrid = true,
  accessibleDescription,
  className = '',
}: FinancialBarChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!groups || groups.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[#758078]">
        No bar chart data available.
      </div>
    );
  }

  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartAreaWidth = width - paddingLeft - paddingRight;
  const chartAreaHeight = height - paddingTop - paddingBottom;

  // Find min and max across all bars
  let allValues: number[] = [];
  groups.forEach((g) => g.values.forEach((v) => allValues.push(v.value)));
  let maxVal = Math.max(...allValues, 0);
  let minVal = Math.min(...allValues, 0);

  if (maxVal === 0 && minVal === 0) {
    maxVal = 1000;
  } else {
    const range = maxVal - minVal;
    maxVal = maxVal + range * 0.08;
    if (minVal < 0) minVal = minVal - range * 0.08;
  }

  const getY = (val: number) => {
    return paddingTop + chartAreaHeight - ((val - minVal) / (maxVal - minVal)) * chartAreaHeight;
  };

  const zeroY = getY(0);

  // Group layout
  const groupWidth = chartAreaWidth / groups.length;
  const numBarsPerGroup = groups[0].values.length;
  const barGap = 4;
  const maxBarWidth = Math.min(28, (groupWidth * 0.7) / numBarsPerGroup);

  // 4 Y-axis grid ticks
  const yTicks = [
    maxVal,
    minVal + (maxVal - minVal) * 0.66,
    minVal + (maxVal - minVal) * 0.33,
    minVal,
  ];

  const hoveredGroup = hoverIndex !== null ? groups[hoverIndex] : null;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Tooltip */}
      {hoverIndex !== null && hoveredGroup && (
        <div
          className="absolute pointer-events-none transition-all z-20"
          style={{
            left: `${((paddingLeft + (hoverIndex + 0.5) * groupWidth) / width) * 100}%`,
            top: '0px',
            transform:
              hoverIndex > groups.length / 2 ? 'translateX(-105%)' : 'translateX(10%)',
          }}
        >
          <FinancialTooltip
            title={hoveredGroup.sublabel || hoveredGroup.label}
            items={hoveredGroup.values.map((v) => ({
              label: v.label,
              value: v.value,
              color: v.color,
              currency,
            }))}
          />
        </div>
      )}

      {/* Responsive SVG */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label={accessibleDescription || 'Financial Bar Chart'}
      >
        {/* Horizontal Gridlines & Y-Axis Labels */}
        {showGrid &&
          yTicks.map((val, idx) => {
            const yPos = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                  stroke="#E7ECE8"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-[#758078] font-mono select-none"
                >
                  {formatAxisTick(val, currency)}
                </text>
              </g>
            );
          })}

        {/* Zero Baseline */}
        <line
          x1={paddingLeft}
          y1={zeroY}
          x2={width - paddingRight}
          y2={zeroY}
          stroke="#64748B"
          strokeWidth="1.2"
        />

        {/* Bars */}
        {groups.map((group, gIdx) => {
          const groupCenterX = paddingLeft + (gIdx + 0.5) * groupWidth;
          const totalBarsWidth = numBarsPerGroup * maxBarWidth + (numBarsPerGroup - 1) * barGap;
          const startX = groupCenterX - totalBarsWidth / 2;
          const isGroupHovered = hoverIndex === gIdx;

          return (
            <g
              key={gIdx}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(gIdx)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {/* Highlight Background on Hover */}
              {isGroupHovered && (
                <rect
                  x={paddingLeft + gIdx * groupWidth + 2}
                  y={paddingTop}
                  width={groupWidth - 4}
                  height={chartAreaHeight}
                  fill="#F1F5F9"
                  opacity="0.6"
                  rx="6"
                />
              )}

              {group.values.map((bar, bIdx) => {
                const barX = startX + bIdx * (maxBarWidth + barGap);
                const barY = bar.value >= 0 ? getY(bar.value) : zeroY;
                const barH = Math.abs(getY(bar.value) - zeroY);

                return (
                  <rect
                    key={bIdx}
                    x={barX}
                    y={barY}
                    width={maxBarWidth}
                    height={Math.max(barH, 2)}
                    fill={bar.color}
                    rx="3"
                    className="transition-all hover:brightness-110"
                  />
                );
              })}
            </g>
          );
        })}

        {/* X-Axis Labels */}
        {groups.map((group, gIdx) => {
          const groupCenterX = paddingLeft + (gIdx + 0.5) * groupWidth;
          return (
            <text
              key={`label-${gIdx}`}
              x={groupCenterX}
              y={height - paddingBottom + 16}
              textAnchor="middle"
              className="text-[10px] fill-[#758078] font-medium select-none"
            >
              {group.label}
            </text>
          );
        })}
      </svg>

      {/* Series Legend */}
      {groups[0].values.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-2">
          {groups[0].values.map((v) => (
            <div key={v.key} className="flex items-center gap-1.5 text-xs text-[#17231D]">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: v.color }}
              />
              <span className="font-medium">{v.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

