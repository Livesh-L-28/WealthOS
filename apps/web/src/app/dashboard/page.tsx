import React from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Landmark,
  UploadCloud,
  PlusCircle,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Executive Financial Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-asset balance sheet and consolidated double-entry ledger state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Statement</span>
          </Button>
          <Button variant="primary" size="sm" className="gap-2">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </Button>
        </div>
      </div>

      {/* Onboarding Setup Checklist Card */}
      <div className="rounded-lg border border-indigo-900/50 bg-indigo-950/20 p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Workspace Initialization
              </span>
              <Badge variant="brand" size="sm">0 of 4 Completed</Badge>
            </div>
            <h2 className="text-sm font-semibold text-slate-200">
              Welcome to WealthOS. Complete your financial workspace configuration.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div className="flex items-start gap-3 p-3 rounded-md bg-slate-900/60 border border-slate-800">
            <Circle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-200">1. Link Bank Account</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Connect via Account Aggregator or manual setup</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md bg-slate-900/60 border border-slate-800">
            <Circle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-200">2. Ingest Statement</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload PDF or CSV for automated OCR extraction</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md bg-slate-900/60 border border-slate-800">
            <Circle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-200">3. Reconcile Ledger</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Verify double-entry transactions against bank feed</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md bg-slate-900/60 border border-slate-800">
            <Circle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-200">4. Define Targets</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Configure monthly cashflow and net worth targets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Worth */}
        <Card>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-slate-400">Total Net Worth</span>
            <div className="p-1.5 rounded-md bg-slate-800 text-slate-300">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
              ₹0.00
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-slate-500" />
              <span>Awaiting asset & liability records</span>
            </p>
          </div>
        </Card>

        {/* Total Assets */}
        <Card>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-slate-400">Consolidated Assets</span>
            <div className="p-1.5 rounded-md bg-emerald-950/60 text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
              ₹0.00
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              0 linked accounts (Bank, Demat, Real Estate)
            </p>
          </div>
        </Card>

        {/* Total Liabilities */}
        <Card>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-slate-400">Total Liabilities</span>
            <div className="p-1.5 rounded-md bg-rose-950/60 text-rose-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-400 tabular-nums">
              ₹0.00
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              0 active loans or credit obligations
            </p>
          </div>
        </Card>

        {/* Monthly Net Savings */}
        <Card>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-slate-400">Monthly Net Savings</span>
            <div className="p-1.5 rounded-md bg-slate-800 text-slate-300">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
              ₹0.00
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Income ₹0.00 · Expenses ₹0.00
            </p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Accounts & Ledger Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Panel (2 columns) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader
              title="Recent Transactions"
              subtitle="Double-entry verified journal entries from linked institutions"
              action={
                <Button variant="ghost" size="sm" className="text-xs text-indigo-400">
                  View Full Ledger
                </Button>
              }
            />
            <EmptyState
              icon={FileText}
              title="No transactions recorded yet"
              description="Import an official bank e-statement (PDF/CSV) or connect your account to begin building your auditable financial ledger."
              actionLabel="Import Bank Statement"
            />
          </Card>
        </div>

        {/* Linked Accounts Summary Panel (1 column) */}
        <div>
          <Card className="h-full">
            <CardHeader
              title="Linked Accounts"
              subtitle="0 accounts configured"
              action={
                <Button variant="outline" size="sm" className="text-xs">
                  Connect
                </Button>
              }
            />
            <EmptyState
              icon={Landmark}
              title="No accounts linked"
              description="Connect savings, current, demat or credit accounts to establish real-time balance tracking."
              actionLabel="Add First Account"
            />
          </Card>
        </div>
      </div>

      {/* Infrastructure Verification & Security Notice */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span>
            WealthOS runs locally in zero-trust containerized isolation. All financial records are cryptographically secured.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-slate-500">API: http://localhost:8000</span>
        </div>
      </div>
    </div>
  );
}

