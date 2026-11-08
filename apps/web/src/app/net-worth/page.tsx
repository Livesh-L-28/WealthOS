'use client';

import React from 'react';
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
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function NetWorthPage() {
  const assets = [
    { name: 'Depository Bank Accounts', amount: 1735200.5, icon: Landmark, share: '18.4%' },
    { name: 'Direct Equity & Demat Holdings', amount: 3845000.75, icon: TrendingUp, share: '40.8%' },
    { name: 'Real Estate & Properties', amount: 3500000.0, icon: Building2, share: '37.1%' },
    { name: 'Automobiles & Vehicles', amount: 350000.0, icon: Car, share: '3.7%' },
  ];

  const liabilities = [
    { name: 'Housing Mortgage Loan', amount: 1850000.0, icon: Landmark, share: '97.8%' },
    { name: 'Corporate Credit Card Revolving', amount: 42300.0, icon: CreditCard, share: '2.2%' },
  ];

  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Consolidated Net Worth Statement</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time balance sheet statement: Net Worth = Total Assets - Total Liabilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
            Audited Ledger Invariant
          </Badge>
        </div>
      </div>

      {/* KPI Net Worth Card */}
      <div className="p-6 rounded-lg bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/60 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Total Calculated Net Worth
          </span>
          <p className="text-4xl font-extrabold text-slate-100 mt-2 font-mono">
            ₹{netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Assets: ₹{totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Liabilities: ₹{totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center p-3 rounded bg-slate-900/80 border border-slate-800">
            <p className="text-xs text-slate-400">Solvency Ratio</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">
              {((totalAssets / (totalLiabilities || 1))).toFixed(2)}x
            </p>
          </div>
          <div className="text-center p-3 rounded bg-slate-900/80 border border-slate-800">
            <p className="text-xs text-slate-400">Debt-to-Asset</p>
            <p className="text-lg font-bold text-slate-200 font-mono">
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
          <div className="space-y-4">
            {assets.map((asset) => {
              const Icon = asset.icon;
              return (
                <div key={asset.name} className="flex items-center justify-between p-3 rounded bg-slate-900/40 border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-900/50">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{asset.name}</p>
                      <p className="text-xs text-slate-400">{asset.share} of total portfolio</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-semibold text-slate-100">
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
          <div className="space-y-4">
            {liabilities.map((liab) => {
              const Icon = liab.icon;
              return (
                <div key={liab.name} className="flex items-center justify-between p-3 rounded bg-slate-900/40 border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-rose-950/60 text-rose-400 border border-rose-900/50">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{liab.name}</p>
                      <p className="text-xs text-slate-400">{liab.share} of total obligations</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-semibold text-rose-400">
                    ₹{liab.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

