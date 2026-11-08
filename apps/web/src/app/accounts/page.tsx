'use client';

import React, { useState } from 'react';
import {
  Landmark,
  PlusCircle,
  CreditCard,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Building,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface AccountItem {
  id: string;
  name: string;
  institution: string;
  type: 'SAVINGS' | 'CURRENT' | 'DEMAT' | 'CREDIT_CARD' | 'LOAN';
  mask: string;
  currency: string;
  balance: number;
  status: 'ACTIVE' | 'SYNCED' | 'DISCONNECTED';
}

const INITIAL_ACCOUNTS: AccountItem[] = [
  {
    id: 'acc-1',
    name: 'Primary Operating Savings',
    institution: 'HDFC Bank',
    type: 'SAVINGS',
    mask: '•••• 4092',
    currency: 'INR',
    balance: 485200.5,
    status: 'SYNCED',
  },
  {
    id: 'acc-2',
    name: 'Treasury & Tax Reserve',
    institution: 'ICICI Bank',
    type: 'CURRENT',
    mask: '•••• 1834',
    currency: 'INR',
    balance: 1250000.0,
    status: 'SYNCED',
  },
  {
    id: 'acc-3',
    name: 'Equity Portfolio Demat',
    institution: 'Zerodha Broking',
    type: 'DEMAT',
    mask: '•••• 9921',
    currency: 'INR',
    balance: 3845000.75,
    status: 'SYNCED',
  },
  {
    id: 'acc-4',
    name: 'Corporate Infinite Card',
    institution: 'Axis Bank',
    type: 'CREDIT_CARD',
    mask: '•••• 8820',
    currency: 'INR',
    balance: -42300.0,
    status: 'ACTIVE',
  },
];

export default function AccountsPage() {
  const [accounts] = useState<AccountItem[]>(INITIAL_ACCOUNTS);

  const totalLiquid = accounts
    .filter((a) => a.type === 'SAVINGS' || a.type === 'CURRENT')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalInvestments = accounts
    .filter((a) => a.type === 'DEMAT')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.type === 'CREDIT_CARD' || a.type === 'LOAN')
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">Financial Accounts & Ledgers</h1>
            <Badge variant="positive" size="sm">
              <ShieldCheck className="w-3 h-3 mr-1 inline" />
              AES-256 Encrypted
            </Badge>
          </div>
          <p className="text-xs text-[#758078] mt-1">
            Consolidated depository, trading, and liability accounts mapped to double-entry general ledger.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[#16A36A]" />
            <span>Sync Feeds</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-2">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Link Account</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Liquid Cash & Reserves
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#16A36A]/10 flex items-center justify-center text-[#16A36A]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#17231D] mt-2">
            ₹{totalLiquid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#16A36A] font-medium mt-1">Available for working capital & operating reserves</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Securities & Demat Holdings
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#6475D8]/10 flex items-center justify-center text-[#6475D8]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#17231D] mt-2">
            ₹{totalInvestments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#758078] mt-1">Direct equities, MFs, and fixed income</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Revolving Liabilities
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#DC5B5B]/10 flex items-center justify-center text-[#DC5B5B]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#DC5B5B] mt-2">
            ₹{totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#758078] mt-1">Credit lines & card balances pending settlement</p>
        </Card>
      </div>

      {/* Accounts Ledger Table */}
      <Card>
        <CardHeader
          title="Connected Accounts"
          subtitle="Real-time multi-tenant account ledger with verified RLS isolation"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E7ECE8] text-[#758078] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Account Name & Institution</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Account Identifier</th>
                <th className="py-3 px-4">Sync Status</th>
                <th className="py-3 px-4 text-right">Balance (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7ECE8]">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-[#F7F9F7] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[#F0F4F1] text-[#16A36A] border border-[#E7ECE8]">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#17231D]">{acc.name}</div>
                        <div className="text-[11px] text-[#758078]">{acc.institution}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="neutral" size="sm">
                      {acc.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#758078]">{acc.mask}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={acc.status === 'SYNCED' ? 'positive' : 'warning'}
                      size="sm"
                    >
                      {acc.status}
                    </Badge>
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono font-semibold ${
                      acc.balance >= 0 ? 'text-[#17231D]' : 'text-[#DC5B5B]'
                    }`}
                  >
                    ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
