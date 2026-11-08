'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  FileText,
  TrendingUp,
  Landmark,
  ArrowRight,
  ExternalLink,
  Clock,
  ChevronRight,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface DiscrepancyItem {
  id: string;
  source_reference: string;
  account_name: string;
  expected_amount: string;
  posted_amount: string | null;
  difference: string | null;
  currency_code: string;
  status: 'UNMATCHED' | 'MATCHED' | 'DISCREPANCY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  discrepancy_category: string;
  discrepancy_reason: string | null;
  resolution_status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'MARKED_DUPLICATE' | 'REJECTED' | 'ESCALATED';
  created_at: string;
}

const MOCK_DISCREPANCIES: DiscrepancyItem[] = [
  {
    id: 'disc-01',
    source_reference: 'HDFC-UPI-492019',
    account_name: 'HDFC Salary Account',
    expected_amount: '4500.00',
    posted_amount: '4000.00',
    difference: '500.00',
    currency_code: 'INR',
    status: 'DISCREPANCY',
    severity: 'MEDIUM',
    discrepancy_category: 'AMOUNT_MISMATCH',
    discrepancy_reason: 'Statement shows ₹4,500.00 but ledger contains ₹4,000.00 debit.',
    resolution_status: 'OPEN',
    created_at: '2026-11-08 09:15',
  },
  {
    id: 'disc-02',
    source_reference: 'POS-SWIPE-98214',
    account_name: 'ICICI Amazon Pay Card',
    expected_amount: '12999.00',
    posted_amount: null,
    difference: '12999.00',
    currency_code: 'INR',
    status: 'DISCREPANCY',
    severity: 'HIGH',
    discrepancy_category: 'UNMATCHED_EXTERNAL',
    discrepancy_reason: 'External POS charge not posted to internal double-entry ledger.',
    resolution_status: 'OPEN',
    created_at: '2026-11-07 14:30',
  },
  {
    id: 'disc-03',
    source_reference: 'ZERODHA-STMT-098',
    account_name: 'Zerodha Kite Demat',
    expected_amount: '62700.00',
    posted_amount: '62700.00',
    difference: '0.00',
    currency_code: 'INR',
    status: 'MATCHED',
    severity: 'LOW',
    discrepancy_category: 'INVESTMENT_VERIFIED',
    discrepancy_reason: 'Exact unit and NAV match verified against CAS statement.',
    resolution_status: 'RESOLVED',
    created_at: '2026-11-06 18:20',
  },
  {
    id: 'disc-04',
    source_reference: 'BILL-DESK-9921',
    account_name: 'SBI Savings Account',
    expected_amount: '2499.00',
    posted_amount: '2499.00',
    difference: '0.00',
    currency_code: 'INR',
    status: 'DISCREPANCY',
    severity: 'CRITICAL',
    discrepancy_category: 'DUPLICATE_CANDIDATE',
    discrepancy_reason: 'Identical amount charged twice within 30 seconds on utility bill payment.',
    resolution_status: 'ESCALATED',
    created_at: '2026-11-08 11:00',
  },
];

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'discrepancies' | 'bank' | 'investments' | 'data-quality'>('discrepancies');
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyItem[]>(MOCK_DISCREPANCIES);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<DiscrepancyItem | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredDiscrepancies = discrepancies.filter((item) => {
    const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
    const matchesSearch =
      item.source_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.discrepancy_reason && item.discrepancy_reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  const handleAction = (action: 'REVIEW' | 'MATCH' | 'MARK_DUPLICATE' | 'RESOLVE' | 'REJECT' | 'ESCALATE') => {
    if (!selectedDiscrepancy) return;

    let newStatus: DiscrepancyItem['resolution_status'] = 'OPEN';
    let recordStatus: DiscrepancyItem['status'] = selectedDiscrepancy.status;

    if (action === 'REVIEW') newStatus = 'UNDER_REVIEW';
    if (action === 'MATCH') {
      newStatus = 'RESOLVED';
      recordStatus = 'MATCHED';
    }
    if (action === 'MARK_DUPLICATE') newStatus = 'MARKED_DUPLICATE';
    if (action === 'RESOLVE') {
      newStatus = 'RESOLVED';
      recordStatus = 'MATCHED';
    }
    if (action === 'REJECT') newStatus = 'REJECTED';
    if (action === 'ESCALATE') newStatus = 'ESCALATED';

    setDiscrepancies((prev) =>
      prev.map((d) =>
        d.id === selectedDiscrepancy.id
          ? { ...d, resolution_status: newStatus, status: recordStatus }
          : d
      )
    );

    setActionSuccess(`Action '${action}' successfully executed on ${selectedDiscrepancy.source_reference}.`);
    setTimeout(() => setActionSuccess(null), 4000);
    setSelectedDiscrepancy(null);
    setActionNotes('');
  };

  const getSeverityBadge = (severity: DiscrepancyItem['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="negative" className="bg-red-50 text-red-700 border border-red-200">CRITICAL</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="bg-amber-50 text-amber-700 border border-amber-200">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="neutral" className="bg-blue-50 text-blue-700 border border-blue-200">MEDIUM</Badge>;
      case 'LOW':
        return <Badge variant="positive" className="bg-emerald-50 text-emerald-700 border border-emerald-200">LOW</Badge>;
    }
  };

  const getStatusBadge = (status: DiscrepancyItem['resolution_status']) => {
    switch (status) {
      case 'RESOLVED':
        return <Badge variant="positive" className="bg-emerald-50 text-emerald-700">RESOLVED</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="warning" className="bg-amber-50 text-amber-700">UNDER REVIEW</Badge>;
      case 'ESCALATED':
        return <Badge variant="negative" className="bg-red-50 text-red-700">ESCALATED</Badge>;
      case 'MARKED_DUPLICATE':
        return <Badge variant="neutral" className="bg-purple-50 text-purple-700">DUPLICATE</Badge>;
      case 'REJECTED':
        return <Badge variant="neutral" className="bg-slate-100 text-slate-600">REJECTED</Badge>;
      default:
        return <Badge variant="neutral" className="bg-rose-50 text-rose-700">OPEN</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Control Centre</h1>
            <Badge variant="positive" className="bg-emerald-50 text-emerald-700 border border-emerald-200">
              Integrity Verified
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Continuous statement reconciliation, anomaly detection, and double-entry ledger audits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Sync Feeds
          </Button>
          <Button variant="primary" size="sm" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Audit Ledger Invariants
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Control KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ledger Balance Status</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Balanced
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                Δ = 0.0000
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Debits strictly equal credits across all accounts</span>
              <InfoTooltip termKey="cost-basis" />
            </p>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Open Discrepancies</span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {discrepancies.filter((d) => d.resolution_status === 'OPEN').length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {discrepancies.filter((d) => d.severity === 'CRITICAL' && d.resolution_status !== 'RESOLVED').length} critical exceptions requiring attention
            </p>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Reconciliation Rate</span>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">97.8%</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              +1.2% vs previous statement cycle
            </p>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Data Freshness</span>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">Live (5m ago)</div>
            <p className="text-xs text-slate-500 mt-1">
              All 4 connected accounts synced & healthy
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('discrepancies')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'discrepancies'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Discrepancy Queue ({filteredDiscrepancies.length})
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'bank'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Bank Statements
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'investments'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Investment Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('data-quality')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'data-quality'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Data Quality & Freshness
          </button>
        </div>
      </div>

      {/* Discrepancy Queue Content */}
      {activeTab === 'discrepancies' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, account, or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-500">Severity:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    severityFilter === s
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Discrepancies Table */}
          <Card className="overflow-hidden border border-slate-200/80 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Source Reference</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4 text-right">Expected</th>
                    <th className="py-3 px-4 text-right">Posted</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDiscrepancies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No discrepancies matching the selected filter. All records verified.
                      </td>
                    </tr>
                  ) : (
                    filteredDiscrepancies.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">{getSeverityBadge(d.severity)}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-900 text-xs">
                          {d.source_reference}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{d.account_name}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          ₹{parseFloat(d.expected_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {d.posted_amount
                            ? `₹${parseFloat(d.posted_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-rose-600">
                          {d.difference && parseFloat(d.difference) > 0
                            ? `₹${parseFloat(d.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '₹0.00'}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(d.resolution_status)}</td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 px-2.5"
                            onClick={() => setSelectedDiscrepancy(d)}
                          >
                            Investigate
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Bank Reconciliation View */}
      {activeTab === 'bank' && (
        <Card className="p-6 border border-slate-200/80 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Bank Statement Reconciliation</h3>
            <Badge variant="positive">Auto-Matching Active</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Automated tolerance matching compares bank statement lines against internal journal entries. Tolerance window: ±2 calendar days, exact amount match.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">HDFC Bank Salary (1020)</span>
              <div className="text-xl font-bold text-slate-900 mt-1">₹1,25,000.00</div>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled to ledger
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">SBI Savings Account (1010)</span>
              <div className="text-xl font-bold text-slate-900 mt-1">₹45,200.00</div>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled to ledger
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">ICICI Amazon Pay (2010)</span>
              <div className="text-xl font-bold text-slate-900 mt-1">₹18,450.00</div>
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3.5 w-3.5" /> 1 unposted debit
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Investment Reconciliation View */}
      {activeTab === 'investments' && (
        <Card className="p-6 border border-slate-200/80 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Investment Portfolio & CAS Reconciliation</h3>
            <Badge variant="positive">CAS Sync Current</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Compares internal holding lots against depository CAS statements and mutual fund RTA feeds (CAMS/KFintech).
          </p>
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Instrument</th>
                  <th className="py-2.5 px-3">Folio / Demat</th>
                  <th className="py-2.5 px-3 text-right">Ledger Units</th>
                  <th className="py-2.5 px-3 text-right">CAS Statement Units</th>
                  <th className="py-2.5 px-3 text-right">Unit Variance</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3 font-medium text-slate-900">Parag Parikh Flexi Cap Fund</td>
                  <td className="py-3 px-3 text-slate-500 text-xs font-mono">102948102</td>
                  <td className="py-3 px-3 text-right font-medium">1,450.214</td>
                  <td className="py-3 px-3 text-right font-medium">1,450.214</td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-600">0.000</td>
                  <td className="py-3 px-3"><Badge variant="positive">MATCHED</Badge></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-medium text-slate-900">Mirae Asset Large Cap Fund</td>
                  <td className="py-3 px-3 text-slate-500 text-xs font-mono">998214012</td>
                  <td className="py-3 px-3 text-right font-medium">820.500</td>
                  <td className="py-3 px-3 text-right font-medium">820.500</td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-600">0.000</td>
                  <td className="py-3 px-3"><Badge variant="positive">MATCHED</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Data Quality View */}
      {activeTab === 'data-quality' && (
        <Card className="p-6 border border-slate-200/80 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Financial Data Freshness & Sync Health</h3>
            <Badge variant="neutral">4 Active Sources</Badge>
          </div>
          <div className="space-y-3">
            {[
              { source: 'HDFC NetBanking Direct Sync', status: 'VERIFIED', lastSync: '12 minutes ago', errors: 0 },
              { source: 'Zerodha Kite Demat Holdings', status: 'VERIFIED', lastSync: '1 hour ago', errors: 0 },
              { source: 'SBI Statement PDF Dropzone', status: 'NEEDS_REVIEW', lastSync: '2 days ago', errors: 1 },
              { source: 'CAMS eCAS Statement Reader', status: 'VERIFIED', lastSync: '3 days ago', errors: 0 },
            ].map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{s.source}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Last updated: {s.lastSync}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={s.status === 'VERIFIED' ? 'positive' : 'warning'}>
                    {s.status}
                  </Badge>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    Refresh
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Discrepancy Investigation Modal */}
      {selectedDiscrepancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-semibold text-slate-900">Investigate Discrepancy</h3>
              </div>
              <button
                onClick={() => setSelectedDiscrepancy(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono font-medium text-slate-900">{selectedDiscrepancy.source_reference}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Target Account:</span>
                  <span className="font-medium text-slate-900">{selectedDiscrepancy.account_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Expected External Amount:</span>
                  <span className="font-bold text-slate-900">₹{selectedDiscrepancy.expected_amount}</span>
                </div>
                {selectedDiscrepancy.posted_amount && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Posted Ledger Amount:</span>
                    <span className="font-bold text-slate-700">₹{selectedDiscrepancy.posted_amount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Variance:</span>
                  <span className="font-bold text-rose-600">₹{selectedDiscrepancy.difference || '0.00'}</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{selectedDiscrepancy.discrepancy_reason || 'Discrepancy flagged by automated tolerance audit.'}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Resolution Justification & Audit Note:
                </label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Provide audit justification note before executing resolution action..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleAction('REVIEW')}
                >
                  Mark Under Review
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                  onClick={() => handleAction('MARK_DUPLICATE')}
                >
                  Mark as Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                  onClick={() => handleAction('ESCALATE')}
                >
                  Escalate to Audit
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleAction('RESOLVE')}
                >
                  Resolve & Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
