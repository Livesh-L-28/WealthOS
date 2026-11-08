'use client';

import React from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, Wallet, CreditCard, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';

interface SummaryCardItem {
  id: string;
  label: string;
  amount: number;
  change: string;
  isPositive: boolean;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  sparkline: number[];
}

const SUMMARY_ITEMS: SummaryCardItem[] = [
  {
    id: 'assets',
    label: 'Total Assets',
    amount: 9430201.25,
    change: '+5.2%',
    isPositive: true,
    subtitle: 'Across 6 institutions',
    icon: Landmark,
    sparkline: [88, 90, 89, 91, 93, 94.3],
  },
  {
    id: 'liabilities',
    label: 'Total Liabilities',
    amount: 1892300.0,
    change: '-2.1%',
    isPositive: true, // Debt reduction is positive!
    subtitle: 'Mortgages & corporate cards',
    icon: CreditCard,
    sparkline: [21, 20.5, 20, 19.5, 19.1, 18.9],
  },
  {
    id: 'income',
    label: 'Monthly Inflows',
    amount: 212000.0,
    change: '+12.4%',
    isPositive: true,
    subtitle: 'Salary, advisory & dividends',
    icon: ArrowDownRight,
    sparkline: [180, 185, 190, 195, 200, 212],
  },
  {
    id: 'expenses',
    label: 'Monthly Outflows',
    amount: 151550.0,
    change: '-9.9%',
    isPositive: true, // Lower spending is positive!
    subtitle: '84.2% of monthly budget',
    icon: Wallet,
    sparkline: [175, 168, 162, 159, 155, 151.5],
  },
];

export function FinancialSummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {SUMMARY_ITEMS.map((item) => {
        const Icon = item.icon;
        const minSpark = Math.min(...item.sparkline);
        const maxSpark = Math.max(...item.sparkline);

        return (
          <Card key={item.id} className="hover:border-[#D1D9D3] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                {item.label}
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#F0F4F1] flex items-center justify-center text-[#16A36A]">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-[#17231D] tracking-tight">
                ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-[#E7ECE8]">
              <span className="text-[#758078] truncate">{item.subtitle}</span>
              <span className="inline-flex items-center font-semibold text-[#16A36A] bg-[#16A36A]/10 px-2 py-0.5 rounded-full text-[11px]">
                {item.change}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
