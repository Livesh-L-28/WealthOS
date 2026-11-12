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
import {
  ChartContainer,
  FinancialBarChart,
  FinancialHorizontalBarChart,
  FinancialTableFallback,
  BarSeriesGroup,
  HorizontalBarItem,
} from '@/components/charts';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

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

  // Simulator State (Roadmap Items 45-54: Major Purchase Simulator)
  const [simCost, setSimCost] = useState<number>(500000);
  const [simDownPayment, setSimDownPayment] = useState<number>(150000);
  const [simItemName, setSimItemName] = useState<string>('Premium Electric Vehicle');

  // Dynamic simulation calculations
  const simLoan = Math.max(0, simCost - simDownPayment);
  const simRate = 0.088 / 12;
  const simN = 36;
  const simEmi = simLoan > 0 ? (simLoan * simRate * Math.pow(1 + simRate, simN)) / (Math.pow(1 + simRate, simN) - 1) : 0;
  const simBaseLiquid = 1327650;
  const simRemainingLiquid = Math.max(0, simBaseLiquid - simDownPayment);
  const simMonthlyOutflow = 151550;
  const simRunwayMonths = (simRemainingLiquid / simMonthlyOutflow).toFixed(1);

  const assets = [
    { name: 'Liquid Depository & Savings', amount: 1327650.0, icon: Landmark, share: '14.1%' },
    { name: 'Direct Equity & Demat Portfolio', amount: 4522551.25, icon: TrendingUp, share: '47.9%' },
    { name: 'Fixed Term Deposits & SGB Gold', amount: 1862500.0, icon: Building2, share: '19.7%' },
    { name: 'Real Estate Primary Residence Equity', amount: 1717500.0, icon: Car, share: '18.3%' },
  ];

  const liabilities = [
    { name: 'Housing Mortgage Loan (HDFC)', amount: 1650000.0, icon: Landmark, share: '87.2%', emi: 22894.0 },
    { name: 'Axis Bank Magnus Revolving Card', amount: 242300.0, icon: CreditCard, share: '12.8%', emi: 12500.0 },
  ];

  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Strategy simulation calculations
  const avalancheInterestSaved = 214500 + extraPayment * 4.2;
  const snowballInterestSaved = 192000 + extraPayment * 3.8;
  const currentInterestSaved = strategy === 'AVALANCHE' ? avalancheInterestSaved : snowballInterestSaved;
  const monthsReduced = Math.min(48, Math.round(18 + extraPayment / 800));

  const amortizationGroups: BarSeriesGroup[] = SAMPLE_SCHEDULE.map((s) => ({
    label: `#${s.installment}`,
    sublabel: `Installment #${s.installment} (${s.dueDate})`,
    values: [
      {
        key: 'principal',
        label: 'Principal Amortized',
        value: s.principal,
        color: '#10B981',
      },
      {
        key: 'interest',
        label: 'Interest Cost',
        value: s.interest,
        color: '#EF4444',
      },
    ],
  }));

  const amortizationTableColumns = [
    { key: 'installment', label: '#' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'emi', label: 'Expected EMI (₹)', isCurrency: true, align: 'right' as const },
    { key: 'principal', label: 'Principal (₹)', isCurrency: true, align: 'right' as const },
    { key: 'interest', label: 'Interest (₹)', isCurrency: true, align: 'right' as const },
    { key: 'remaining', label: 'Ending Principal (₹)', isCurrency: true, align: 'right' as const },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Consolidated Net Worth Statement</h1>
            <Badge variant="positive" size="sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
              Audited Ledger Invariant
            </Badge>
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Real-time balance sheet statement: Net Worth = Total Assets - Total Liabilities.
          </p>
        </div>
      </div>

      {/* KPI Net Worth Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(23,35,29,0.04)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
            Total Consolidated Net Worth
          </span>
          <p className="text-4xl font-extrabold text-[#0F172A] mt-2 font-mono tracking-tight">
            ₹{netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#475569] mt-1">
            Assets: ₹{totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })} &bull; Liabilities: ₹{totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <p className="text-xs text-[#475569]">Solvency Ratio</p>
            <p className="text-xl font-bold text-[#10B981] font-mono mt-0.5">
              {((totalAssets / (totalLiabilities || 1))).toFixed(2)}x
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <p className="text-xs text-[#475569]">Debt-to-Asset</p>
            <p className="text-xl font-bold text-[#0F172A] font-mono mt-0.5">
              {((totalLiabilities / totalAssets) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* ================= ROADMAP ITEM 1-10: SINGLE FINANCIAL OVERVIEW — WHY DID WEALTH CHANGE? ================= */}
      <div className="p-6 rounded-2xl bg-white border border-[#10B981]/30 shadow-[0_1px_3px_0_rgba(23,35,29,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] text-[#059669] flex items-center justify-center font-bold text-lg">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">Why Did Wealth Change?</h2>
                <Badge variant="positive" size="sm">Double-Entry Attribution</Badge>
              </div>
              <p className="text-xs text-[#475569]">
                Audited monthly reconciliation: 10 Oct 2026 to 08 Nov 2026 across 6 connected institutions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono font-bold text-[#059669] bg-[#DCFCE7] px-2.5 py-1 rounded-lg">
              +₹3,42,851.25 (+4.76%)
            </span>
          </div>
        </div>

        {/* Waterfall Table / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] font-bold text-[#475569] uppercase block">Starting Net Worth</span>
            <span className="text-xs text-[#475569] block mt-0.5">10 Oct 2026 Balance</span>
            <span className="text-base font-bold font-mono text-[#0F172A] mt-2 block">₹71,95,050.00</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
            <span className="text-[10px] font-bold text-[#15803D] uppercase block">+ Inflows & Salary</span>
            <span className="text-xs text-[#475569] block mt-0.5">Infosys & TCS Dividend</span>
            <span className="text-base font-bold font-mono text-[#15803D] mt-2 block">+₹2,12,000.00</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#DC2626] uppercase block">− Living Outflows</span>
            <span className="text-xs text-[#475569] block mt-0.5">Rent, Dues & Living</span>
            <span className="text-base font-bold font-mono text-[#DC2626] mt-2 block">−₹1,51,550.00</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
            <span className="text-[10px] font-bold text-[#15803D] uppercase block">+ Market Appreciation</span>
            <span className="text-xs text-[#475569] block mt-0.5">PPFAS & Direct Equity</span>
            <span className="text-base font-bold font-mono text-[#15803D] mt-2 block">+₹3,24,401.25</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
            <span className="text-[10px] font-bold text-[#D97706] uppercase block">− Debt Principal Paid</span>
            <span className="text-xs text-[#475569] block mt-0.5">Home Loan Amortization</span>
            <span className="text-base font-bold font-mono text-[#D97706] mt-2 block">−₹42,000.00</span>
          </div>
        </div>

        {/* Closing Certification Banner */}
        <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#475569]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              Internal transfers between checking and savings (₹2,50,000) are zero-sum and excluded to prevent duplicate wealth inflation.
            </span>
          </div>
          <span className="font-mono font-bold text-[#0F172A] shrink-0">
            Closing: ₹75,37,901.25
          </span>
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
                <div key={asset.name} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#10B981]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A]">{asset.name}</p>
                      <p className="text-[10px] text-[#475569]">{asset.share} of total assets</p>
                    </div>
                  </div>
                  <p className="text-xs font-mono font-bold text-[#0F172A]">
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
                <div key={liability.name} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#EF4444]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A]">{liability.name}</p>
                      <p className="text-[10px] text-[#475569]">{liability.share} of total debt &bull; EMI: ₹{liability.emi.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <p className="text-xs font-mono font-bold text-[#EF4444]">
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
            <div className="flex items-center gap-2 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setStrategy('AVALANCHE')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  strategy === 'AVALANCHE'
                    ? 'bg-[#10B981] text-white shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Avalanche (Highest APR First)
              </button>
              <button
                type="button"
                onClick={() => setStrategy('SNOWBALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  strategy === 'SNOWBALL'
                    ? 'bg-[#10B981] text-white shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Snowball (Lowest Balance First)
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-xs text-[#475569]">Extra Monthly Contribution</span>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="range"
                min="0"
                max="50000"
                step="2500"
                value={extraPayment}
                onChange={(e) => setExtraPayment(Number(e.target.value))}
                className="w-full accent-[#10B981]"
              />
              <span className="text-xs font-mono font-bold text-[#0F172A] whitespace-nowrap">
                ₹{extraPayment.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
            <span className="text-xs text-[#10B981] font-medium">Estimated Interest Saved</span>
            <p className="text-xl font-bold font-mono text-[#10B981] mt-1">
              ₹{Math.round(currentInterestSaved).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-[#475569] mt-0.5">
              {strategy === 'AVALANCHE' ? 'Optimal interest reduction' : 'Psychological wins priority'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-xs text-[#475569]">Tenure Compression</span>
            <p className="text-xl font-bold font-mono text-[#0F172A] mt-1">
              {monthsReduced} Months Earlier
            </p>
            <p className="text-[10px] text-[#475569] mt-0.5">Accelerates debt freedom date</p>
          </div>
        </div>

        {/* Amortization Schedule Chart & Table Fallback */}
        <ChartContainer
          title="Housing Mortgage — Principal vs Interest Amortization"
          subtitle="Reducing balance schedule showing increasing principal recovery and diminishing interest burden"
          freshnessBadge={{
            label: 'Reducing Balance Engine',
            variant: 'positive',
            icon: <ShieldCheck className="w-3 h-3" />,
          }}
          summaryNarrative="Monthly EMI of ₹22,894.00 systematically shifts from interest expense (₹9,167.00) towards accelerated principal repayment (₹14,237.00)."
          tableView={
            <FinancialTableFallback
              title="Amortization Installment Schedule"
              columns={amortizationTableColumns}
              data={SAMPLE_SCHEDULE}
              filename="wealthos_mortgage_amortization.csv"
            />
          }
        >
          <FinancialBarChart
            groups={amortizationGroups}
            accessibleDescription="Principal vs Interest Amortization Installment Bars"
          />
        </ChartContainer>
      </Card>

      {/* ================= ROADMAP ITEMS 45-54: MAJOR PURCHASE SIMULATOR ================= */}
      <Card>
        <CardHeader
          title="Major Purchase & Capital Expenditure Simulator"
          subtitle="Test affordability of high-value purchases (e.g. ₹5 Lakh vehicle) against reserves, runway and FIRE goals"
        />
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#475569] uppercase block mb-1.5">Purchase Name</label>
              <input
                type="text"
                value={simItemName}
                onChange={(e) => setSimItemName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] uppercase block mb-1.5">Total Acquisition Cost (₹)</label>
              <input
                type="number"
                value={simCost}
                onChange={(e) => setSimCost(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] uppercase block mb-1.5">Down Payment Outflow (₹)</label>
              <input
                type="number"
                value={simDownPayment}
                onChange={(e) => setSimDownPayment(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          </div>

          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#475569]">Emergency Cash Runway Post-Purchase</span>
              <p className={`text-xl font-bold font-mono mt-1 ${Number(simRunwayMonths) >= 6.0 ? 'text-[#10B981]' : Number(simRunwayMonths) >= 3.0 ? 'text-[#D97706]' : 'text-[#EF4444]'}`}>
                {simRunwayMonths} Months
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">
                Safe threshold: &gt; 6.0 Months (Remaining cash: ₹{simRemainingLiquid.toLocaleString('en-IN')})
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#475569]">Estimated Monthly Loan EMI</span>
              <p className="text-xl font-bold font-mono text-[#0F172A] mt-1">
                ₹{Math.round(simEmi).toLocaleString('en-IN')} / mo
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">
                Financing ₹{simLoan.toLocaleString('en-IN')} @ 8.8% p.a. over 36 months
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#475569]">FIRE Goal Timeline Impact</span>
              <p className="text-xl font-bold font-mono text-[#D97706] mt-1">
                +2.1 Months Delay
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">
                Absorbed within current monthly discretionary surplus
              </p>
            </div>
          </div>

          {/* Verdict Recommendation */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            simDownPayment > simBaseLiquid 
              ? 'bg-[#FEF2F2] border-[#FECACA]' 
              : Number(simRunwayMonths) < 3.0 
              ? 'bg-[#FFFBEB] border-[#FDE68A]' 
              : 'bg-[#F0FDF4] border-[#86EFAC]'
          }`}>
            <Sparkles className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-[#0F172A] block">
                {simDownPayment > simBaseLiquid
                  ? 'CRITICAL DEFICIT: INSUFFICIENT LIQUID RESERVES'
                  : Number(simRunwayMonths) < 3.0
                  ? 'ELEVATED RISK: EMERGENCY BUFFER DEPLETED'
                  : `VERDICT: AFFORDABLE WITH ₹${(simDownPayment / 100000).toFixed(2)}L DOWN PAYMENT`}
              </span>
              <p className="text-xs text-[#334155] mt-1 leading-relaxed">
                {simDownPayment > simBaseLiquid
                  ? `Required down payment of ₹${simDownPayment.toLocaleString('en-IN')} exceeds current liquid cash (₹13,27,650.00).`
                  : `You can comfortably purchase this ₹${(simCost / 100000).toFixed(2)} Lakh asset without impairing your long-term FIRE goals. Liquid emergency reserves remain at ₹${(simRemainingLiquid / 100000).toFixed(2)}L (${simRunwayMonths} months runway).`}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
