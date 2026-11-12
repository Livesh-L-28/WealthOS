'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  PieChart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Repeat,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  Briefcase,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { AddInvestmentModal, NewInvestmentData } from '@/components/modals/AddInvestmentModal';
import { PortfolioAllocationChart } from '@/components/dashboard/PortfolioAllocationChart';

type InvestmentView = 'ALL' | 'MUTUAL_FUNDS' | 'EQUITIES' | 'FIFO_LOTS';

interface HoldingItem {
  symbol: string;
  name: string;
  assetClass: 'EQUITY' | 'MUTUAL_FUND' | 'DEBT' | 'GOLD';
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
}

interface MutualFundScheme {
  folioNumber: string;
  schemeName: string;
  category: 'Flexi Cap' | 'Large & Mid Cap' | 'Small Cap' | 'Index / ETF' | 'Liquid / Cash' | 'ELSS Tax Saver';
  amc: string;
  plan: 'Direct - Growth' | 'Regular - Growth';
  units: number;
  avgNav: number;
  currentNav: number;
  investedValue: number;
  currentValue: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  xirrPct: number;
  sipDetails?: {
    active: boolean;
    monthlyAmount: number;
    debitDay: number;
    nextDebitDate: string;
    stepUpPct: number;
    account: string;
  };
  lockInMaturityDate?: string;
}

interface FifoLotItem {
  id: string;
  symbol: string;
  name: string;
  purchaseDate: string;
  originalQty: number;
  remainingQty: number;
  purchasePrice: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  status: 'OPEN' | 'PARTIALLY_DISPOSED' | 'CLOSED';
  taxTerm: 'LTCG (>365d)' | 'STCG (<=365d)';
}

const FIFO_LOTS: FifoLotItem[] = [
  {
    id: 'LOT-TCS-01',
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    purchaseDate: '2025-04-12',
    originalQty: 150,
    remainingQty: 150,
    purchasePrice: 3350.0,
    costBasis: 502500.0,
    currentPrice: 4120.0,
    currentValue: 618000.0,
    unrealizedPl: 115500.0,
    unrealizedPlPct: 22.98,
    status: 'OPEN',
    taxTerm: 'LTCG (>365d)',
  },
  {
    id: 'LOT-TCS-02',
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    purchaseDate: '2026-01-18',
    originalQty: 100,
    remainingQty: 100,
    purchasePrice: 3600.0,
    costBasis: 360000.0,
    currentPrice: 4120.0,
    currentValue: 412000.0,
    unrealizedPl: 52000.0,
    unrealizedPlPct: 14.44,
    status: 'OPEN',
    taxTerm: 'STCG (<=365d)',
  },
  {
    id: 'LOT-REL-01',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    purchaseDate: '2025-02-10',
    originalQty: 250,
    remainingQty: 250,
    purchasePrice: 2550.0,
    costBasis: 637500.0,
    currentPrice: 2950.0,
    currentValue: 737500.0,
    unrealizedPl: 100000.0,
    unrealizedPlPct: 15.69,
    status: 'OPEN',
    taxTerm: 'LTCG (>365d)',
  },
  {
    id: 'LOT-REL-02',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    purchaseDate: '2025-11-05',
    originalQty: 200,
    remainingQty: 150,
    purchasePrice: 2895.0,
    costBasis: 434250.0,
    currentPrice: 2950.0,
    currentValue: 442500.0,
    unrealizedPl: 8250.0,
    unrealizedPlPct: 1.90,
    status: 'PARTIALLY_DISPOSED',
    taxTerm: 'LTCG (>365d)',
  },
  {
    id: 'LOT-HDFC-01',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    purchaseDate: '2025-08-20',
    originalQty: 600,
    remainingQty: 600,
    purchasePrice: 1540.0,
    costBasis: 924000.0,
    currentPrice: 1720.0,
    currentValue: 1032000.0,
    unrealizedPl: 108000.0,
    unrealizedPlPct: 11.69,
    status: 'OPEN',
    taxTerm: 'LTCG (>365d)',
  },
];

