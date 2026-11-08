'use client';

import React, { useState } from 'react';
import {
  Target,
  PlusCircle,
  TrendingUp,
  Calendar,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Flame,
  ArrowRight,
  DollarSign,
  Percent,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type GoalsTab = 'MILESTONES' | 'EMERGENCY_RUNWAY' | 'DEBT_PAYOFF' | 'PASSIVE_INCOME';

interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  currency: string;
}

interface DebtItem {
  id: string;
  name: string;
  principal: number;
  apr: number;
  minMonthlyPayment: number;
  lender: string;
}

const GOALS_DATA: GoalItem[] = [
  {
    id: 'g-1',
    name: 'Emergency Reserve Fund (6 Months Expenses)',
    targetAmount: 900000.0,
    currentAmount: 480000.0,
    targetDate: '2027-03-31',
    monthlyContribution: 35000.0,
    currency: 'INR',
  },
  {
    id: 'g-2',
    name: 'Commercial Real Estate Down Payment',
    targetAmount: 2500000.0,
    currentAmount: 1250000.0,
    targetDate: '2028-12-31',
    monthlyContribution: 50000.0,
    currency: 'INR',
  },
  {
    id: 'g-3',
    name: 'Sabbatical & Angel Venture Fund',
    targetAmount: 1500000.0,
    currentAmount: 450000.0,
    targetDate: '2029-06-30',
    monthlyContribution: 35000.0,
    currency: 'INR',
  },
  {
    id: 'g-4',
    name: 'Children Higher Education Trust',
    targetAmount: 5000000.0,
    currentAmount: 1850000.0,
    targetDate: '2034-08-31',
    monthlyContribution: 40000.0,
    currency: 'INR',
  },
];

