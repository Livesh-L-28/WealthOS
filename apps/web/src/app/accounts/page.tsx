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
  Inbox,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddAccountModal, NewAccountData } from '@/components/modals/AddAccountModal';

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

const INITIAL_ACCOUNTS: AccountItem[] = [];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>(INITIAL_ACCOUNTS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const totalLiquid = accounts
    .filter((a) => a.type === 'SAVINGS' || a.type === 'CURRENT')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalInvestments = accounts
    .filter((a) => a.type === 'DEMAT')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.type === 'CREDIT_CARD' || a.type === 'LOAN')
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const handleAccountAdded = (newAcc: NewAccountData) => {
    const record: AccountItem = {
      id: `acc-${Date.now()}`,
      name: newAcc.name,
      institution: newAcc.institution,
      type: newAcc.type,
      mask: newAcc.mask,
      currency: newAcc.currency,
      balance: newAcc.balance,
      status: 'SYNCED',
    };
    setAccounts((prev) => [record, ...prev]);
  };

  const handleSyncFeeds = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Financial Accounts</h1>
            <Badge variant="positive" size="sm">
              <ShieldCheck className="w-3 h-3 mr-1 inline" />
              AES-256 Encrypted
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Consolidated depository, trading, and liability accounts mapped to double-entry general ledger.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncFeeds}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#10B981] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Feeds'}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Link Account</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center">
              Liquid Cash & Reserves
              <InfoTooltip
                title="Liquid Cash"
                content="Available bank balances and cash reserves that can be immediately accessed without market penalty."
              />
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-[#0F172A] mt-2">
            ₹{totalLiquid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#10B981] font-medium mt-1">Available for operating reserves & emergency funds</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center">
              Securities & Demat Holdings
              <InfoTooltip termKey="portfolio" />
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#6475D8]/10 flex items-center justify-center text-[#6475D8]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-[#0F172A] mt-2">
            ₹{totalInvestments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#64748B] mt-1">Direct equities, MFs, and fixed income</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center">
              Total Liabilities (Debts)
              <InfoTooltip termKey="liabilities" />
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-[#EF4444] mt-2">
            ₹{totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#64748B] mt-1">Credit lines & card balances pending settlement</p>
        </Card>
      </div>

      {/* Accounts Ledger Table */}
      <Card>
        <CardHeader
          title="Connected Accounts"
          subtitle="Real-time multi-tenant account ledger with verified RLS isolation"
        />

        {accounts.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No accounts linked yet"
            description="Add your first savings bank, demat, or credit account to start tracking your unified balance sheet."
            actionLabel="Link First Account"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Account Name & Institution</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Account Identifier</th>
                  <th className="py-3 px-4">Sync Status</th>
                  <th className="py-3 px-4 text-right">Balance (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[#F1F5F9] text-[#10B981] border border-[#E2E8F0]">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#0F172A]">{acc.name}</div>
                          <div className="text-[11px] text-[#64748B]">{acc.institution}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral" size="sm">
                        {acc.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">{acc.mask}</td>
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
                        acc.balance >= 0 ? 'text-[#0F172A]' : 'text-[#EF4444]'
                      }`}
                    >
                      {acc.balance < 0 ? '-' : ''}₹
                      {Math.abs(acc.balance).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAccountAdded={handleAccountAdded}
      />
    </div>
  );
}
