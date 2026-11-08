'use client';

import React from 'react';
import { Card, CardHeader } from '../ui/Card';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

interface MonthlyCashFlow {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

const CASH_FLOW_DATA: MonthlyCashFlow[] = [
  { month: 'Aug 2026', income: 195000, expenses: 162000, net: 33000 },
  { month: 'Sep 2026', income: 202000, expenses: 158000, net: 44000 },
  { month: 'Oct 2026', income: 198000, expenses: 168200, net: 29800 },
  { month: 'Nov 2026', income: 212000, expenses: 151550, net: 60450 },
];

export function CashFlowChart() {
  const maxBarValue = 240000;

  return (
    <Card>
      <CardHeader
        title="Monthly Cash Flow & Inflow/Outflow Spread"
        subtitle="Grouped comparison of settled inflows against double-entry expenditure"
        action={
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-[#17231D]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#16A36A] inline-block"></span>
              Inflow
            </span>
            <span className="flex items-center gap-1.5 font-medium text-[#17231D]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#6475D8] inline-block"></span>
              Outflow
            </span>
          </div>
        }
      />

      {/* Main Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
        <div>
          <span className="text-[11px] text-[#758078] font-medium block">Total Inflow (Nov)</span>
          <span className="text-lg font-bold text-[#16A36A]">₹2,12,000.00</span>
        </div>
        <div>
          <span className="text-[11px] text-[#758078] font-medium block">Total Outflow (Nov)</span>
          <span className="text-lg font-bold text-[#6475D8]">₹1,51,550.00</span>
        </div>
        <div>
          <span className="text-[11px] text-[#758078] font-medium block">Net Savings Surplus</span>
          <span className="text-lg font-bold text-[#087A50] flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            +₹60,450.00 (28.5%)
          </span>
        </div>
      </div>

      {/* Grouped Bar Chart */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4 h-48 pt-4 pb-2 border-b border-[#E7ECE8]">
          {CASH_FLOW_DATA.map((item, idx) => {
            const incomeHeight = (item.income / maxBarValue) * 100;
            const expenseHeight = (item.expenses / maxBarValue) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="flex items-end gap-1.5 w-full justify-center h-full">
                  {/* Income Bar */}
                  <div
                    className="w-5 sm:w-8 rounded-t-md bg-[#16A36A] hover:bg-[#087A50] transition-all relative group/bar"
                    style={{ height: `${incomeHeight}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-semibold text-[#17231D] opacity-0 group-hover/bar:opacity-100 transition-opacity bg-white px-1.5 py-0.5 rounded shadow-sm border border-[#E7ECE8] pointer-events-none whitespace-nowrap z-10">
                      ₹{(item.income / 1000).toFixed(0)}k
                    </span>
                  </div>

                  {/* Expense Bar */}
                  <div
                    className="w-5 sm:w-8 rounded-t-md bg-[#6475D8] hover:bg-[#4F5FB8] transition-all relative group/bar"
                    style={{ height: `${expenseHeight}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-semibold text-[#17231D] opacity-0 group-hover/bar:opacity-100 transition-opacity bg-white px-1.5 py-0.5 rounded shadow-sm border border-[#E7ECE8] pointer-events-none whitespace-nowrap z-10">
                      ₹{(item.expenses / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[#758078] font-medium mt-1">
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center text-xs text-[#758078]">
          <span>Settlement Currency: INR</span>
          <span className="font-medium text-[#16A36A]">Positive Net Cash Flow in all 4 periods</span>
        </div>
      </div>
    </Card>
  );
}