const HOLDINGS: HoldingItem[] = [
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    assetClass: 'EQUITY',
    quantity: 250,
    avgCost: 3450.0,
    currentPrice: 4120.0,
    currentValue: 1030000.0,
    unrealizedPl: 167500.0,
    unrealizedPlPct: 19.42,
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    assetClass: 'EQUITY',
    quantity: 400,
    avgCost: 2680.0,
    currentPrice: 2950.0,
    currentValue: 1180000.0,
    unrealizedPl: 108000.0,
    unrealizedPlPct: 10.07,
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    assetClass: 'EQUITY',
    quantity: 600,
    avgCost: 1540.0,
    currentPrice: 1720.0,
    currentValue: 1032000.0,
    unrealizedPl: 108000.0,
    unrealizedPlPct: 11.69,
  },
  {
    symbol: 'PPFAS-FLEXI',
    name: 'Parag Parikh Flexi Cap Fund Direct-Growth',
    assetClass: 'MUTUAL_FUND',
    quantity: 12450.28,
    avgCost: 52.4,
    currentPrice: 74.85,
    currentValue: 931903.0,
    unrealizedPl: 279509.0,
    unrealizedPlPct: 42.84,
  },
  {
    symbol: 'MIRAE-LRGMID',
    name: 'Mirae Asset Large & Midcap Fund Direct-Growth',
    assetClass: 'MUTUAL_FUND',
    quantity: 6820.45,
    avgCost: 88.2,
    currentPrice: 124.6,
    currentValue: 849828.0,
    unrealizedPl: 248264.0,
    unrealizedPlPct: 41.27,
  },
  {
    symbol: 'HDFC-NIFTY50',
    name: 'HDFC Index Fund Nifty 50 Plan Direct-Growth',
    assetClass: 'MUTUAL_FUND',
    quantity: 2850.12,
    avgCost: 182.0,
    currentPrice: 215.4,
    currentValue: 613915.0,
    unrealizedPl: 95193.0,
    unrealizedPlPct: 18.35,
  },
];

