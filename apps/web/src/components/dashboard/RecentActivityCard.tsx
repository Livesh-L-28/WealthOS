'use client';

import React from 'react';
import { Card, CardHeader } from '../ui/Card';
import {
  FileCheck2,
  RefreshCw,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
} from 'lucide-react';

interface ActivityEvent {
  id: string;
  type: 'SYNC' | 'OCR' | 'RECONCILIATION' | 'SIP' | 'ALERT';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ACTIVITIES: ActivityEvent[] = [
  {
    id: 'act-1',
    type: 'RECONCILIATION',
    title: 'Double-Entry Ledger Verified',
    description: 'All 5 transactions matched against bank statement feeds with 0.0000 balance discrepancy.',
    timestamp: 'Today, 11:30 AM',
    icon: CheckCircle2,
  },
  {
    id: 'act-2',
    type: 'OCR',
    title: 'HDFC Statement Processed',
    description: 'Extracted 42 journal records from PDF statement via asynchronous Celery OCR worker.',
    timestamp: 'Yesterday, 04:15 PM',
    icon: FileText,
  },
  {
    id: 'act-3',
    type: 'SIP',
    title: 'SIP Mandate Scheduled',
    description: '₹20,000 auto-debit queued for Mirae Asset Large & Midcap Fund on 10 Nov 2026.',
    timestamp: '2 days ago',
    icon: Repeat,
  },
  {
    id: 'act-4',
    type: 'ALERT',
    title: 'Budget Threshold Reached',
    description: 'Technology & Cloud Hosting exceeded allocated envelope limit (114% utilization).',
    timestamp: '3 days ago',
    icon: AlertTriangle,
  },
];

export function RecentActivityCard() {
  return (
    <Card>
      <CardHeader
        title="Audit Trail & System Activity"
        subtitle="Immutable event logs from background OCR workers, bank feeds, and ledger verifications"
      />

      <div className="space-y-4">
        {ACTIVITIES.map((act) => {
          const Icon = act.icon;

          return (
            <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  act.type === 'ALERT'
                    ? 'bg-[#EF4444]/10 text-[#EF4444]'
                    : act.type === 'RECONCILIATION'
                    ? 'bg-[#10B981]/10 text-[#10B981]'
                    : 'bg-[#6475D8]/10 text-[#6475D8]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#0F172A]">{act.title}</h4>
                  <span className="text-[10px] text-[#475569] flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-[#475569]" />
                    {act.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  {act.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

