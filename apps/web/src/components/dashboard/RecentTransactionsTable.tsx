'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '../ui/Card';
import { Search, ChevronRight, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface TransactionItem {
  id: string;
  name: string;
  account: string;
  category: string;
  date: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  status: 'RECONCILED' | 'CLEARED' | 'PENDING';
}

interface RecentTransactionsTableProps {
  transactions?: TransactionItem[];
}

export function RecentTransactionsTable({ transactions }: RecentTransactionsTableProps = {}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');

  const txList = transactions !== undefined ? transactions : [];

  const filtered = txList.filter((tx) => {
    const matchesSearch =
      tx.name.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase()) ||
      tx.account.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      filter === 'ALL'
        ? true
        : filter === 'INFLOW'
        ? tx.type === 'CREDIT'
        : tx.type === 'DEBIT';
    return matchesSearch && matchesType;
  });

  return (
    <Card>
      <CardHeader
        title="Recent Double-Entry Transactions"
        subtitle="Balanced ledger journal entries linked across active accounts"
        action={
          <Link
            href="/transactions"
            className="text-xs font-semibold text-[#10B981] hover:text-[#059669] inline-flex items-center gap-0.5"
          >
            <span>Full Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recent activity..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['ALL', 'INFLOW', 'OUTFLOW'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                filter === tab
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'INFLOW' ? 'Inflows' : 'Outflows'}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Empty State */}
      {filtered.length === 0 ? (
        <div className="py-10 px-4 text-center">
          <p className="text-xs font-semibold text-[#0F172A]">No recent ledger transactions</p>
          <p className="text-xs text-[#64748B] mt-1">Connect an account or post a journal entry to view settled activity.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#475569] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Transaction</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#0F172A]">{tx.name}</div>
                    <div className="text-[10px] text-[#475569] font-mono">{tx.id}</div>
                  </td>
                  <td className="py-3 px-3 text-[#475569] font-medium">{tx.category}</td>
                  <td className="py-3 px-3 text-[#475569]">{tx.account}</td>
                  <td className="py-3 px-3 text-[#475569] font-mono">{tx.date}</td>
                  <td className="py-3 px-3">
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
                  <td className="py-3 px-3 text-right font-mono font-semibold">
                    <span
                      className={tx.type === 'CREDIT' ? 'text-[#10B981]' : 'text-[#0F172A]'}
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}₹
                      {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

