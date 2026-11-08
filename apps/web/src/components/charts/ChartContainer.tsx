'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { InfoTooltip } from '../ui/InfoTooltip';
import {
  Table as TableIcon,
  LineChart as ChartIcon,
  Download,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

export type ChartTimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  termKey?: any;
  freshnessBadge?: {
    label: string;
    variant?: 'positive' | 'warning' | 'neutral';
    icon?: React.ReactNode;
  };
  staleDataWarning?: string;
  valuationDate?: string;
  currency?: string;
  timeRange?: ChartTimeRange;
  availableRanges?: ChartTimeRange[];
  onTimeRangeChange?: (range: ChartTimeRange) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  summaryNarrative?: string;
  tableView?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  rightAction?: React.ReactNode;
}

export function ChartContainer({
  title,
  subtitle,
  termKey,
  freshnessBadge = {
    label: 'Double-Entry Grounded',
    variant: 'positive',
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  staleDataWarning,
  valuationDate,
  currency = 'INR',
  timeRange,
  availableRanges = ['1M', '3M', '6M', '1Y', 'ALL'],
  onTimeRangeChange,
  isLoading = false,
  error = null,
  onRetry,
  isEmpty = false,
  emptyMessage = 'No financial records available for the selected period.',
  summaryNarrative,
  tableView,
  children,
  className = '',
  rightAction,
}: ChartContainerProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#758078] flex items-center">
              {title}
              {termKey && <InfoTooltip termKey={termKey} />}
            </span>
            {freshnessBadge && (
              <Badge variant={freshnessBadge.variant || 'positive'} size="sm" className="gap-1">
                {freshnessBadge.icon}
                <span>{freshnessBadge.label}</span>
              </Badge>
            )}
            {valuationDate && (
              <span className="text-[10px] text-[#758078] flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {valuationDate}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-[#758078] mt-1">{subtitle}</p>}
        </div>

        {/* Controls: Time horizon pills, View Toggle, Right Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onTimeRangeChange && timeRange && (
            <div
              role="radiogroup"
              aria-label="Select date range"
              className="flex items-center bg-[#F7F9F7] border border-[#E7ECE8] rounded-xl p-1"
            >
              {availableRanges.map((r) => (
                <button
                  key={r}
                  role="radio"
                  aria-checked={timeRange === r}
                  onClick={() => onTimeRangeChange(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    timeRange === r
                      ? 'bg-white text-[#17231D] shadow-xs border border-[#E7ECE8]'
                      : 'text-[#758078] hover:text-[#17231D]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Accessible View as Table Toggle */}
          {tableView && (
            <button
              onClick={() => setShowTable((prev) => !prev)}
              aria-pressed={showTable}
              aria-label={showTable ? 'Switch to graphical chart view' : 'Switch to accessible tabular view'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showTable
                  ? 'bg-[#16A36A] text-white border-[#16A36A]'
                  : 'bg-white text-[#17231D] border-[#E7ECE8] hover:bg-[#F7F9F7]'
              }`}
            >
              {showTable ? (
                <>
                  <ChartIcon className="w-3.5 h-3.5" />
                  <span>Chart View</span>
                </>
              ) : (
                <>
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>View as Table</span>
                </>
              )}
            </button>
          )}

          {rightAction}
        </div>
      </div>

      {/* Stale Data Warning Banner */}
      {staleDataWarning && (
        <div
          role="alert"
          className="mt-3 px-3 py-2 bg-[#D99A32]/10 border border-[#D99A32]/30 rounded-xl flex items-center gap-2 text-xs text-[#B45309]"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{staleDataWarning}</span>
        </div>
      )}

      {/* Body: Loading / Error / Empty / Chart or Table View */}
      <div className="mt-4">
        {isLoading ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3 animate-pulse bg-[#F7F9F7] rounded-xl border border-[#E7ECE8]">
            <RefreshCw className="w-6 h-6 text-[#16A36A] animate-spin" />
            <span className="text-xs font-medium text-[#758078]">
              Computing double-entry financial metrics...
            </span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="h-48 flex flex-col items-center justify-center gap-3 bg-[#DC5B5B]/5 rounded-xl border border-[#DC5B5B]/20 p-6 text-center"
          >
            <AlertTriangle className="w-6 h-6 text-[#DC5B5B]" />
            <p className="text-xs font-semibold text-[#17231D]">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#17231D] rounded-lg hover:bg-[#243042]"
              >
                Retry Calculation
              </button>
            )}
          </div>
        ) : isEmpty ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 bg-[#F7F9F7] rounded-xl border border-[#E7ECE8] p-6 text-center">
            <span className="text-xs font-semibold text-[#17231D]">No Financial Activity</span>
            <p className="text-xs text-[#758078] max-w-sm">{emptyMessage}</p>
          </div>
        ) : showTable && tableView ? (
          <div>{tableView}</div>
        ) : (
          <div>{children}</div>
        )}
      </div>

      {/* Plain-English Financial Summary Footer */}
      {summaryNarrative && !isLoading && !error && !isEmpty && (
        <div className="mt-4 pt-3 text-[11px] text-[#717D74] bg-[#FAFCFA] px-3.5 py-2.5 rounded-xl border border-[#E7ECE8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#16A36A] flex-shrink-0" />
            <span>
              <strong>Financial Insight:</strong> {summaryNarrative}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#16A36A] font-semibold flex-shrink-0">
            Unit: {currency}
          </span>
        </div>
      )}
    </Card>
  );
}
