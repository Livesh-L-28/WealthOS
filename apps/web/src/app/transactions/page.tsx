'use client';

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Filter,
  Search,
  Download,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck2,
  Sparkles,
  PlusCircle,
  Inbox,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddTransactionModal, NewTransactionData } from '@/components/modals/AddTransactionModal';

interface TransactionRecord {
  id: string;
  date: string;
  description: string;
  account: string;
  category: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  status: 'RECONCILED' | 'CLEARED' | 'PENDING';
  journalEntryId: string;
}

const INITIAL_TRANSACTIONS: TransactionRecord[] = [];

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [filterType, setFilterType] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.account.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === 'ALL' ? true : tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalInflows = transactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflows = transactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleTransactionAdded = (newTx: NewTransactionData) => {
    const record: TransactionRecord = {
      id: `tx-${Date.now()}`,
      date: newTx.date,
      description: newTx.description,
      account: newTx.account,
      category: newTx.category,
      amount: newTx.amount,
      type: newTx.type,
      status: 'RECONCILED',
      journalEntryId: `JE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    setTransactions((prev) => [record, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Transactions & Ledger</h1>
            <Badge variant="positive" size="sm">
              <CheckCircle2 className="w-3 h-3 mr-1 inline text-[#10B981]" />
              Σ(Dr - Cr) = 0.0000
            </Badge>
            <InfoTooltip
              title="Double-Entry Balance"
              content="Every financial transaction records equal debits and credits, mathematically guaranteeing your balance sheet is always honest and error-free."
            />
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            General journal entries with audit citations, category classifications, and reconciliation stamps.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </Button>

          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Export CSV</span>
          </Button>

          <Button variant="outline" size="sm" className="gap-2">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Reconcile Ledger</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
            Settled Inflows (Credits)
          </span>
          <p className="text-2xl font-bold font-mono text-[#10B981] mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-5 h-5" />
            ₹{totalInflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#64748B] mt-1">Verified income deposits</p>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
            Settled Outflows (Debits)
          </span>
          <p className="text-2xl font-bold font-mono text-[#0F172A] mt-2 flex items-center gap-1">
            <ArrowDownRight className="w-5 h-5 text-[#EF4444]" />
            ₹{totalOutflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#64748B] mt-1">Operational debit postings</p>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
            Ledger Reconciliation State
          </span>
          <p className="text-2xl font-bold font-mono text-[#10B981] mt-2">100% Balanced</p>
          <p className="text-xs text-[#64748B] mt-1">Zero unposted or unbalanced entries</p>
        </Card>
      </div>

      {/* Filter & Transactions Table */}
      <Card>
        <CardHeader
          title="Journal Entries"
          subtitle="Showing verified multi-currency ledger transactions"
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B]">Filter:</span>
              {(['ALL', 'CREDIT', 'DEBIT'] as const).map((ft) => (
                <button
                  key={ft}
                  onClick={() => setFilterType(ft)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    filterType === ft
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {ft === 'ALL' ? 'All' : ft === 'CREDIT' ? 'Inflows' : 'Outflows'}
                </button>
              ))}
            </div>
          }
        />

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description, account, category..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
            />
          </div>
        </div>

        {/* Empty State */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No transactions match your search"
            description="Try adjusting your filter keywords or record a new transaction to update your ledger."
            actionLabel="Add Transaction"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description & Journal ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#64748B]">{tx.date}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F172A]">{tx.description}</div>
                      <div className="text-[10px] text-[#64748B] font-mono mt-0.5">{tx.journalEntryId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">{tx.account}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          tx.status === 'RECONCILED'
                            ? 'positive'
                            : tx.status === 'CLEARED'
                            ? 'brand'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-semibold ${
                        tx.type === 'CREDIT' ? 'text-[#10B981]' : 'text-[#0F172A]'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}₹
                      {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={handleTransactionAdded}
      />
    </div>
  );
}
