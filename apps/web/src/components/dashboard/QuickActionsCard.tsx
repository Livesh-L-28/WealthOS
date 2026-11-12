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
  id: 'transaction' | 'account' | 'document' | 'investment' | 'budget' | 'goal';
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ACTIONS: QuickActionItem[] = [
  { id: 'transaction', label: 'Add Transaction', href: '/transactions', icon: PlusCircle },
  { id: 'account', label: 'Connect Account', href: '/accounts', icon: Landmark },
  { id: 'document', label: 'Upload Statement', href: '/documents', icon: UploadCloud },
  { id: 'investment', label: 'Record Holding', href: '/investments', icon: TrendingUp },
  { id: 'budget', label: 'Create Envelope', href: '/budgets', icon: PieChart },
  { id: 'goal', label: 'Set Milestone', href: '/goals', icon: Target },
];

interface QuickActionsCardProps {
  onTriggerModal?: (actionId: QuickActionItem['id']) => void;
}

export function QuickActionsCard({ onTriggerModal }: QuickActionsCardProps) {
  return (
    <div className="space-y-4">
      {/* Contextual Intelligence Insight Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#10B981]/10 via-[#F8FAFC] to-white border border-[#10B981]/20 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#10B981] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#059669]">
            Copilot Financial Insights
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white/90 border border-[#E2E8F0] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#0F172A]">Upcoming Auto-Debit Due in 2 Days</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                ₹20,000 SIP mandate for Mirae Asset Large & Midcap on 10 Nov. Primary Savings has sufficient balance (₹17.3L).
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/90 border border-[#E2E8F0] flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#0F172A]">Emergency Runway Optimization</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Liquid cash reserves stand at 3.2 months. Deploying surplus November cash flow (+₹60,450) will boost runway to 3.6 months.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/copilot"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:text-[#10B981] transition-colors"
        >
          <span>Ask Copilot about your portfolio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quick Action Grid */}
      <Card>
        <CardHeader
          title="Quick Actions"
          subtitle="Direct triggers for standard accounting and wealth workflows"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;

            if (onTriggerModal) {
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onTriggerModal(action.id)}
                  className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#10B981]/50 hover:shadow-xs text-center transition-all flex flex-col items-center justify-center gap-2 group min-h-[44px]"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] group-hover:border-[#10B981] group-hover:bg-[#10B981]/10 flex items-center justify-center text-[#64748B] group-hover:text-[#10B981] transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[#0F172A] group-hover:text-[#10B981] transition-colors">
                    {action.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={action.id}
                href={action.href}
                className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1] hover:shadow-xs text-center transition-all flex flex-col items-center justify-center gap-2 group min-h-[44px]"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] group-hover:border-[#10B981] group-hover:bg-[#10B981]/10 flex items-center justify-center text-[#64748B] group-hover:text-[#10B981] transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#0F172A] group-hover:text-[#10B981] transition-colors">
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