const DEBTS_DATA: DebtItem[] = [
  {
    id: 'd-1',
    name: 'Corporate Infinite Card',
    principal: 48500.0,
    apr: 28.5,
    minMonthlyPayment: 4850.0,
    lender: 'HDFC Bank',
  },
  {
    id: 'd-2',
    name: 'Executive Electric Vehicle Loan',
    principal: 820000.0,
    apr: 8.8,
    minMonthlyPayment: 21500.0,
    lender: 'State Bank of India',
  },
  {
    id: 'd-3',
    name: 'Commercial Office Space Mortgage',
    principal: 4250000.0,
    apr: 8.4,
    minMonthlyPayment: 54000.0,
    lender: 'ICICI Home Finance',
  },
];

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<GoalsTab>('MILESTONES');
  const [goals] = useState<GoalItem[]>(GOALS_DATA);
  const [debts] = useState<DebtItem[]>(DEBTS_DATA);
  const [debtStrategy, setDebtStrategy] = useState<'AVALANCHE' | 'SNOWBALL'>('AVALANCHE');

  // Emergency runway metrics
  const monthlyBurn = 151550.0;
  const liquidCash = 480000.0;
  const runwayMonths = liquidCash / monthlyBurn;
  const targetRunwayMonths = 6.0;
  const targetEmergencyFund = monthlyBurn * targetRunwayMonths;

  // Debt metrics
  const totalDebt = debts.reduce((sum, d) => sum + d.principal, 0);
  const sortedDebts = [...debts].sort((a, b) =>
    debtStrategy === 'AVALANCHE' ? b.apr - a.apr : a.principal - b.principal
  );

  // Passive income metrics
  const monthlyDividendYield = 32000.0;
  const monthlyRentalYield = 45000.0;
  const totalPassiveMonthly = monthlyDividendYield + monthlyRentalYield;
  const freedomPercentage = (totalPassiveMonthly / monthlyBurn) * 100;

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">Financial Freedom & Wealth Strategy</h1>
            <Badge variant="positive" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Optimized</span>
            </Badge>
          </div>
          <p className="text-xs text-[#758078] mt-1">
            Emergency runway gauges, goal milestone trajectories, debt acceleration engines, and passive yield streams.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#F7F9F7] border border-[#E7ECE8] rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('MILESTONES')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'MILESTONES' ? 'bg-[#16A36A] text-white shadow-sm' : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            Target Milestones
          </button>
          <button
            onClick={() => setActiveTab('EMERGENCY_RUNWAY')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'EMERGENCY_RUNWAY' ? 'bg-[#16A36A] text-white shadow-sm' : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            Emergency Runway
          </button>
          <button
            onClick={() => setActiveTab('DEBT_PAYOFF')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'DEBT_PAYOFF' ? 'bg-[#16A36A] text-white shadow-sm' : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            Debt Payoff Engine
          </button>
          <button
            onClick={() => setActiveTab('PASSIVE_INCOME')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'PASSIVE_INCOME' ? 'bg-[#16A36A] text-white shadow-sm' : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            Passive Income Stream
          </button>
        </div>
      </div>

      {/* VIEW 1: MILESTONES */}
      {activeTab === 'MILESTONES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Total Milestone Goal
                </span>
                <Target className="w-4 h-4 text-[#16A36A]" />
              </div>
              <p className="text-2xl font-bold text-[#17231D] mt-2">
                ₹{totalTarget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-[#758078] mt-1">Sum of 4 active wealth milestones</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Accumulated Capital
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[#17231D] mt-2">
                ₹{totalSaved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">
                {overallProgress.toFixed(1)}% of total targets achieved
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Monthly Commitment
                </span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-300 mt-2">
                ₹{goals.reduce((sum, g) => sum + g.monthlyContribution, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
              </p>
              <p className="text-[11px] text-[#758078] mt-1">Required systematic savings velocity</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Active Goals & Milestone Progress"
              subtitle="Projected date attainment based on current monthly contribution velocity"
            />
            <div className="space-y-6">
              {goals.map((g) => {
                const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);

                return (
                  <div
                    key={g.id}
                    className="space-y-3 p-4 rounded-lg bg-[#F7F9F7] border border-[#E7ECE8]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-[#17231D]">{g.name}</h4>
                        <p className="text-xs text-[#758078] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" /> Target Date: {g.targetDate} &bull; Monthly: ₹{g.monthlyContribution.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={pct >= 75 ? 'positive' : 'brand'} size="sm">
                          {pct.toFixed(1)}% Completed
                        </Badge>
                      </div>
                    </div>

                    <div className="w-full bg-[#F0F4F1] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#16A36A] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-mono text-[#758078]">
                      <span>Accumulated: ₹{g.currentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <span>Target: ₹{g.targetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: EMERGENCY RUNWAY */}
      {activeTab === 'EMERGENCY_RUNWAY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Liquid Safety Reserve
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[#17231D] mt-2">
                ₹{liquidCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-[#758078] mt-1">High-yield liquid savings + overnight deposits</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Monthly Baseline Burn
                </span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-rose-400 mt-2">
                ₹{monthlyBurn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
              </p>
              <p className="text-[11px] text-[#758078] mt-1">Essential non-discretionary living costs</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Calculated Survival Runway
                </span>
                <Clock className="w-4 h-4 text-[#16A36A]" />
              </div>
              <p className="text-2xl font-bold text-[#087A50] mt-2">
                {runwayMonths.toFixed(1)} Months
              </p>
              <p className="text-[11px] text-amber-400 mt-1">
                Target: 6.0 Months (₹{(targetEmergencyFund - liquidCash).toLocaleString('en-IN')} gap)
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Runway Health Gauge & Stress-Test"
              subtitle="Simulation of unexpected income interruption without selling long-term equity or mutual funds"
            />
            <div className="p-4 bg-[#F7F9F7] rounded-xl border border-[#E7ECE8] space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#4A554E] font-semibold">Emergency Fund Fill Level</span>
                <span className="font-mono text-emerald-400 font-bold">{((liquidCash / targetEmergencyFund) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[#F0F4F1] rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-3 rounded-full"
                  style={{ width: `${Math.min((liquidCash / targetEmergencyFund) * 100, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-[#E7ECE8]">
                <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                  <span className="text-rose-400 font-bold block">&lt; 3 Months</span>
                  <span className="text-[10px] text-[#758078]">High Risk</span>
                </div>
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-400 font-bold block">3 – 6 Months</span>
                  <span className="text-[10px] text-[#758078]">Current Level ({runwayMonths.toFixed(1)}m)</span>
                </div>
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold block">6 – 12 Months</span>
                  <span className="text-[10px] text-[#758078]">Fortress Solvency</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 3: DEBT PAYOFF ENGINE */}
      {activeTab === 'DEBT_PAYOFF' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8]">
            <div>
              <h3 className="text-sm font-semibold text-[#17231D]">Payoff Strategy Optimizer</h3>
              <p className="text-xs text-[#758078]">Choose between mathematical interest savings or behavioral momentum</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDebtStrategy('AVALANCHE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  debtStrategy === 'AVALANCHE'
                    ? 'bg-[#16A36A] text-white'
                    : 'bg-[#F0F4F1] text-[#758078] hover:text-[#17231D]'
                }`}
              >
                Avalanche (Highest APR First)
              </button>
              <button
                onClick={() => setDebtStrategy('SNOWBALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  debtStrategy === 'SNOWBALL'
                    ? 'bg-[#16A36A] text-white'
                    : 'bg-[#F0F4F1] text-[#758078] hover:text-[#17231D]'
                }`}
              >
                Snowball (Lowest Balance First)
              </button>
            </div>
          </div>

          <Card>
            <div className="p-4 border-b border-[#E7ECE8] flex justify-between items-center">
              <div>
                <h2 className="text-base font-semibold text-[#17231D]">Active Debt Stack & Payoff Priority</h2>
                <p className="text-xs text-[#758078]">Total Outstanding Liabilities: ₹{totalDebt.toLocaleString('en-IN')}</p>
              </div>
              <Badge variant="positive">
                {debtStrategy === 'AVALANCHE' ? 'Saves ₹1,42,000 in Interest' : 'Fastest First Payoff'}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E7ECE8] text-[#758078] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Priority & Liability</th>
                    <th className="py-3 px-4">Lender</th>
                    <th className="py-3 px-4 text-right">Interest Rate (APR)</th>
                    <th className="py-3 px-4 text-right">Min Monthly Payment</th>
                    <th className="py-3 px-4 text-right">Outstanding Principal</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECE8]">
                  {sortedDebts.map((d, idx) => (
                    <tr key={d.id} className="hover:bg-[#F0F4F1] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#16A36A]/20 text-[#16A36A] font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#17231D]">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#758078]">{d.lender}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-400">
                        {d.apr}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#4A554E]">
                        ₹{d.minMonthlyPayment.toLocaleString('en-IN')}/mo
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#17231D]">
                        ₹{d.principal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          idx === 0
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-700 text-[#4A554E]'
                        }`}>
                          {idx === 0 ? 'Targeting with Extra Cash' : 'Min Payment Only'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 4: PASSIVE INCOME */}
      {activeTab === 'PASSIVE_INCOME' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Monthly Passive Yield
                </span>
                <DollarSign className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-2xl font-bold text-teal-300 mt-2">
                ₹{totalPassiveMonthly.toLocaleString('en-IN')}/mo
              </p>
              <p className="text-[11px] text-[#758078] mt-1">Dividends + Commercial Rental Cash Flow</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Financial Freedom Ratio
                </span>
                <Percent className="w-4 h-4 text-[#16A36A]" />
              </div>
              <p className="text-2xl font-bold text-[#087A50] mt-2">
                {freedomPercentage.toFixed(1)}%
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">Of baseline monthly expenses covered by assets</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
                  Annualized Passive Inflow
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[#17231D] mt-2">
                ₹{(totalPassiveMonthly * 12).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-[#758078] mt-1">Direct bank credit before reinvestment</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Passive Inflow Channels"
              subtitle="Unearned income streams generating cash flow without active labor input"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#17231D] text-sm">Equity & Mutual Fund Dividends</span>
                  <Badge variant="positive">₹32,000/mo</Badge>
                </div>
                <p className="text-xs text-[#758078]">
                  TCS, HDFC Bank, and debt liquid fund dividend payouts deposited directly into primary operating accounts.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#17231D] text-sm">Commercial Real Estate Lease</span>
                  <Badge variant="positive">₹45,000/mo</Badge>
                </div>
                <p className="text-xs text-[#758078]">
                  Corporate office lease rental yielding 7.2% annual net cap rate on invested commercial property equity.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
