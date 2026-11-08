'use client';

import React, { useState } from 'react';
import {
  Scale,
  TrendingUp,
  ShieldCheck,
  Building2,
  Car,
  Landmark,
  CreditCard,
  Briefcase,
  PieChart,
  Sparkles,
  Zap,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ScheduleItem {
  installment: number;
  dueDate: string;
  emi: number;
  principal: number;
  interest: number;
  remaining: number;
  status: 'PAID' | 'DUE' | 'UPCOMING';
}

const SAMPLE_SCHEDULE: ScheduleItem[] = [
  { installment: 1, dueDate: '2026-01-01', emi: 22894.0, principal: 13727.0, interest: 9167.0, remaining: 986273.0, status: 'PAID' },
  { installment: 2, dueDate: '2026-02-01', emi: 22894.0, principal: 13853.0, interest: 9041.0, remaining: 972420.0, status: 'PAID' },
  { installment: 3, dueDate: '2026-03-01', emi: 22894.0, principal: 13980.0, interest: 8914.0, remaining: 958440.0, status: 'DUE' },
  { installment: 4, dueDate: '2026-04-01', emi: 22894.0, principal: 14108.0, interest: 8786.0, remaining: 944332.0, status: 'UPCOMING' },
  { installment: 5, dueDate: '2026-05-01', emi: 22894.0, principal: 14237.0, interest: 8657.0, remaining: 930095.0, status: 'UPCOMING' },
];

export default function NetWorthPage() {
  const [strategy, setStrategy] = useState<'AVALANCHE' | 'SNOWBALL'>('AVALANCHE');
  const [extraPayment, setExtraPayment] = useState<number>(10000);

  const assets = [
    { name: 'Depository Bank Accounts', amount: 1735200.5, icon: Landmark, share: '18.4%' },
    { name: 'Direct Equity & Demat Holdings', amount: 3845000.75, icon: TrendingUp, share: '40.8%' },
    { name: 'Real Estate & Properties', amount: 3500000.0, icon: Building2, share: '37.1%' },
    { name: 'Automobiles & Vehicles', amount: 350000.0, icon: Car, share: '3.7%' },
  ];

  const liabilities = [
    { name: 'Housing Mortgage Loan (8.5% APR)', amount: 1850000.0, icon: Landmark, share: '97.8%', emi: 22894.0 },
    { name: 'Credit Card Revolving (24% APR)', amount: 42300.0, icon: CreditCard, share: '2.2%', emi: 3500.0 },
  ];

  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Strategy simulation calculations
  const avalancheInterestSaved = 214500 + extraPayment * 4.2;
  const snowballInterestSaved = 192000 + extraPayment * 3.8;
  const currentInterestSaved = strategy === 'AVALANCHE' ? avalancheInterestSaved : snowballInterestSaved;
  const monthsReduced = Math.min(48, Math.round(18 + extraPayment / 800));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">Consolidated Net Worth Statement</h1>
            <Badge variant="positive" size="sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
              Audited Ledger Invariant
            </Badge>
          </div>
          <p className="text-xs text-[#758078] mt-1">
            Real-time balance sheet statement: Net Worth = Total Assets - Total Liabilities.
          </p>
        </div>
      </div>

      {/* KPI Net Worth Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E7ECE8] shadow-[0_1px_3px_0_rgba(23,35,29,0.04)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#758078]">
            Total Consolidated Net Worth
          </span>
          <p className="text-4xl font-extrabold text-[#17231D] mt-2 font-mono tracking-tight">
            ₹{netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#758078] mt-1">
            Assets: ₹{totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })} &bull; Liabilities: ₹{totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center p-3 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <p className="text-xs text-[#758078]">Solvency Ratio</p>
            <p className="text-xl font-bold text-[#16A36A] font-mono mt-0.5">
              {((totalAssets / (totalLiabilities || 1))).toFixed(2)}x
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <p className="text-xs text-[#758078]">Debt-to-Asset</p>
            <p className="text-xl font-bold text-[#17231D] font-mono mt-0.5">
              {((totalLiabilities / totalAssets) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Assets & Liabilities Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets Card */}
        <Card>
          <CardHeader
            title="Recognized Assets"
            subtitle={`Total: ₹${totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          />
          <div className="space-y-3">
            {assets.map((asset) => {
              const Icon = asset.icon;
              return (
                <div key={asset.name} className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-[#E7ECE8] text-[#16A36A]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#17231D]">{asset.name}</p>
                      <p className="text-[10px] text-[#758078]">{asset.share} of total assets</p>
                    </div>
                  </div>
                  <p className="text-xs font-mono font-bold text-[#17231D]">
                    ₹{asset.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Liabilities Card */}
        <Card>
          <CardHeader
            title="Recognized Liabilities"
            subtitle={`Total: ₹${totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          />
          <div className="space-y-3">
            {liabilities.map((liability) => {
              const Icon = liability.icon;
              return (
                <div key={liability.name} className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-[#E7ECE8] text-[#DC5B5B]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#17231D]">{liability.name}</p>
                      <p className="text-[10px] text-[#758078]">{liability.share} of total debt &bull; EMI: ₹{liability.emi.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <p className="text-xs font-mono font-bold text-[#DC5B5B]">
                    ₹{liability.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* PHASE 5: Debt Optimization & Repayment Strategy Section */}
      <Card>
        <CardHeader
          title="Debt Optimization & Payoff Strategy Engine"
          subtitle="Compare mathematical optimization strategies and prepayment acceleration schedules."
          action={
            <div className="flex items-center gap-2 bg-[#F7F9F7] p-1 rounded-xl border border-[#E7ECE8]">
              <button
                type="button"
                onClick={() => setStrategy('AVALANCHE')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  strategy === 'AVALANCHE'
                    ? 'bg-[#16A36A] text-white shadow-sm'
                    : 'text-[#758078] hover:text-[#17231D]'
                }`}
              >
                Avalanche (Highest APR First)
              </button>
              <button
                type="button"
                onClick={() => setStrategy('SNOWBALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  strategy === 'SNOWBALL'
                    ? 'bg-[#16A36A] text-white shadow-sm'
                    : 'text-[#758078] hover:text-[#17231D]'
                }`}
              >
                Snowball (Lowest Balance First)
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <span className="text-xs text-[#758078]">Extra Monthly Contribution</span>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="range"
                min="0"
                max="50000"
                step="2500"
                value={extraPayment}
                onChange={(e) => setExtraPayment(Number(e.target.value))}
                className="w-full accent-[#16A36A]"
              />
              <span className="text-xs font-mono font-bold text-[#17231D] whitespace-nowrap">
                ₹{extraPayment.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
            <span className="text-xs text-[#16A36A] font-medium">Estimated Interest Saved</span>
            <p className="text-xl font-bold font-mono text-[#16A36A] mt-1">
              ₹{Math.round(currentInterestSaved).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-[#758078] mt-0.5">
              {strategy === 'AVALANCHE' ? 'Optimal interest reduction' : 'Psychological wins priority'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <span className="text-xs text-[#758078]">Tenure Compression</span>
            <p className="text-xl font-bold font-mono text-[#17231D] mt-1">
              {monthsReduced} Months Earlier
            </p>
            <p className="text-[10px] text-[#758078] mt-0.5">Accelerates debt freedom date</p>
          </div>
        </div>

        {/* Amortization Schedule Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#758078]">
              Housing Mortgage — Amortization Installment Schedule
            </h4>
            <Badge variant="neutral" size="sm">
              Reducing Balance Engine
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9F7] text-[#758078] border-b border-[#E7ECE8]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">Due Date</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Expected EMI</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Principal</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Interest</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Ending Principal</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7ECE8]">
                {SAMPLE_SCHEDULE.map((s) => (
                  <tr key={s.installment} className="hover:bg-[#F7F9F7]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-[#758078]">{s.installment}</td>
                    <td className="py-2.5 px-3 text-[#17231D]">{s.dueDate}</td>
                    <td className="py-2.5 px-3 font-mono text-right font-medium text-[#17231D]">
                      ₹{s.emi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-[#16A36A]">
                      ₹{s.principal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-[#DC5B5B]">
                      ₹{s.interest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-medium text-[#17231D]">
                      ₹{s.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {s.status === 'PAID' && (
                        <Badge variant="positive" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Paid
                        </Badge>
                      )}
                      {s.status === 'DUE' && (
                        <Badge variant="warning" size="sm">
                          <Clock className="w-3 h-3 mr-1 inline" /> Due
                        </Badge>
                      )}
                      {s.status === 'UPCOMING' && (
                        <Badge variant="neutral" size="sm">
                          Upcoming
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
