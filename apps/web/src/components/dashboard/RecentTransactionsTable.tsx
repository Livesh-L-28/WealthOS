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

const RECENT_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'tx-01',
    name: 'AWS Cloud Infrastructure Service',
    account: 'Primary Operating Savings',
    category: 'Technology & Hosting',
    date: '7 Nov 2026',
    amount: 14250.0,
    type: 'DEBIT',
    status: 'RECONCILED',
  },
  {
    id: 'tx-02',
    name: 'Quarterly Dividend Payout — TCS',
    account: 'Equity Demat Portfolio',
    category: 'Dividend Income',
    date: '6 Nov 2026',
    amount: 32000.0,
    type: 'CREDIT',
    status: 'RECONCILED',
  },
  {
    id: 'tx-03',
    name: 'Executive Office Lease Rental',
    account: 'Treasury & Tax Reserve',
    category: 'Rent & Real Estate',
    date: '5 Nov 2026',
    amount: 85000.0,
    type: 'DEBIT',
    status: 'RECONCILED',
  },
  {
    id: 'tx-04',
    name: 'Client Advisory Strategic Retainer',
    account: 'Primary Operating Savings',
    category: 'Professional Services',
    date: '4 Nov 2026',
    amount: 180000.0,
    type: 'CREDIT',
    status: 'CLEARED',
  },
  {
    id: 'tx-05',
    name: 'Fuel & Corporate Travel Mobility',
    account: 'Corporate Infinite Card',
    category: 'Travel & Transit',
    date: '3 Nov 2026',
    amount: 4850.0,
    type: 'DEBIT',
    status: 'PENDING',
  },
];

export function RecentTransactionsTable() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');

  const filtered = RECENT_TRANSACTIONS.filter((tx) => {
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
            className="text-xs font-semibold text-[#16A36A] hover:text-[#087A50] inline-flex items-center gap-0.5"
          >
            <span>Full Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recent activity..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F9F7] border border-[#E7ECE8] rounded-xl text-[#17231D] placeholder-[#9BA39D] focus:outline-none focus:ring-1 focus:ring-[#16A36A]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['ALL', 'INFLOW', 'OUTFLOW'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                filter === tab
                  ? 'bg-[#17231D] text-white shadow-sm'
                  : 'bg-[#F7F9F7] text-[#758078] hover:text-[#17231D]'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'INFLOW' ? 'Inflows' : 'Outflows'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E7ECE8] text-[#758078] uppercase tracking-wider font-semibold">
              <th className="py-2.5 px-3">Transaction</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Account</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7ECE8]">
            {filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-[#F7F9F7] transition-colors">
                <td className="py-3 px-3">
                  <div className="font-semibold text-[#17231D]">{tx.name}</div>
                  <div className="text-[10px] text-[#758078] font-mono">{tx.id}</div>
                </td>
                <td className="py-3 px-3 text-[#758078] font-medium">{tx.category}</td>
                <td className="py-3 px-3 text-[#758078]">{tx.account}</td>
                <td className="py-3 px-3 text-[#758078] font-mono">{tx.date}</td>
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
                    className={tx.type === 'CREDIT' ? 'text-[#16A36A]' : 'text-[#17231D]'}
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
    </Card>
  );
}

