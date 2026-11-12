'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  Landmark,
  PlusCircle,
  TrendingUp,
  PieChart,
  UploadCloud,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  completed: boolean;
  actionLabel: string;
  actionKey: 'account' | 'transaction' | 'investment' | 'budget' | 'document' | 'overview';
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'step-overview',
    title: 'Understand Your Dashboard',
    description: 'Learn how your Net Worth, Cash Flow, and Solvency are measured.',
    whyItMatters: 'Gives you instant clarity on what you own versus what you owe.',
    completed: true,
    actionLabel: 'View Explanation',
    actionKey: 'overview',
  },
  {
    id: 'step-account',
    title: 'Link Your Primary Bank Account',
    description: 'Connect your active savings or current account to track liquid balances.',
    whyItMatters: 'Essential for tracking operating cash reserves and automated reconciliations.',
    completed: true,
    actionLabel: 'Add Account',
    actionKey: 'account',
  },
  {
    id: 'step-transaction',
    title: 'Record a Transaction',
    description: 'Log an income deposit or everyday expense with double-entry precision.',
    whyItMatters: 'Keeps your monthly cashflow, envelope budgets, and savings rates accurate.',
    completed: true,
    actionLabel: 'Add Transaction',
    actionKey: 'transaction',
  },
  {
    id: 'step-investment',
    title: 'Record an Investment or SIP',
    description: 'Add a mutual fund scheme, equity holding, or fixed deposit.',
    whyItMatters: 'Tracks portfolio growth, XIRR returns, and asset allocation across market cycles.',
    completed: false,
    actionLabel: 'Add Folio',
    actionKey: 'investment',
  },
  {
    id: 'step-budget',
    title: 'Set a Budget Envelope or Goal',
    description: 'Cap monthly discretionary spending or define a milestone target.',
    whyItMatters: 'Prevents lifestyle creep and ensures proactive progress toward financial freedom.',
    completed: true,
    actionLabel: 'Create Envelope',
    actionKey: 'budget',
  },
  {
    id: 'step-document',
    title: 'Upload a Statement for OCR',
    description: 'Import bank or broker PDFs for automated extraction.',
    whyItMatters: 'Saves time by automatically extracting and reconciling transactions.',
    completed: false,
    actionLabel: 'Upload File',
    actionKey: 'document',
  },
];

interface OnboardingChecklistProps {
  onTriggerAction: (actionKey: OnboardingStep['actionKey']) => void;
}

export function OnboardingChecklist({ onTriggerAction }: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>(DEFAULT_STEPS);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>('step-investment');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('wealthos_onboarding_dismissed');
      if (stored === 'true') {
        setIsDismissed(true);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('wealthos_onboarding_dismissed', 'true');
    } catch (e) {
      // Ignore
    }
  };

  const handleRevisit = () => {
    setIsDismissed(false);
    setIsCollapsed(false);
    try {
      localStorage.removeItem('wealthos_onboarding_dismissed');
    } catch (e) {
      // Ignore
    }
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (isDismissed) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRevisit}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#059669] bg-[#10B981]/10 hover:bg-[#10B981]/20 rounded-xl transition-colors border border-[#10B981]/20"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Onboarding Guide ({completedCount}/{steps.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Getting Started with WealthOS
              </h3>
              <Badge variant="positive" size="sm">
                {completedCount} of {steps.length} Complete ({progressPercent}%)
              </Badge>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Complete these steps to unlock full multi-account wealth intelligence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-7 h-7 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center"
            aria-label={isCollapsed ? 'Expand checklist' : 'Collapse checklist'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center"
            title="Dismiss checklist"
            aria-label="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-[#10B981] h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step items */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {steps.map((step) => {
            const isSelected = activeStepId === step.id;
            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  step.completed
                    ? 'bg-[#F8FAFC] border-[#E2E8F0]/80 text-[#64748B]'
                    : isSelected
                    ? 'bg-white border-[#10B981] shadow-xs ring-1 ring-[#10B981]/20'
                    : 'bg-white border-[#E2E8F0] hover:border-[#10B981]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        step.completed ? 'text-[#64748B] line-through' : 'text-[#0F172A]'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#64748B] mt-1.5 line-clamp-2">
                  {step.description}
                </p>

                {/* Why it matters note */}
                <div className="mt-2 text-[10px] text-[#059669] bg-[#10B981]/5 px-2 py-1 rounded-md">
                  <span className="font-semibold">Why: </span>
                  <span>{step.whyItMatters}</span>
                </div>

                <div className="mt-3 pt-2 border-t border-[#E2E8F0]/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSteps((prev) =>
                        prev.map((s) => (s.id === step.id ? { ...s, completed: !s.completed } : s))
                      );
                    }}
                    className="text-[10px] text-[#64748B] hover:text-[#0F172A] underline"
                  >
                    {step.completed ? 'Mark incomplete' : 'Mark done'}
                  </button>

                  <Button
                    variant={step.completed ? 'ghost' : 'secondary'}
                    size="sm"
                    onClick={() => onTriggerAction(step.actionKey)}
                    className="gap-1 text-[11px] py-1 px-2.5 h-auto"
                  >
                    <span>{step.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
