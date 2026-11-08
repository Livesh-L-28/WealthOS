'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '../ui/Card';
import {
  PlusCircle,
  UploadCloud,
  Landmark,
  TrendingUp,
  PieChart,
  Target,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface QuickActionItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ACTIONS: QuickActionItem[] = [
  { label: 'Add Transaction', href: '/transactions', icon: PlusCircle },
  { label: 'Connect Account', href: '/accounts', icon: Landmark },
  { label: 'Upload Statement', href: '/documents', icon: UploadCloud },
  { label: 'Record Holding', href: '/investments', icon: TrendingUp },
  { label: 'Create Envelope', href: '/budgets', icon: PieChart },
  { label: 'Set Milestone', href: '/goals', icon: Target },
];

export function QuickActionsCard() {
  return (
    <div className="space-y-4">
      {/* Contextual Intelligence Insight Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#16A36A]/10 via-[#F7F9F7] to-white border border-[#16A36A]/20 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#16A36A] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#087A50]">
            Copilot Financial Insights
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white/90 border border-[#E7ECE8] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#D99A32] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#17231D]">Upcoming Auto-Debit Due in 2 Days</p>
              <p className="text-[11px] text-[#758078] mt-0.5">
                ₹20,000 SIP mandate for Mirae Asset Large & Midcap on 10 Nov. Primary Savings has sufficient balance (₹17.3L).
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/90 border border-[#E7ECE8] flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#16A36A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#17231D]">Emergency Runway Optimization</p>
              <p className="text-[11px] text-[#758078] mt-0.5">
                Liquid cash reserves stand at 3.2 months. Deploying surplus November cash flow (+₹60,450) will boost runway to 3.6 months.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/copilot"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087A50] hover:text-[#16A36A] transition-colors"
        >
          <span>Ask Copilot about your portfolio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quick Action Grid */}
      <Card>
        <CardHeader
          title="Quick Actions"
          subtitle="Direct links to standard accounting and ledger workflows"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACTIONS.map((action, idx) => {
            const Icon = action.icon;

            return (
              <Link
                key={idx}
                href={action.href}
                className="p-3 rounded-xl border border-[#E7ECE8] bg-[#F7F9F7] hover:bg-white hover:border-[#D1D9D3] hover:shadow-xs text-center transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-[#E7ECE8] group-hover:border-[#16A36A] group-hover:bg-[#16A36A]/10 flex items-center justify-center text-[#758078] group-hover:text-[#16A36A] transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#17231D] group-hover:text-[#16A36A] transition-colors">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
