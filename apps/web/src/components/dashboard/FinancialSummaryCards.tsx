'use client';

import React from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, Wallet, CreditCard } from 'lucide-react';
import { Card } from '../ui/Card';
import { InfoTooltip } from '../ui/InfoTooltip';

interface SummaryCardItem {
  id: string;
  label: string;
  termKey?: 'assets' | 'liabilities' | 'cash-flow';
  explanation?: string;
  amount: number;
  change: string;
  isPositive: boolean;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SUMMARY_ITEMS: SummaryCardItem[] = [
  {
    id: 'assets',
    label: 'Total Assets',
    termKey: 'assets',
    amount: 9430201.25,
    change: '+5.2%',
    isPositive: true,
    subtitle: 'Across 6 institutions',
    icon: Landmark,
  },
  {
    id: 'liabilities',
    label: 'Total Liabilities',
    termKey: 'liabilities',
    amount: 1892300.0,
    change: '-2.1%',
    isPositive: true, // Debt reduction is positive!
    subtitle: 'Mortgages & credit cards',
    icon: CreditCard,
  },
  {
    id: 'income',
    label: 'Monthly Inflows',
    explanation: 'Total cash received this month from salary, professional advisory fees, and investment dividends.',
    amount: 212000.0,
    change: '+12.4%',
    isPositive: true,
    subtitle: 'Salary, advisory & dividends',
    icon: ArrowDownRight,
  },
  {
    id: 'expenses',
    label: 'Monthly Outflows',
    explanation: 'Total settled expenditures across all connected bank accounts and cards for the period.',
    amount: 151550.0,
    change: '-9.9%',
    isPositive: true, // Lower spending is positive!
    subtitle: '84.2% of monthly budget',
    icon: Wallet,
  },
];

export interface FinancialSummaryCardsProps {
  items?: SummaryCardItem[];
}

export function FinancialSummaryCards({ items }: FinancialSummaryCardsProps = {}) {
  const displayItems = items || SUMMARY_ITEMS;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {displayItems.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.id} className="hover:border-[#CBD5E1] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center">
                {item.label}
                {item.termKey ? (
                  <InfoTooltip termKey={item.termKey} />
                ) : item.explanation ? (
                  <InfoTooltip title={item.label} content={item.explanation} />
                ) : null}
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-[#10B981]">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#0F172A] tracking-tight">
                ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-[#E2E8F0]">
              <span className="text-[#64748B] truncate">{item.subtitle}</span>
              <span className="inline-flex items-center font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full text-[11px]">
                {item.change}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
