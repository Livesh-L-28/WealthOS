'use client';

import React, { useState } from 'react';
import { TrendingUp, ArrowUpRight, Calendar, Sparkles, ShieldCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface DataPoint {
  label: string;
  date: string;
  value: number;
}

const HISTORICAL_DATA: Record<TimeRange, DataPoint[]> = {
  '1M': [
    { label: 'Oct 10', date: '10 Oct 2026', value: 7195050 },
    { label: 'Oct 15', date: '15 Oct 2026', value: 7240200 },
    { label: 'Oct 20', date: '20 Oct 2026', value: 7298500 },
    { label: 'Oct 25', date: '25 Oct 2026', value: 7380000 },
    { label: 'Oct 30', date: '30 Oct 2026', value: 7425100 },
    { label: 'Nov 04', date: '04 Nov 2026', value: 7490000 },
    { label: 'Nov 08', date: '08 Nov 2026', value: 7537901.25 },
  ],
  '3M': [
    { label: 'Aug', date: 'August 2026', value: 6820000 },
    { label: 'Sep', date: 'September 2026', value: 7050000 },
    { label: 'Oct', date: 'October 2026', value: 7350000 },
    { label: 'Nov', date: 'November 2026', value: 7537901.25 },
  ],
  '6M': [
    { label: 'May', date: 'May 2026', value: 6410000 },
    { label: 'Jun', date: 'June 2026', value: 6580000 },
    { label: 'Jul', date: 'July 2026', value: 6720000 },
    { label: 'Aug', date: 'August 2026', value: 6890000 },
    { label: 'Sep', date: 'September 2026', value: 7180000 },
    { label: 'Nov', date: 'November 2026', value: 7537901.25 },
  ],
  '1Y': [
    { label: 'Q4 25', date: 'Q4 2025', value: 5920000 },
    { label: 'Q1 26', date: 'Q1 2026', value: 6250000 },
    { label: 'Q2 26', date: 'Q2 2026', value: 6680000 },
    { label: 'Q3 26', date: 'Q3 2026', value: 7120000 },
    { label: 'Q4 26', date: 'Q4 2026', value: 7537901.25 },
  ],
  'ALL': [
    { label: '2023', date: 'Year 2023', value: 4100000 },
    { label: '2024', date: 'Year 2024', value: 5350000 },
    { label: '2025', date: 'Year 2025', value: 6400000 },
    { label: '2026', date: 'Year 2026', value: 7537901.25 },
  ],
};

export function WealthOverviewCard() {
  const [range, setRange] = useState<TimeRange>('1M');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const data = HISTORICAL_DATA[range];
  const minValue = Math.min(...data.map((d) => d.value)) * 0.98;
  const maxValue = Math.max(...data.map((d) => d.value)) * 1.02;

  // Chart coordinate mapping (SVG width: 600, height: 180)
  const chartWidth = 600;
  const chartHeight = 180;
  const paddingX = 20;
  const paddingY = 20;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (chartWidth - paddingX * 2);
    const y =
      chartHeight -
      paddingY -
      ((d.value - minValue) / (maxValue - minValue)) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cx1 = prev.x + (curr.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) / 2;
    const cy2 = curr.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <Card className="relative overflow-hidden">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#758078]">
              Consolidated Net Worth
            </span>
            <Badge variant="positive" size="sm" className="gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Double-Entry Grounded</span>
            </Badge>
          </div>
          <div className="flex items-baseline gap-3 mt-1.5">
            <span className="text-3xl font-bold tracking-tight text-[#17231D]">
              ₹75,37,901.25
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-[#16A36A] bg-[#16A36A]/10 px-2 py-0.5 rounded-full border border-[#16A36A]/20">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              +₹3,42,850.00 (+4.76%)
            </span>
          </div>
          <p className="text-xs text-[#758078] mt-1">
            vs Previous Month &bull; Updated Today at 11:50 AM
          </p>
        </div>

        {/* Time Horizon Pills */}
        <div className="flex items-center bg-[#F7F9F7] border border-[#E7ECE8] rounded-xl p-1 self-start sm:self-auto">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((t) => (
            <button
              key={t}
              onClick={() => setRange(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                range === t
                  ? 'bg-white text-[#17231D] shadow-sm border border-[#E7ECE8]'
                  : 'text-[#758078] hover:text-[#17231D]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="mt-4 relative">
        {/* Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-[#17231D] text-white px-3 py-1.5 rounded-xl text-xs shadow-lg z-10 pointer-events-none animate-in fade-in duration-100">
            <p className="text-[10px] text-slate-300">{hoveredPoint.date}</p>
            <p className="font-bold text-[#34D399] font-mono">
              ₹{hoveredPoint.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Responsive SVG Chart */}
        <div className="w-full h-44">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A36A" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#16A36A" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal grid lines */}
            {[0.25, 0.5, 0.75].map((ratio, idx) => (
              <line
                key={idx}
                x1={paddingX}
                y1={chartHeight * ratio}
                x2={chartWidth - paddingX}
                y2={chartHeight * ratio}
                stroke="#E7ECE8"
                strokeDasharray="4 4"
              />
            ))}

            {/* Gradient Area Fill */}
            <path d={areaD} fill="url(#wealthGradient)" />

            {/* Green Line */}
            <path d={pathD} fill="none" stroke="#16A36A" strokeWidth="2.5" strokeLinecap="round" />

            {/* Interactive Points */}
            {points.map((pt, idx) => (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#16A36A"
                  strokeWidth="2.5"
                  className="hover:r-6 transition-all"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* X-Axis Date Labels */}
        <div className="flex justify-between items-center text-[11px] font-medium text-[#758078] px-2 pt-2 border-t border-[#E7ECE8]">
          {data.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}
