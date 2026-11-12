'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  ChartContainer,
  FinancialHorizontalBarChart,
  FinancialTableFallback,
  HorizontalBarItem,
} from '../charts';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  status: 'HEALTHY' | 'WARNING' | 'EXCEEDED';
}

const CATEGORIES: BudgetCategory[] = [
  { id: 'b-1', name: 'Housing & EMI', allocated: 45000, spent: 45000, status: 'HEALTHY' },
  { id: 'b-2', name: 'Food & Groceries', allocated: 30000, spent: 22400, status: 'HEALTHY' },
  { id: 'b-3', name: 'Transportation & Fuel', allocated: 15000, spent: 12150, status: 'HEALTHY' },
  { id: 'b-4', name: 'Utilities & Telecom', allocated: 10000, spent: 8200, status: 'HEALTHY' },
  { id: 'b-5', name: 'Discretionary & Dining', allocated: 25000, spent: 18800, status: 'HEALTHY' },
  { id: 'b-6', name: 'Investments & SIPs', allocated: 55000, spent: 50000, status: 'HEALTHY' },
];

export function BudgetProgressCard() {
  const totalAllocated = 180000;
  const totalSpent = 151550;
  const remaining = totalAllocated - totalSpent;
  const utilization = (totalSpent / totalAllocated) * 100;

  const barItems: HorizontalBarItem[] = CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.name,
    value: cat.spent,
    secondaryValue: cat.allocated,
    color:
      cat.status === 'EXCEEDED'
        ? '#EF4444'
        : cat.status === 'WARNING'
        ? '#F59E0B'
        : '#10B981',
  }));

  const tableColumns = [
    { key: 'name', label: 'Budget Envelope' },
    { key: 'allocated', label: 'Allocated Limit (₹)', isCurrency: true, align: 'right' as const },
    { key: 'spent', label: 'Amount Spent (₹)', isCurrency: true, align: 'right' as const },
    { key: 'utilization', label: 'Utilization (%)', isPercentage: true, align: 'right' as const },
    { key: 'status', label: 'Health Status' },
  ];

  const tableData = CATEGORIES.map((cat) => ({
    name: cat.name,
    allocated: cat.allocated,
    spent: cat.spent,
    utilization: (cat.spent / cat.allocated) * 100,
    status: cat.status === 'EXCEEDED' ? 'Exceeded' : cat.status === 'WARNING' ? 'Warning (>85%)' : 'Healthy',
  }));

  const narrativeText = `Total budget pool of ${formatCurrency(
    totalAllocated
  )} is ${formatPercentage(utilization, { showSign: false })} consumed with ${formatCurrency(
    remaining
  )} remaining. Technology is overspent by ₹2,800.00 (+14%).`;

  return (
    <ChartContainer
      title="Monthly Budget & Envelope Tracking"
      subtitle="Active spend envelopes with real-time threshold warnings and overspending containment"
      termKey="budget"
      freshnessBadge={{
        label: `${utilization.toFixed(1)}% Utilized`,
        variant: utilization > 90 ? 'warning' : 'positive',
        icon: <ShieldCheck className="w-3 h-3" />,
      }}
      summaryNarrative={narrativeText}
      tableView={
        <FinancialTableFallback
          title="Budget Allocation & Spend Audit Ledger"
          columns={tableColumns}
          data={tableData}
          summaryRow={{
            name: 'Total Monthly Budget Envelope',
            allocated: totalAllocated,
            spent: totalSpent,
            utilization,
            status: utilization > 90 ? 'High' : 'Controlled',
          }}
          filename="wealthos_budget_envelopes.csv"
        />
      }
    >
      {/* Main Budget Aggregate Progress Bar */}
      <div className="mb-5 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <div className="flex justify-between items-baseline mb-2">
          <div>
            <span className="text-xs text-[#475569] font-medium">Spent so far: </span>
            <span className="text-base font-bold font-mono text-[#0F172A]">
              {formatCurrency(totalSpent)}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#475569] font-medium">Remaining: </span>
            <span className="text-base font-bold font-mono text-[#10B981]">
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>
        <div className="w-full bg-[#E2E8F0] rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              utilization > 90
                ? 'bg-[#EF4444]'
                : utilization > 80
                ? 'bg-[#F59E0B]'
                : 'bg-[#10B981]'
            }`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-[#475569] mt-1.5 font-medium">
          <span>Budget Pool: {formatCurrency(totalAllocated)}</span>
          <span>Target Period: November 2026</span>
        </div>
      </div>

      {/* Category Horizontal Bars */}
      <FinancialHorizontalBarChart
        items={barItems}
        showComparison={true}
        accessibleDescription="Budget Category Allocation and Spent Horizontal Bars"
      />
    </ChartContainer>
  );
}
