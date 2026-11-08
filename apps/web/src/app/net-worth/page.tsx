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
  Sparkles,
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
                      <p className="text-[10px] text-[#758078]">{liability.share} of total debt</p>
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
    </div>
  );
}
