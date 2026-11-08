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
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
    symbol: 'NIFTYBEES',
    name: 'Nippon India ETF Nifty 50 BeES',
    assetClass: 'MUTUAL_FUND',
    quantity: 2200,
    avgCost: 245.0,
    currentPrice: 274.0,
    currentValue: 602800.0,
    unrealizedPl: 63800.0,
    unrealizedPlPct: 11.84,
  },
];

export default function InvestmentsPage() {
  const [holdings] = useState<HoldingItem[]>(HOLDINGS);

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.avgCost, 0);
  const totalUnrealizedPl = totalValue - totalCost;
  const totalUnrealizedPlPct = totalCost > 0 ? (totalUnrealizedPl / totalCost) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Investment Portfolio & FIFO Lots</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time equity valuation, mutual fund NAVs, and strict FIFO tax-lot consumption.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>FIFO Lots Breakdown</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Rebalance Portfolio</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Portfolio Value
            </span>
            <PieChart className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Cost Basis: ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Unrealized Gain / Loss
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-5 h-5 inline" />
            ₹{totalUnrealizedPl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">
            +{totalUnrealizedPlPct.toFixed(2)}% Return on Invested Capital
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              FIFO Lot Accounting
            </span>
            <Sparkles className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">100% Grounded</p>
          <p className="text-[11px] text-slate-400 mt-1">Tax-compliant cost basis & realized P&L tracking</p>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader
          title="Security Holdings"
          subtitle="Real-time multi-asset positions with mark-to-market prices"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60">
              {holdings.map((h) => (
                <tr key={h.symbol} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-slate-100">{h.symbol}</div>
                    <div className="text-xs text-slate-400">{h.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral" size="sm">
                      {h.assetClass}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-200">
                    {h.quantity.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    ₹{h.avgCost.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-200">
                    ₹{h.currentPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-slate-100">
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
  );
}

