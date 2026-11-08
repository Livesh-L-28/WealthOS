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
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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

const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-101',
    date: '2026-11-07',
    description: 'Amazon AWS Cloud Infrastructure Service',
    account: 'Primary Operating Savings',
    category: 'Technology & Hosting',
    amount: 14250.0,
    type: 'DEBIT',
    status: 'RECONCILED',
    journalEntryId: 'JE-2026-1107-001',
  },
  {
    id: 'tx-102',
    date: '2026-11-06',
    description: 'Quarterly Dividend Payout — Tata Consultancy Services',
    account: 'Equity Portfolio Demat',
    category: 'Dividend Income',
    amount: 32000.0,
    type: 'CREDIT',
    status: 'RECONCILED',
    journalEntryId: 'JE-2026-1106-004',
  },
  {
    id: 'tx-103',
    date: '2026-11-05',
    description: 'Executive Office Lease & Facilities',
    account: 'Treasury & Tax Reserve',
    category: 'Rent & Real Estate',
    amount: 85000.0,
    type: 'DEBIT',
    status: 'RECONCILED',
    journalEntryId: 'JE-2026-1105-002',
  },
  {
    id: 'tx-104',
    date: '2026-11-04',
    description: 'Client Advisory Retainer Inflow',
    account: 'Primary Operating Savings',
    category: 'Professional Services',
    amount: 180000.0,
    type: 'CREDIT',
    status: 'CLEARED',
    journalEntryId: 'JE-2026-1104-009',
  },
  {
    id: 'tx-105',
    date: '2026-11-03',
    description: 'Fuel & Corporate Travel Expenses',
    account: 'Corporate Infinite Card',
    category: 'Travel & Mobility',
    amount: 4850.0,
    type: 'DEBIT',
    status: 'PENDING',
    journalEntryId: 'JE-2026-1103-011',
  },
];

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);

  const filtered = transactions.filter(
    (tx) =>
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.account.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Double-Entry Transaction Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Auditable general journal lines with mathematical debit-credit balance preservation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-2">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Record Transfer</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, category, or account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-3.5 h-3.5" />
              <span>All Accounts</span>
            </Button>
            <Badge variant="brand" size="sm">
              <FileCheck2 className="w-3 h-3 mr-1 inline" />
              Σ Dr - Σ Cr = 0.0000
            </Badge>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader
          title="Journal Entries"
          subtitle={`Showing ${filtered.length} postings`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Account & Category</th>
                <th className="px-4 py-3">Journal Ref</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{tx.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-300">{tx.account}</div>
                    <div className="text-[11px] text-slate-500">{tx.category}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-400">
                    {tx.journalEntryId}
                  </td>
                  <td className="px-4 py-3">
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
                    className={`px-4 py-3 text-right font-mono font-medium whitespace-nowrap ${
                      tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-slate-100'
                    }`}
                  >
                    <span className="flex items-center justify-end gap-1">
                      {tx.type === 'CREDIT' ? (
                        <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
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
