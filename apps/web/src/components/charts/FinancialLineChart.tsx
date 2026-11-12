'use client';

import React, { useState } from 'react';
import { formatCurrency, formatAxisTick } from '@/lib/formatters';
import { FinancialTooltip } from './FinancialTooltip';

export interface LineChartSeries {
  id: string;
  name: string;
  color: string;
  data: { label: string; date?: string; value: number }[];
  isDashed?: boolean;
}

export interface FinancialLineChartProps {
  series: LineChartSeries[];
  currency?: string;
  height?: number;
  width?: number;
  showGrid?: boolean;
  showZeroBaseline?: boolean;
  curve?: 'smooth' | 'linear';
  className?: string;
  accessibleDescription?: string;
}

export function FinancialLineChart({
  series,
  currency = 'INR',
  height = 200,
  width = 600,
  showGrid = true,
  showZeroBaseline = true,
  curve = 'smooth',
  className = '',
  accessibleDescription,
}: FinancialLineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!series || series.length === 0 || !series[0].data || series[0].data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[#475569]">
        No series data available.
      </div>
    );
  }

  const primaryData = series[0].data;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartAreaWidth = width - paddingLeft - paddingRight;
  const chartAreaHeight = height - paddingTop - paddingBottom;

  // Compute min and max across all series
  let allValues: number[] = [];
  series.forEach((s) => s.data.forEach((d) => allValues.push(d.value)));
  let minVal = Math.min(...allValues);
  let maxVal = Math.max(...allValues);

  if (minVal === maxVal) {
    minVal = minVal * 0.9;
    maxVal = maxVal * 1.1 || 100;
  } else {
    const range = maxVal - minVal;
    minVal = minVal - range * 0.05;
    maxVal = maxVal + range * 0.05;
  }

  // Ensure zero baseline is included if minVal < 0 and maxVal > 0
  if (showZeroBaseline && minVal < 0 && maxVal > 0) {
    // Keep bounds so zero line can be placed accurately
  }

  const getY = (val: number) => {
    return paddingTop + chartAreaHeight - ((val - minVal) / (maxVal - minVal)) * chartAreaHeight;
  };

  const getX = (idx: number) => {
    if (primaryData.length <= 1) return paddingLeft + chartAreaWidth / 2;
    return paddingLeft + (idx / (primaryData.length - 1)) * chartAreaWidth;
  };

  // Generate Path
  const generatePath = (data: { value: number }[]) => {
    const pts = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    if (curve === 'linear') {
      return pts.reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '');
    }

    return pts.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = pts[idx - 1];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }, '');
  };

  // Y-axis ticks (4 ticks)
  const yTicks = [
    maxVal,
    minVal + (maxVal - minVal) * 0.66,
    minVal + (maxVal - minVal) * 0.33,
    minVal,
  ];

  const zeroY = minVal <= 0 && maxVal >= 0 ? getY(0) : null;

  const hoveredDataPoint = hoverIndex !== null ? primaryData[hoverIndex] : null;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Tooltip Overlay */}
      {hoverIndex !== null && hoveredDataPoint && (
        <div
          className="absolute pointer-events-none transition-all z-20"
          style={{
            left: `${(getX(hoverIndex) / width) * 100}%`,
            top: '0px',
            transform:
              hoverIndex > primaryData.length / 2
                ? 'translateX(-105%)'
                : 'translateX(10%)',
          }}
        >
          <FinancialTooltip
            title={hoveredDataPoint.date || hoveredDataPoint.label}
            items={series.map((s) => ({
              label: s.name,
              value: s.data[hoverIndex]?.value ?? 0,
              color: s.color,
              currency,
              previousValue:
                hoverIndex > 0 ? s.data[hoverIndex - 1]?.value : undefined,
            }))}
          />
        </div>
      )}

      {/* Responsive SVG */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label={accessibleDescription || 'Financial Line Chart'}
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
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-[#475569] font-mono select-none"
                >
                  {formatAxisTick(val, currency)}
                </text>
              </g>
            );
          })}

        {/* Zero Baseline */}
        {zeroY !== null && (
          <line
            x1={paddingLeft}
            y1={zeroY}
            x2={width - paddingRight}
            y2={zeroY}
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
        )}

        {/* Series Paths */}
        {series.map((s) => (
          <path
            key={s.id}
            d={generatePath(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.isDashed ? '5 5' : undefined}
          />
        ))}

        {/* Hover Crosshair & Interactive Dots */}
        {hoverIndex !== null && (
          <line
            x1={getX(hoverIndex)}
            y1={paddingTop}
            x2={getX(hoverIndex)}
            y2={height - paddingBottom}
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {series.map((s) =>
          s.data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.value);
            const isHovered = hoverIndex === i;

            return (
              <circle
                key={`${s.id}-${i}`}
                cx={cx}
                cy={cy}
                r={isHovered ? 5.5 : 3.5}
                fill="#FFFFFF"
                stroke={s.color}
                strokeWidth={isHovered ? 3 : 2}
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })
        )}

        {/* Invisible Wide Hover Bands for Touch and Mouse Hover */}
        {primaryData.map((_, i) => {
          const colWidth = chartAreaWidth / primaryData.length;
          const x = getX(i) - colWidth / 2;
          return (
            <rect
              key={`band-${i}`}
              x={x}
              y={paddingTop}
              width={colWidth}
              height={chartAreaHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          );
        })}

        {/* X-Axis Baseline & Labels */}
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#E2E8F0"
        />
        {primaryData.map((d, i) => {
          // Display labels with reasonable spacing
          const step = Math.ceil(primaryData.length / 7);
          const shouldShow = i % step === 0 || i === primaryData.length - 1;
          if (!shouldShow) return null;

          return (
            <text
              key={`x-label-${i}`}
              x={getX(i)}
              y={height - paddingBottom + 16}
              textAnchor="middle"
              className="text-[10px] fill-[#475569] font-medium select-none"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Series Legend */}
      {series.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-2">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-[#0F172A]">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-medium">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

