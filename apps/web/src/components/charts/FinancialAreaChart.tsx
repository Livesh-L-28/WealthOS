'use client';

import React, { useState } from 'react';
import { formatAxisTick, formatCurrency } from '@/lib/formatters';
import { FinancialTooltip } from './FinancialTooltip';

export interface AreaDataPoint {
  label: string;
  date?: string;
  value: number;
}

export interface FinancialAreaChartProps {
  data: AreaDataPoint[];
  color?: string;
  gradientId?: string;
  currency?: string;
  height?: number;
  width?: number;
  showGrid?: boolean;
  metricName?: string;
  accessibleDescription?: string;
  className?: string;
}

export function FinancialAreaChart({
  data,
  color = '#16A36A',
  gradientId = 'financialAreaGradient',
  currency = 'INR',
  height = 200,
  width = 600,
  showGrid = true,
  metricName = 'Net Worth',
  accessibleDescription,
  className = '',
}: FinancialAreaChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[#758078]">
        No area chart data available.
      </div>
    );
  }

  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartAreaWidth = width - paddingLeft - paddingRight;
  const chartAreaHeight = height - paddingTop - paddingBottom;

  const values = data.map((d) => d.value);
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  if (minVal === maxVal) {
    minVal = minVal * 0.95;
    maxVal = maxVal * 1.05 || 100;
  } else {
    const range = maxVal - minVal;
    minVal = minVal - range * 0.05;
    maxVal = maxVal + range * 0.05;
  }

  const getY = (val: number) => {
    return paddingTop + chartAreaHeight - ((val - minVal) / (maxVal - minVal)) * chartAreaHeight;
  };

  const getX = (idx: number) => {
    if (data.length <= 1) return paddingLeft + chartAreaWidth / 2;
    return paddingLeft + (idx / (data.length - 1)) * chartAreaWidth;
  };

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));

  const lineD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cx1 = prev.x + (curr.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) / 2;
    const cy2 = curr.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
  }, '');

  const areaBottom = height - paddingBottom;
  const areaD = `${lineD} L ${points[points.length - 1].x} ${areaBottom} L ${points[0].x} ${areaBottom} Z`;

  // 4 Y-axis grid ticks
  const yTicks = [
    maxVal,
    minVal + (maxVal - minVal) * 0.66,
    minVal + (maxVal - minVal) * 0.33,
    minVal,
  ];

  const hoveredPoint = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Tooltip */}
      {hoverIndex !== null && hoveredPoint && (
        <div
          className="absolute pointer-events-none transition-all z-20"
          style={{
            left: `${(getX(hoverIndex) / width) * 100}%`,
            top: '0px',
            transform:
              hoverIndex > data.length / 2 ? 'translateX(-105%)' : 'translateX(10%)',
          }}
        >
          <FinancialTooltip
            title={hoveredPoint.date || hoveredPoint.label}
            items={[
              {
                label: metricName,
                value: hoveredPoint.value,
                color,
                currency,
                previousValue: hoverIndex > 0 ? data[hoverIndex - 1].value : undefined,
              },
            ]}
          />
        </div>
      )}

      {/* Responsive SVG */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label={accessibleDescription || `${metricName} Trend Area Chart`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

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

        {/* Gradient Area Fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Crisp Line Stroke */}
        <path
          d={lineD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Hover Crosshair */}
        {hoverIndex !== null && (
          <line
            x1={getX(hoverIndex)}
            y1={paddingTop}
            x2={getX(hoverIndex)}
            y2={areaBottom}
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {/* Interactive Dots */}
        {points.map((pt, idx) => {
          const isHovered = hoverIndex === idx;
          return (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={isHovered ? 5.5 : 3.5}
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={isHovered ? 3 : 2}
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          );
        })}

        {/* Wide Hover Target Bands */}
        {data.map((_, i) => {
          const colWidth = chartAreaWidth / data.length;
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

        {/* X-Axis Baseline & Date Labels */}
        <line
          x1={paddingLeft}
          y1={areaBottom}
          x2={width - paddingRight}
          y2={areaBottom}
          stroke="#E7ECE8"
        />
        {data.map((d, i) => {
          const step = Math.ceil(data.length / 7);
          const shouldShow = i % step === 0 || i === data.length - 1;
          if (!shouldShow) return null;

          return (
            <text
              key={`x-label-${i}`}
              x={getX(i)}
              y={areaBottom + 16}
              textAnchor="middle"
              className="text-[10px] fill-[#758078] font-medium select-none"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