const MUTUAL_FUNDS: MutualFundScheme[] = [
  {
    folioNumber: 'FOL-92841/01',
    schemeName: 'Parag Parikh Flexi Cap Fund',
    category: 'Flexi Cap',
    amc: 'PPFAS Mutual Fund',
    plan: 'Direct - Growth',
    units: 12450.28,
    avgNav: 52.4,
    currentNav: 74.85,
    investedValue: 652394.0,
    currentValue: 931903.0,
    unrealizedPl: 279509.0,
    unrealizedPlPct: 42.84,
    xirrPct: 21.4,
    sipDetails: {
      active: true,
      monthlyAmount: 25000.0,
      debitDay: 5,
      nextDebitDate: '5 Dec 2026',
      stepUpPct: 10,
      account: 'Primary Operating Savings',
    },
  },
  {
    folioNumber: 'FOL-38102/44',
    schemeName: 'Mirae Asset Large & Midcap Fund',
    category: 'Large & Mid Cap',
    amc: 'Mirae Asset Global Investments',
    plan: 'Direct - Growth',
    units: 6820.45,
    avgNav: 88.2,
    currentNav: 124.6,
    investedValue: 601563.0,
    currentValue: 849828.0,
    unrealizedPl: 248264.0,
    unrealizedPlPct: 41.27,
    xirrPct: 19.8,
    sipDetails: {
      active: true,
      monthlyAmount: 20000.0,
      debitDay: 10,
      nextDebitDate: '10 Nov 2026',
      stepUpPct: 10,
      account: 'Primary Operating Savings',
    },
  },
  {
    folioNumber: 'FOL-71400/19',
    schemeName: 'HDFC Index Fund Nifty 50 Plan',
    category: 'Index / ETF',
    amc: 'HDFC Asset Management Company',
    plan: 'Direct - Growth',
    units: 2850.12,
    avgNav: 182.0,
    currentNav: 215.4,
    investedValue: 518721.0,
    currentValue: 613915.0,
    unrealizedPl: 95193.0,
    unrealizedPlPct: 18.35,
    xirrPct: 14.6,
    sipDetails: {
      active: true,
      monthlyAmount: 15000.0,
      debitDay: 15,
      nextDebitDate: '15 Nov 2026',
      stepUpPct: 0,
      account: 'Primary Operating Savings',
    },
  },
  {
    folioNumber: 'FOL-55192/08',
    schemeName: 'Quant Small Cap Fund',
    category: 'Small Cap',
    amc: 'Quant Mutual Fund',
    plan: 'Direct - Growth',
    units: 1840.5,
    avgNav: 165.3,
    currentNav: 228.4,
    investedValue: 304234.0,
    currentValue: 420370.0,
    unrealizedPl: 116136.0,
    unrealizedPlPct: 38.17,
    xirrPct: 26.2,
    sipDetails: {
      active: true,
      monthlyAmount: 10000.0,
      debitDay: 20,
      nextDebitDate: '20 Nov 2026',
      stepUpPct: 15,
      account: 'Primary Operating Savings',
    },
  },
  {
    folioNumber: 'FOL-11928/62',
    schemeName: 'Mirae Asset ELSS Tax Saver Fund',
    category: 'ELSS Tax Saver',
    amc: 'Mirae Asset Global Investments',
    plan: 'Direct - Growth',
    units: 2100.0,
    avgNav: 71.4,
    currentNav: 98.2,
    investedValue: 150000.0,
    currentValue: 206220.0,
    unrealizedPl: 56220.0,
    unrealizedPlPct: 37.48,
    xirrPct: 18.2,
    lockInMaturityDate: '31 Mar 2027',
  },
];

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<InvestmentView>('ALL');
  const [holdings] = useState<HoldingItem[]>(HOLDINGS);
  const [mutualFunds, setMutualFunds] = useState<MutualFundScheme[]>(MUTUAL_FUNDS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleInvestmentAdded = (newInv: NewInvestmentData) => {
    const newScheme: MutualFundScheme = {
      folioNumber: newInv.folioNumber,
      schemeName: newInv.schemeName,
      category: (newInv.category as any) || 'Flexi Cap',
      amc: 'Direct Allotment AMC',
      plan: 'Direct - Growth',
      units: newInv.units,
      avgNav: newInv.nav,
      currentNav: newInv.nav * 1.02,
      investedValue: newInv.investedValue,
      currentValue: newInv.investedValue * 1.02,
      unrealizedPl: newInv.investedValue * 0.02,
      unrealizedPlPct: 2.0,
      xirrPct: 15.5,
    };
    setMutualFunds((prev) => [newScheme, ...prev]);
  };

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.avgCost, 0);
  const totalUnrealizedPl = totalValue - totalCost;
  const totalUnrealizedPlPct = totalCost > 0 ? (totalUnrealizedPl / totalCost) * 100 : 0;

  const totalMfValue = mutualFunds.reduce((sum, mf) => sum + mf.currentValue, 0);
  const totalMfCost = mutualFunds.reduce((sum, mf) => sum + mf.investedValue, 0);
  const totalMfPl = totalMfValue - totalMfCost;
  const totalMonthlySip = mutualFunds.reduce(
    (sum, mf) => sum + (mf.sipDetails?.active ? mf.sipDetails.monthlyAmount : 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Investments & Mutual Funds Manager</h1>
            <Badge variant="positive" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Mark-to-Market</span>
            </Badge>
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Real-time equity valuation, mutual fund NAVs, active SIP schedules, and strict FIFO tax-lot consumption.
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'ALL' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              All Securities
            </button>
            <button
              onClick={() => setActiveTab('MUTUAL_FUNDS')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'MUTUAL_FUNDS' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Mutual Funds & SIPs ({mutualFunds.length})
            </button>
            <button
              onClick={() => setActiveTab('EQUITIES')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'EQUITIES' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Direct Equities
            </button>
            <button
              onClick={() => setActiveTab('FIFO_LOTS')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'FIFO_LOTS' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              FIFO Lots & Tax Basis
            </button>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Folio</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
              {activeTab === 'MUTUAL_FUNDS' ? 'Mutual Fund AUM' : 'Total Portfolio AUM'}
            </span>
            <PieChart className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            ₹{(activeTab === 'MUTUAL_FUNDS' ? totalMfValue : totalValue).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-[#475569] mt-1">
            Invested Capital: ₹{(activeTab === 'MUTUAL_FUNDS' ? totalMfCost : totalCost).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
              Unrealized Gain / Return
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-5 h-5 inline" />
            ₹{(activeTab === 'MUTUAL_FUNDS' ? totalMfPl : totalUnrealizedPl).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">
            +{activeTab === 'MUTUAL_FUNDS' ? ((totalMfPl / totalMfCost) * 100).toFixed(2) : totalUnrealizedPlPct.toFixed(2)}% Overall Gain
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
              Active SIP Outflow
            </span>
            <Repeat className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-teal-300 mt-2">
            ₹{totalMonthlySip.toLocaleString('en-IN')}/mo
          </p>
          <p className="text-[11px] text-[#475569] mt-1">
            4 active automated systematic mandates
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
              Tax Lot Grounding
            </span>
            <ShieldCheck className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">Strict FIFO</p>
          <p className="text-[11px] text-[#475569] mt-1">STCG vs LTCG tax optimization enabled</p>
        </Card>
      </div>

      {/* Conditional View: Mutual Funds Dedicated View */}
      {activeTab === 'MUTUAL_FUNDS' ? (
        <div className="space-y-6">
          {/* Active SIP Schedule Banner */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Next Systematic Investment (SIP) Due</h3>
                <p className="text-xs text-[#475569]">
                  <span className="text-teal-400 font-semibold">10 Nov 2026</span> — ₹20,000 for Mirae Asset Large & Midcap Fund
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-xs font-mono">
                Auto-debit: Primary Savings
              </Badge>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Manage SIPs</span>
              </Button>
            </div>
          </div>

          {/* Mutual Funds Table */}
          <Card>
            <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">Mutual Fund Schemes & Folios</h2>
                <p className="text-xs text-[#475569]">Direct growth schemes with automated daily NAV synchronization</p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsAddModalOpen(true)}
                className="gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Folio</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Scheme & Folio</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Units / Balance</th>
                    <th className="py-3 px-4 text-right">Avg NAV / Current NAV</th>
                    <th className="py-3 px-4 text-right">
                      Invested Value
                      <InfoTooltip termKey="cost-basis" />
                    </th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-right">
                      Returns & XIRR
                      <InfoTooltip termKey="xirr" />
                    </th>
                    <th className="py-3 px-4 text-center">Active SIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {mutualFunds.map((mf) => (
                    <tr key={mf.folioNumber} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A] text-sm">{mf.schemeName}</div>
                        <div className="text-[#475569] font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                          <span>{mf.amc}</span>
                          <span>•</span>
                          <span className="text-[#64748B]">{mf.folioNumber}</span>
                        </div>
                        {mf.lockInMaturityDate && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Lock-in until {mf.lockInMaturityDate}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20">
                          {mf.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#0F172A]">
                        {mf.units.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="text-[#0F172A] font-semibold">₹{mf.currentNav.toFixed(2)}</div>
                        <div className="text-[#64748B] text-[11px]">Avg: ₹{mf.avgNav.toFixed(2)}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#4A554E]">
                        ₹{mf.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F172A]">
                        ₹{mf.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="text-emerald-400 font-semibold">
                          +₹{mf.unrealizedPl.toLocaleString('en-IN')} (+{mf.unrealizedPlPct.toFixed(1)}%)
                        </div>
                        <div className="text-[11px] text-teal-400 font-medium">
                          XIRR: {mf.xirrPct.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {mf.sipDetails?.active ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Repeat className="w-2.5 h-2.5" />
                              ₹{(mf.sipDetails.monthlyAmount / 1000).toFixed(0)}k/mo
                            </span>
                            <span className="text-[10px] text-[#64748B] mt-0.5">Due Day {mf.sipDetails.debitDay}</span>
                          </div>
                        ) : (
                          <span className="text-[#64748B] font-mono text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : activeTab === 'FIFO_LOTS' ? (
        <div className="space-y-6">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Strict FIFO Lot Accounting & Tax Basis Engine</h3>
                <p className="text-xs text-[#475569]">
                  Disposals strictly consume oldest open lots first. Gains held &gt;365 days qualify for preferential LTCG treatment.
                </p>
              </div>
            </div>
            <Badge variant="positive" className="font-mono text-xs">
              Sigma Balancing: Active
            </Badge>
          </div>

          <Card>
            <CardHeader
              title="Discrete Acquisition & Disposal Lots"
              subtitle="Audited lot tranches, remaining inventory, and capital gains classification"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Lot ID & Purchase Date</th>
                    <th className="py-3 px-4">Security</th>
                    <th className="py-3 px-4 text-right">Orig / Remaining Qty</th>
                    <th className="py-3 px-4 text-right">Purchase Price</th>
                    <th className="py-3 px-4 text-right">Cost Basis</th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-right">Unrealized P&L</th>
                    <th className="py-3 px-4 text-center">Holding Term</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {FIFO_LOTS.map((lot) => (
                    <tr key={lot.id} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-[#0F172A]">{lot.id}</div>
                        <div className="text-[11px] text-[#475569] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-[#64748B]" />
                          <span>{lot.purchaseDate}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-[#0F172A]">{lot.symbol}</div>
                        <div className="text-[11px] text-[#475569]">{lot.name}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="font-semibold text-[#0F172A]">{lot.remainingQty}</span>
                        <span className="text-[#64748B]"> / {lot.originalQty}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#4A554E]">
                        ₹{lot.purchasePrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-[#0F172A]">
                        ₹{lot.costBasis.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F172A]">
                        ₹{lot.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="text-emerald-500 font-semibold">
                          +₹{lot.unrealizedPl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-emerald-500 font-medium">
                          +{lot.unrealizedPlPct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            lot.taxTerm.startsWith('LTCG')
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {lot.taxTerm}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={lot.status === 'OPEN' ? 'positive' : lot.status === 'PARTIALLY_DISPOSED' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {lot.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* Holdings Table for All Securities / Direct Equities */
        <div className="space-y-6">
          {activeTab === 'ALL' && <PortfolioAllocationChart />}
          <Card>
            <CardHeader
              title={activeTab === 'EQUITIES' ? 'Direct Equities Portfolio' : 'Consolidated Security Holdings'}
              subtitle="Real-time multi-asset positions with mark-to-market prices"
            />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-[#F8FAFC] text-[#475569] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3">Symbol & Name</th>
                  <th className="px-4 py-3">Asset Class</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Avg Cost</th>
                  <th className="px-4 py-3 text-right">Market Price</th>
                  <th className="px-4 py-3 text-right">Current Value</th>
                  <th className="px-4 py-3 text-right">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {holdings
                  .filter((h) => (activeTab === 'EQUITIES' ? h.assetClass === 'EQUITY' : true))
                  .map((h) => (
                    <tr key={h.symbol} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-[#0F172A]">{h.symbol}</div>
                        <div className="text-xs text-[#475569]">{h.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" size="sm">
                          {h.assetClass}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#0F172A]">
                        {h.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#4A554E]">
                        ₹{h.avgCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#0F172A]">
                        ₹{h.currentPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-[#0F172A]">
                        ₹{h.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="text-emerald-400 font-medium">
                          +₹{h.unrealizedPl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-emerald-400">+{h.unrealizedPlPct.toFixed(2)}%</div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )}

      {/* Add Investment Modal */}
      <AddInvestmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onInvestmentAdded={handleInvestmentAdded}
      />
    </div>
  );
}
