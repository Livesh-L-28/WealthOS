'use client';

import React, { useState } from 'react';
import { formatAxisTick, formatCurrency } from '@/lib/formatters';
import { FinancialTooltip } from './FinancialTooltip';

export interface WaterfallStep {
  label: string;
  sublabel?: string;
  amount: number;
  isTotal?: boolean; // If true, bar is anchored from 0 to amount (e.g. Starting and Ending)
  color?: string;
}

export interface FinancialWaterfallChartProps {
  steps: WaterfallStep[];
  currency?: string;
  height?: number;
  width?: number;
  showGrid?: boolean;
  accessibleDescription?: string;
  className?: string;
}

export function FinancialWaterfallChart({
  steps,
  currency = 'INR',
  height = 220,
  width = 600,
  showGrid = true,
  accessibleDescription,
  className = '',
}: FinancialWaterfallChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!steps || steps.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[#758078]">
        No waterfall data available.
      </div>
    );
  }

  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 34;

  const chartAreaWidth = width - paddingLeft - paddingRight;
  const chartAreaHeight = height - paddingTop - paddingBottom;

  // Calculate cumulative running totals for each step
  interface ProcessedStep extends WaterfallStep {
    startVal: number;
    endVal: number;
    delta: number;
  }

  let runningTotal = 0;
  const processedSteps: ProcessedStep[] = steps.map((s, idx) => {
    if (s.isTotal) {
      const step: ProcessedStep = {
        ...s,
        startVal: 0,
        endVal: s.amount,
        delta: s.amount,
      };
      runningTotal = s.amount;
      return step;
    }

    const prevTotal = runningTotal;
    runningTotal += s.amount;

    return {
      ...s,
      startVal: prevTotal,
      endVal: runningTotal,
      delta: s.amount,
    };
  });

  // Determine min and max values
  let allBounds: number[] = [0];
  processedSteps.forEach((s) => {
    allBounds.push(s.startVal);
    allBounds.push(s.endVal);
  });

  let minVal = Math.min(...allBounds);
  let maxVal = Math.max(...allBounds);

  if (minVal === maxVal) {
    minVal = 0;
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

  // Layout calculations
  const stepWidth = chartAreaWidth / processedSteps.length;
  const barWidth = Math.min(36, stepWidth * 0.7);

  // 4 Y-axis ticks
  const yTicks = [
    maxVal,
    minVal + (maxVal - minVal) * 0.66,
    minVal + (maxVal - minVal) * 0.33,
    minVal,
  ];

  const hoveredStep = hoverIndex !== null ? processedSteps[hoverIndex] : null;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Tooltip */}
      {hoverIndex !== null && hoveredStep && (
        <div
          className="absolute pointer-events-none transition-all z-20"
          style={{
            left: `${((paddingLeft + (hoverIndex + 0.5) * stepWidth) / width) * 100}%`,
            top: '0px',
            transform:
              hoverIndex > processedSteps.length / 2 ? 'translateX(-105%)' : 'translateX(10%)',
          }}
        >
          <FinancialTooltip
            title={hoveredStep.sublabel || hoveredStep.label}
            items={[
              {
                label: hoveredStep.isTotal ? 'Balance' : 'Movement',
                value: hoveredStep.delta,
                color: hoveredStep.color || (hoveredStep.delta >= 0 ? '#16A36A' : '#DC5B5B'),
                currency,
              },
              ...(!hoveredStep.isTotal
                ? [
                    {
                      label: 'Resulting Net',
                      value: hoveredStep.endVal,
                      currency,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}

      {/* Responsive SVG */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label={accessibleDescription || 'Net Worth Movement Waterfall Chart'}
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
          stroke="#94A3B8"
          strokeWidth="1.2"
        />

        {/* Connector lines between consecutive steps */}
        {processedSteps.map((step, idx) => {
          if (idx === processedSteps.length - 1) return null;
          const currentX = paddingLeft + (idx + 0.5) * stepWidth + barWidth / 2;
          const nextX = paddingLeft + (idx + 1 + 0.5) * stepWidth - barWidth / 2;
          const connY = getY(step.endVal);

          return (
            <line
              key={`conn-${idx}`}
              x1={currentX}
              y1={connY}
              x2={nextX}
              y2={connY}
              stroke="#CBD5E1"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          );
        })}

        {/* Floating and Total Bars */}
        {processedSteps.map((step, idx) => {
          const centerX = paddingLeft + (idx + 0.5) * stepWidth;
          const barX = centerX - barWidth / 2;

          let topVal: number;
          let botVal: number;

          if (step.isTotal) {
            topVal = Math.max(step.endVal, 0);
            botVal = Math.min(step.endVal, 0);
          } else {
            topVal = Math.max(step.startVal, step.endVal);
            botVal = Math.min(step.startVal, step.endVal);
          }

          const topY = getY(topVal);
          const botY = getY(botVal);
          const barH = Math.max(botY - topY, 3);

          const defaultColor = step.isTotal
            ? '#334155' // Slate navy for totals
            : step.delta >= 0
            ? '#16A36A' // Positive emerald
            : '#DC5B5B'; // Negative rose

          const barColor = step.color || defaultColor;
          const isHovered = hoverIndex === idx;

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {isHovered && (
                <rect
                  x={paddingLeft + idx * stepWidth + 2}
                  y={paddingTop}
                  width={stepWidth - 4}
                  height={chartAreaHeight}
                  fill="#F1F5F9"
                  opacity="0.5"
                  rx="6"
                />
              )}

              <rect
                x={barX}
                y={topY}
                width={barWidth}
                height={barH}
                fill={barColor}
                rx="3"
                className="transition-all hover:brightness-110"
              />

              {/* Value label directly above/below bar */}
              <text
                x={centerX}
                y={step.delta >= 0 ? topY - 5 : botY + 12}
                textAnchor="middle"
                className="text-[9px] font-mono font-bold fill-[#17231D] select-none"
              >
                {step.isTotal
                  ? formatCurrency(step.endVal, { currency, notation: 'compact' })
                  : `${step.delta >= 0 ? '+' : ''}${formatCurrency(step.delta, {
                      currency,
                      notation: 'compact',
                    })}`}
              </text>
            </g>
          );
        })}

        {/* X-Axis Step Labels */}
        {processedSteps.map((step, idx) => {
          const centerX = paddingLeft + (idx + 0.5) * stepWidth;
          return (
            <text
              key={`label-${idx}`}
              x={centerX}
              y={height - paddingBottom + 16}
              textAnchor="middle"
              className="text-[10px] fill-[#758078] font-medium select-none"
            >
              {step.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

