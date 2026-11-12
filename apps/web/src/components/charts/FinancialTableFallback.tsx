'use client';

import React from 'react';
import { Download, Table as TableIcon } from 'lucide-react';
import { formatCurrency, formatPercentage, exportToCSV } from '@/lib/formatters';

export interface TableFallbackColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  isCurrency?: boolean;
  isPercentage?: boolean;
  isDate?: boolean;
}

export interface FinancialTableFallbackProps {
  title: string;
  columns: TableFallbackColumn[];
  data: Record<string, any>[];
  currency?: string;
  filename?: string;
  summaryRow?: Record<string, any>;
  className?: string;
}

export function FinancialTableFallback({
  title,
  columns,
  data,
  currency = 'INR',
  filename,
  summaryRow,
  className = '',
}: FinancialTableFallbackProps) {
  const handleExport = () => {
    const headers = columns.map((col) => col.label);
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = row[col.key];
        if (col.isCurrency) {
          return formatCurrency(val, { currency });
        }
        if (col.isPercentage) {
          return formatPercentage(val);
        }
        return val !== undefined && val !== null ? String(val) : '';
      })
    );

    if (summaryRow) {
      rows.push(
        columns.map((col) => {
          const val = summaryRow[col.key];
          if (col.isCurrency) {
            return formatCurrency(val, { currency });
          }
          if (col.isPercentage) {
            return formatPercentage(val);
          }
          return val !== undefined && val !== null ? String(val) : '';
        })
      );
    }

    exportToCSV(filename || `${title.toLowerCase().replace(/\s+/g, '_')}_data.csv`, headers, rows);
  };

  return (
    <div className={`space-y-3 bg-white rounded-xl border border-[#E2E8F0] p-4 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-[#10B981]" />
          <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">{title} (Audit Ledger)</h4>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/20 rounded-lg transition-colors focus:ring-2 focus:ring-[#10B981]/30"
          title="Download data as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse" role="table" aria-label={title}>
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`py-2 px-3 text-[11px] font-semibold text-[#475569] ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-[#475569]">
                  No records to display.
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-[#F8FAFC] transition-colors">
                  {columns.map((col) => {
                    const val = row[col.key];
                    let displayVal = val;
                    let extraClass = '';

                    if (col.isCurrency) {
                      displayVal = formatCurrency(val, { currency });
                      extraClass = 'font-mono';
                    } else if (col.isPercentage) {
                      displayVal = formatPercentage(val);
                      extraClass = `font-mono ${Number(val) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`;
                    }

                    return (
                      <td
                        key={col.key}
                        className={`py-2 px-3 text-[#0F172A] ${extraClass} ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}

            {summaryRow && (
              <tr className="bg-[#F8FAFC] font-semibold border-t-2 border-[#E2E8F0]">
                {columns.map((col) => {
                  const val = summaryRow[col.key];
                  let displayVal = val;
                  if (col.isCurrency) {
                    displayVal = formatCurrency(val, { currency });
                  } else if (col.isPercentage) {
                    displayVal = formatPercentage(val);
                  }
                  return (
                    <td
                      key={col.key}
                      className={`py-2.5 px-3 text-[#0F172A] ${
                        col.isCurrency ? 'font-mono' : ''
                      } ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

