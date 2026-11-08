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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Financial Accounts & Ledgers</h1>
          <p className="text-xs text-slate-400 mt-1">
            Consolidated depository, trading, and liability accounts mapped to double-entry general ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Liquid Cash & Reserves
            </span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{totalLiquid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">Available for working capital & reserves</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Securities & Demat Holdings
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{totalInvestments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Direct equities, MFs, and fixed income</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Revolving Liabilities
            </span>
            <CreditCard className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ₹{totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-rose-400 mt-1">Credit lines & card balances pending settlement</p>
        </Card>
      </div>

      {/* Accounts Ledger Table */}
      <Card>
        <CardHeader
          title="Connected Accounts"
          subtitle="Real-time multi-tenant account ledger with verified RLS isolation"
          action={
            <Badge variant="brand" size="sm">
              <ShieldCheck className="w-3 h-3 mr-1 inline" />
              AES-256 Encrypted
            </Badge>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Account Name & Institution</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Account Identifier</th>
                <th className="px-4 py-3">Sync Status</th>
                <th className="px-4 py-3 text-right">Balance (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-slate-800 text-slate-300">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{acc.name}</div>
                        <div className="text-xs text-slate-400">{acc.institution}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral" size="sm">
                      {acc.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{acc.mask}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={acc.status === 'SYNCED' ? 'positive' : 'warning'}
                      size="sm"
                    >
                      {acc.status}
                    </Badge>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-medium ${
                      acc.balance >= 0 ? 'text-slate-100' : 'text-rose-400'
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

