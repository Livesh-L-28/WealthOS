'use client';

import React from 'react';
import { X, SlidersHorizontal, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DashboardCardConfig {
  id: string;
  label: string;
  description: string;
  visible: boolean;
}

interface CustomizeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: DashboardCardConfig[];
  onToggleCard: (id: string) => void;
  onResetDefaults: () => void;
}

export function CustomizeDashboardModal({
  isOpen,
  onClose,
  cards,
  onToggleCard,
  onResetDefaults,
}: CustomizeDashboardModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 id="customize-title" className="text-sm font-bold text-[#0F172A]">
                Customize Dashboard View
              </h3>
              <p className="text-[11px] text-[#64748B]">Toggle cards to personalize your layout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Toggles List */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1 divide-y divide-[#E2E8F0]/60">
          {cards.map((card) => (
            <div key={card.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-[#0F172A] block">{card.label}</span>
                <span className="text-[11px] text-[#64748B]">{card.description}</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleCard(card.id)}
                className={`p-2 rounded-xl transition ${
                  card.visible
                    ? 'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
                }`}
                title={card.visible ? 'Hide section' : 'Show section'}
                aria-label={card.visible ? `Hide ${card.label}` : `Show ${card.label}`}
              >
                {card.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <button
            type="button"
            onClick={onResetDefaults}
            className="text-xs text-[#64748B] hover:text-[#0F172A] underline"
          >
            Reset to Defaults
          </button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
