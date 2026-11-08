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
    <div className={`space-y-3 bg-white rounded-xl border border-[#E7ECE8] p-4 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-[#E7ECE8]">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-[#16A36A]" />
          <h4 className="text-xs font-bold text-[#17231D] tracking-tight">{title} (Audit Ledger)</h4>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#16A36A] bg-[#16A36A]/10 hover:bg-[#16A36A]/20 border border-[#16A36A]/20 rounded-lg transition-colors focus:ring-2 focus:ring-[#16A36A]/30"
          title="Download data as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse" role="table" aria-label={title}>
          <thead>
            <tr className="border-b border-[#E7ECE8] bg-[#F7F9F7]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`py-2 px-3 text-[11px] font-semibold text-[#758078] ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7ECE8]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-[#758078]">
                  No records to display.
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-[#FAFCFA] transition-colors">
                  {columns.map((col) => {
                    const val = row[col.key];
                    let displayVal = val;
                    let extraClass = '';

                    if (col.isCurrency) {
                      displayVal = formatCurrency(val, { currency });
                      extraClass = 'font-mono';
                    } else if (col.isPercentage) {
                      displayVal = formatPercentage(val);
                      extraClass = `font-mono ${Number(val) >= 0 ? 'text-[#16A36A]' : 'text-[#DC5B5B]'}`;
                    }

                    return (
                      <td
                        key={col.key}
                        className={`py-2 px-3 text-[#17231D] ${extraClass} ${
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
              <tr className="bg-[#F7F9F7] font-semibold border-t-2 border-[#E7ECE8]">
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
                      className={`py-2.5 px-3 text-[#17231D] ${
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

