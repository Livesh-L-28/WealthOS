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
  Calculator,
  Compass,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { CreateGoalModal, NewGoalData } from '@/components/modals/CreateGoalModal';
import { AddSavingsModal } from '@/components/modals/AddSavingsModal';

type GoalsTab = 'MILESTONES' | 'EMERGENCY_RUNWAY' | 'RETIREMENT' | 'DEBT_PAYOFF' | 'PASSIVE_INCOME';

interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  currency: string;
  category?: string;
  inflationRate?: number;
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
    id: 'g-bike',
    name: 'Bike',
    targetAmount: 2345678.0,
    currentAmount: 1876543.0,
    targetDate: '2030-12-31',
    monthlyContribution: 35000.0,
    currency: 'INR',
    category: 'VEHICLE',
    inflationRate: 0.06,
  },
  {
    id: 'g-fire',
    name: 'Financial Independence (FIRE)',
    targetAmount: 10000000.0,
    currentAmount: 4250000.0,
    targetDate: '2032-12-31',
    monthlyContribution: 75000.0,
    currency: 'INR',
    category: 'RETIREMENT',
    inflationRate: 0.06,
  },
  {
    id: 'g-ev',
    name: 'Luxury EV (BMW i4 M50)',
    targetAmount: 7500000.0,
    currentAmount: 1850000.0,
    targetDate: '2027-06-30',
    monthlyContribution: 50000.0,
    currency: 'INR',
    category: 'VEHICLE',
    inflationRate: 0.07,
  },
  {
    id: 'g-edu',
    name: 'Children Higher Education Trust',
    targetAmount: 5000000.0,
    currentAmount: 1850000.0,
    targetDate: '2034-08-31',
    monthlyContribution: 40000.0,
    currency: 'INR',
    category: 'EDUCATION',
    inflationRate: 0.10,
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
  const [goals, setGoals] = useState<GoalItem[]>(GOALS_DATA);
  const [debts] = useState<DebtItem[]>(DEBTS_DATA);
  const [debtStrategy, setDebtStrategy] = useState<'AVALANCHE' | 'SNOWBALL'>('AVALANCHE');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [savingsModalGoal, setSavingsModalGoal] = useState<GoalItem | null>(null);
  const [adjustForInflation, setAdjustForInflation] = useState(true);

  const handleDepositSuccess = (goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g))
    );
  };

  const handleGoalCreated = (newG: NewGoalData) => {
    const record: GoalItem = {
      id: `g-${Date.now()}`,
      name: newG.name,
      targetAmount: newG.targetAmount,
      currentAmount: newG.currentAmount,
      targetDate: newG.targetDate,
      monthlyContribution: newG.monthlyContribution,
      currency: 'INR',
      category: 'SAVINGS',
      inflationRate: 0.06,
    };
    setGoals((prev) => [record, ...prev]);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Financial Freedom & Wealth Strategy</h1>
            <Badge variant="positive" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Optimized</span>
            </Badge>
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Emergency runway gauges, goal milestone trajectories, retirement modeling, debt payoff engines, and passive yield streams.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('MILESTONES')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'MILESTONES' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Target Milestones
          </button>
          <button
            onClick={() => setActiveTab('EMERGENCY_RUNWAY')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'EMERGENCY_RUNWAY' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Emergency Runway
          </button>
          <button
            onClick={() => setActiveTab('RETIREMENT')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'RETIREMENT' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Retirement Planning
          </button>
          <button
            onClick={() => setActiveTab('DEBT_PAYOFF')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'DEBT_PAYOFF' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Debt Payoff Engine
          </button>
          <button
            onClick={() => setActiveTab('PASSIVE_INCOME')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'PASSIVE_INCOME' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Passive Income Stream
          </button>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Add Goal</span>
        </Button>
      </div>

      {/* VIEW 1: MILESTONES */}
      {activeTab === 'MILESTONES' && (
        <div className="space-y-6">
          {/* Inflation Toggle Control */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Inflation-Compounded Wealth Projections</h3>
                <p className="text-xs text-[#475569]">
                  Accounts for sector-specific price escalation (Education 10%, Housing 7%, General 6%) to calculate real purchasing power targets.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#475569]">Adjust for Inflation</span>
              <button
                type="button"
                onClick={() => setAdjustForInflation(!adjustForInflation)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  adjustForInflation ? 'bg-[#10B981]' : 'bg-[#CBD5E1]'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    adjustForInflation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Total Milestone Goal {adjustForInflation && '(Inflation-Adjusted)'}
                </span>
                <Target className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-2xl font-bold text-[#0F172A] mt-2">
                ₹{goals.reduce((sum, g) => {
                  const years = Math.max(0.5, (new Date(g.targetDate).getTime() - new Date().getTime()) / (365.25 * 24 * 3600 * 1000));
                  const adj = adjustForInflation ? g.targetAmount * Math.pow(1 + (g.inflationRate || 0.06), years) : g.targetAmount;
                  return sum + adj;
                }, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[11px] text-[#475569] mt-1">
                {adjustForInflation ? 'Real purchasing power required at maturity' : 'Nominal baseline target sum'}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Accumulated Capital
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[#0F172A] mt-2">
                ₹{totalSaved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">
                {overallProgress.toFixed(1)}% of nominal targets accumulated
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Monthly Commitment
                </span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-500 mt-2">
                ₹{goals.reduce((sum, g) => sum + g.monthlyContribution, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
              </p>
              <p className="text-[11px] text-[#475569] mt-1">Systematic monthly investment velocity</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Active Goals & Feasibility Assessment"
              subtitle="Deterministic feasibility classification under inflation compounding and expected return modeling"
            />
            <div className="space-y-6 mt-4">
              {goals.map((g) => {
                const years = Math.max(0.5, (new Date(g.targetDate).getTime() - new Date().getTime()) / (365.25 * 24 * 3600 * 1000));
                const infRate = g.inflationRate || 0.06;
                const targetDisplay = adjustForInflation ? g.targetAmount * Math.pow(1 + infRate, years) : g.targetAmount;
                const pct = Math.min((g.currentAmount / targetDisplay) * 100, 100);

                // Projections
                const rMonthly = 0.10 / 12;
                const nMonths = years * 12;
                const compoundM = Math.pow(1 + rMonthly, nMonths);
                const projWealth = g.currentAmount * compoundM + g.monthlyContribution * ((compoundM - 1) / rMonthly);
                const ratio = projWealth / targetDisplay;

                let feasibility: 'ON_TRACK' | 'NEEDS_ADJUSTMENT' | 'AT_RISK' = 'ON_TRACK';
                let feasBadgeVariant: 'positive' | 'warning' | 'negative' = 'positive';
                let feasLabel = 'ON TRACK';

                if (ratio >= 0.95) {
                  feasibility = 'ON_TRACK';
                  feasBadgeVariant = 'positive';
                  feasLabel = 'ON TRACK';
                } else if (ratio >= 0.75) {
                  feasibility = 'NEEDS_ADJUSTMENT';
                  feasBadgeVariant = 'warning';
                  feasLabel = 'NEEDS ADJUSTMENT';
                } else {
                  feasibility = 'AT_RISK';
                  feasBadgeVariant = 'negative';
                  feasLabel = 'AT RISK';
                }

                // Required monthly savings
                const remNeeded = Math.max(0, targetDisplay - g.currentAmount * compoundM);
                const reqPmt = remNeeded > 0 ? remNeeded / ((compoundM - 1) / rMonthly) : 0;

                return (
                  <div
                    key={g.id}
                    className="space-y-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#0F172A]">{g.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#475569] border border-[#E2E8F0] font-medium">
                            {g.category || 'SAVINGS'}
                          </span>
                        </div>
                        <p className="text-xs text-[#475569] flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5" /> Target Date: {g.targetDate} &bull; Monthly: ₹{g.monthlyContribution.toLocaleString('en-IN')}/mo
                          {adjustForInflation && ` • ${years.toFixed(1)}y horizon @ ${(infRate * 100).toFixed(0)}% inflation`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSavingsModalGoal(g)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#E8F5EE] hover:bg-[#D4EEDB] text-[#059669] text-xs font-bold transition shadow-xs active:scale-95"
                          title="Direct-post savings to goal"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Add Savings</span>
                        </button>
                        <Badge variant={feasBadgeVariant} size="sm">
                          {feasLabel}
                        </Badge>
                        <Badge variant="brand" size="sm">
                          {pct.toFixed(1)}% Accumulated
                        </Badge>
                      </div>
                    </div>

                    <div className="w-full bg-[#E2E8F0] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#10B981] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between text-xs text-[#475569] gap-1">
                      <span>Accumulated: <strong className="text-[#0F172A]">₹{g.currentAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
                      <span>
                        Target: <strong className="text-[#0F172A]">₹{targetDisplay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                        {adjustForInflation && ` (Nominal: ₹${g.targetAmount.toLocaleString('en-IN')})`}
                      </span>
                      <span>
                        Required Savings: <strong className={reqPmt > g.monthlyContribution ? 'text-amber-600' : 'text-[#10B981]'}>₹{reqPmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo</strong>
                      </span>
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
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Liquid Safety Reserve
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[#0F172A] mt-2">
                ₹{liquidCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-[#475569] mt-1">High-yield liquid savings + overnight deposits</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Monthly Baseline Burn
                </span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-rose-400 mt-2">
                ₹{monthlyBurn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
              </p>
              <p className="text-[11px] text-[#475569] mt-1">Essential living costs + mandatory loan EMIs</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Calculated Survival Runway
                </span>
                <Clock className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-2xl font-bold text-[#059669] mt-2">
                {runwayMonths.toFixed(1)} Months
              </p>
              <p className="text-[11px] text-amber-500 mt-1">Target benchmark: 6.0 months runway</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Emergency Fund Defense Gauge"
              subtitle="Deterministic protection buffer shielding investments against forced liquidation during cash shocks"
            />
            <div className="space-y-4 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#475569]">Current Liquidity: ₹{liquidCash.toLocaleString('en-IN')}</span>
                <span className="text-[#0F172A] font-bold">Goal (6 Months): ₹{targetEmergencyFund.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#10B981] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((liquidCash / targetEmergencyFund) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-[#475569]">
                Funding gap to 6-month buffer: <strong>₹{(targetEmergencyFund - liquidCash).toLocaleString('en-IN')}</strong>. Priority allocation will protect compounding portfolios.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 3: RETIREMENT PLANNING */}
      {activeTab === 'RETIREMENT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Target Corpus</span>
                <Compass className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-2xl font-bold text-[#0F172A] mt-2">₹3.58 Cr</p>
              <p className="text-[11px] text-[#475569] mt-1">Actuarial Annuity Due (85 yrs)</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Projected Corpus</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">₹3.12 Cr</p>
              <p className="text-[11px] text-emerald-600 mt-1">87.1% Retirement Readiness</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Day 1 Monthly Expense</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-2">₹3.45 L/mo</p>
              <p className="text-[11px] text-[#475569] mt-1">₹60k escalated @ 6% over 30 yrs</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Required Contribution</span>
                <Sparkles className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-2xl font-bold text-[#059669] mt-2">₹28,450/mo</p>
              <p className="text-[11px] text-[#475569] mt-1">Current velocity: ₹20,000/mo</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Actuarial Drawdown & Corpus Feasibility"
              subtitle="Compounded growth over 30-year accumulation and 25-year post-retirement drawdown"
            />
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4 mt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[#475569]">Current Age</span>
                  <p className="text-sm font-bold text-[#0F172A]">30 Years</p>
                </div>
                <div>
                  <span className="text-[#475569]">Retirement Age</span>
                  <p className="text-sm font-bold text-[#0F172A]">60 Years</p>
                </div>
                <div>
                  <span className="text-[#475569]">Pre-Retirement Return</span>
                  <p className="text-sm font-bold text-[#0F172A]">10.0% p.a.</p>
                </div>
                <div>
                  <span className="text-[#475569]">Post-Retirement Return</span>
                  <p className="text-sm font-bold text-[#0F172A]">7.0% p.a. (Real: 0.94%)</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">NEEDS ADJUSTMENT</Badge>
                  <span className="text-xs text-[#4A554E]">
                    Increasing monthly contributions by <strong>₹8,450/mo</strong> bridges the ₹46.4 Lakhs funding gap to 100% independence.
                  </span>
                </div>
                <Button variant="primary" size="sm">
                  Run Detailed What-If Simulator
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 4: DEBT PAYOFF */}
      {activeTab === 'DEBT_PAYOFF' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Total Debt Obligation
                </span>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-rose-400 mt-2">
                ₹{totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-[#475569] mt-1">Across {debts.length} outstanding credit facilities</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Total Monthly EMI
                </span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-500 mt-2">
                ₹{debts.reduce((sum, d) => sum + d.minMonthlyPayment, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
              </p>
              <p className="text-[11px] text-[#475569] mt-1">Mandatory monthly debt-service burden</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Payoff Acceleration Strategy
                </span>
                <ArrowRight className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setDebtStrategy('AVALANCHE')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    debtStrategy === 'AVALANCHE' ? 'bg-[#10B981] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                  }`}
                >
                  Avalanche (Highest APR)
                </button>
                <button
                  onClick={() => setDebtStrategy('SNOWBALL')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    debtStrategy === 'SNOWBALL' ? 'bg-[#10B981] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                  }`}
                >
                  Snowball (Lowest Balance)
                </button>
              </div>
              <p className="text-[11px] text-emerald-400 mt-1">
                {debtStrategy === 'AVALANCHE' ? 'Saves ₹1,42,800 in total interest' : 'Maximizes psychological momentum'}
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Target Payoff Hierarchy"
              subtitle={`Sorted by ${debtStrategy === 'AVALANCHE' ? 'highest APR interest saving priority' : 'smallest outstanding balance'}`}
            />
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#475569]">
                    <th className="py-2 px-4">Priority / Liability</th>
                    <th className="py-2 px-4">Lender</th>
                    <th className="py-2 px-4 text-right">APR</th>
                    <th className="py-2 px-4 text-right">Monthly EMI</th>
                    <th className="py-2 px-4 text-right">Remaining Principal</th>
                    <th className="py-2 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {sortedDebts.map((d, idx) => (
                    <tr key={d.id} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#0F172A]">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#475569]">{d.lender}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-500">
                        {d.apr}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#4A554E]">
                        ₹{d.minMonthlyPayment.toLocaleString('en-IN')}/mo
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                        ₹{d.principal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          idx === 0
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : 'bg-gray-100 text-[#4A554E]'
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

      {/* VIEW 5: PASSIVE INCOME */}
      {activeTab === 'PASSIVE_INCOME' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Monthly Passive Yield
                </span>
                <DollarSign className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-2xl font-bold text-teal-600 mt-2">
                ₹{totalPassiveMonthly.toLocaleString('en-IN')}/mo
              </p>
              <p className="text-[11px] text-[#475569] mt-1">Dividends + Commercial Rental Cash Flow</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Financial Freedom Ratio
                </span>
                <Percent className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-2xl font-bold text-[#059669] mt-2">
                {freedomPercentage.toFixed(1)}%
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">Of baseline monthly expenses covered by assets</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Annualized Passive Inflow
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[#0F172A] mt-2">
                ₹{(totalPassiveMonthly * 12).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-[#475569] mt-1">Direct bank credit before reinvestment</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Passive Inflow Channels"
              subtitle="Unearned income streams generating cash flow without active labor input"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#0F172A] text-sm">Equity & Mutual Fund Dividends</span>
                  <Badge variant="positive">₹32,000/mo</Badge>
                </div>
                <p className="text-xs text-[#475569]">
                  TCS, HDFC Bank, and debt liquid fund dividend payouts deposited directly into primary operating accounts.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#0F172A] text-sm">Commercial Real Estate Lease</span>
                  <Badge variant="positive">₹45,000/mo</Badge>
                </div>
                <p className="text-xs text-[#475569]">
                  Corporate office lease rental yielding 7.2% annual net cap rate on invested commercial property equity.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create Goal Modal */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGoalCreated={handleGoalCreated}
      />

      {/* Add Savings Modal */}
      {savingsModalGoal && (
        <AddSavingsModal
          isOpen={!!savingsModalGoal}
          onClose={() => setSavingsModalGoal(null)}
          goalId={savingsModalGoal.id}
          goalTitle={savingsModalGoal.name}
          targetAmount={savingsModalGoal.targetAmount}
          currentAmount={savingsModalGoal.currentAmount}
          onDepositSuccess={handleDepositSuccess}
        />
      )}
    </div>
  );
}
