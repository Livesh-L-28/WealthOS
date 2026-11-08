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
  const [mutualFunds] = useState<MutualFundScheme[]>(MUTUAL_FUNDS);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">Investments & Mutual Funds Manager</h1>
            <Badge variant="positive" className="gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Mark-to-Market</span>
            </Badge>
          </div>
          <p className="text-xs text-[#758078] mt-1">
            Real-time equity valuation, mutual fund NAVs, active SIP schedules, and strict FIFO tax-lot consumption.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-[#F7F9F7] border border-[#E7ECE8] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'ALL' ? 'bg-[#16A36A] text-white shadow-sm' : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            All Securities
          </button>
          <button
            onClick={() => setActiveTab('MUTUAL_FUNDS')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'MUTUAL_FUNDS' ? 'bg-[#16A36A] text-white shadow-sm' : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            Mutual Funds & SIPs ({mutualFunds.length})
          </button>
          <button
            onClick={() => setActiveTab('EQUITIES')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'EQUITIES' ? 'bg-[#16A36A] text-white shadow-sm' : 'text-[#758078] hover:text-[#17231D]'
            }`}
          >
            Direct Equities
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              {activeTab === 'MUTUAL_FUNDS' ? 'Mutual Fund AUM' : 'Total Portfolio AUM'}
            </span>
            <PieChart className="w-4 h-4 text-[#16A36A]" />
          </div>
          <p className="text-2xl font-bold text-[#17231D] mt-2">
            ₹{(activeTab === 'MUTUAL_FUNDS' ? totalMfValue : totalValue).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-[#758078] mt-1">
            Invested Capital: ₹{(activeTab === 'MUTUAL_FUNDS' ? totalMfCost : totalCost).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
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
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Active SIP Outflow
            </span>
            <Repeat className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-teal-300 mt-2">
            ₹{totalMonthlySip.toLocaleString('en-IN')}/mo
          </p>
          <p className="text-[11px] text-[#758078] mt-1">
            4 active automated systematic mandates
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Tax Lot Grounding
            </span>
            <ShieldCheck className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-[#17231D] mt-2">Strict FIFO</p>
          <p className="text-[11px] text-[#758078] mt-1">STCG vs LTCG tax optimization enabled</p>
        </Card>
      </div>

      {/* Conditional View: Mutual Funds Dedicated View */}
      {activeTab === 'MUTUAL_FUNDS' ? (
        <div className="space-y-6">
          {/* Active SIP Schedule Banner */}
          <div className="bg-[#F7F9F7] border border-[#E7ECE8] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#17231D]">Next Systematic Investment (SIP) Due</h3>
                <p className="text-xs text-[#758078]">
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
            <div className="p-4 border-b border-[#E7ECE8] flex justify-between items-center">
              <div>
                <h2 className="text-base font-semibold text-[#17231D]">Mutual Fund Schemes & Folios</h2>
                <p className="text-xs text-[#758078]">Direct growth schemes with automated daily NAV synchronization</p>
              </div>
              <Button size="sm" variant="primary" className="gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Folio</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E7ECE8] text-[#758078] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Scheme & Folio</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Units / Balance</th>
                    <th className="py-3 px-4 text-right">Avg NAV / Current NAV</th>
                    <th className="py-3 px-4 text-right">Invested Value</th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-right">Returns & XIRR</th>
                    <th className="py-3 px-4 text-center">Active SIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECE8]">
                  {mutualFunds.map((mf) => (
                    <tr key={mf.folioNumber} className="hover:bg-[#F0F4F1] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#17231D] text-sm">{mf.schemeName}</div>
                        <div className="text-[#758078] font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                          <span>{mf.amc}</span>
                          <span>•</span>
                          <span className="text-[#9BA39D]">{mf.folioNumber}</span>
                        </div>
                        {mf.lockInMaturityDate && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Lock-in until {mf.lockInMaturityDate}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#16A36A]/10 text-[#087A50] border border-[#16A36A]/20">
                          {mf.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#17231D]">
                        {mf.units.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="text-[#17231D] font-semibold">₹{mf.currentNav.toFixed(2)}</div>
                        <div className="text-[#9BA39D] text-[11px]">Avg: ₹{mf.avgNav.toFixed(2)}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#4A554E]">
                        ₹{mf.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#17231D]">
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
                            <span className="text-[10px] text-[#9BA39D] mt-0.5">Due Day {mf.sipDetails.debitDay}</span>
                          </div>
                        ) : (
                          <span className="text-[#9BA39D] font-mono text-xs">—</span>
                        )}
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
        <Card>
          <CardHeader
            title={activeTab === 'EQUITIES' ? 'Direct Equities Portfolio' : 'Consolidated Security Holdings'}
            subtitle="Real-time multi-asset positions with mark-to-market prices"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-[#F7F9F7] text-[#758078] border-b border-[#E7ECE8]">
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
              <tbody className="divide-y divide-[#E7ECE8]">
                {holdings
                  .filter((h) => (activeTab === 'EQUITIES' ? h.assetClass === 'EQUITY' : true))
                  .map((h) => (
                    <tr key={h.symbol} className="hover:bg-[#F0F4F1] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-[#17231D]">{h.symbol}</div>
                        <div className="text-xs text-[#758078]">{h.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" size="sm">
                          {h.assetClass}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#17231D]">
                        {h.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#4A554E]">
                        ₹{h.avgCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#17231D]">
                        ₹{h.currentPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-[#17231D]">
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
      )}
    </div>
  );
}
