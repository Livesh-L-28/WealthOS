'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters';

export interface AddSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId?: string;
  goalTitle?: string;
  targetAmount?: number;
  currentAmount?: number;
  onDepositSuccess?: (goalId: string, amount: number, accountName: string) => void;
}

const CONNECTED_FUNDING_ACCOUNTS = [
  { id: 'acc-1', name: 'HDFC Corporate Salary', balance: 482450.0, mask: '•••• 4921' },
  { id: 'acc-2', name: 'ICICI Privileged Savings', balance: 845200.0, mask: '•••• 8192' },
  { id: 'acc-3', name: 'SBI Tax Saver Term Deposit', balance: 1500000.0, mask: '•••• 1042' },
];

export function AddSavingsModal({
  isOpen,
  onClose,
  goalId = 'g-bike',
  goalTitle = 'Bike',
  targetAmount = 2345678,
  currentAmount = 1876543,
  onDepositSuccess,
}: AddSavingsModalProps) {
  const [amount, setAmount] = useState('25000');
  const [selectedAccount, setSelectedAccount] = useState('HDFC Corporate Salary');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const depositNum = parseFloat(amount) || 0;
  const newBalance = currentAmount + depositNum;
  const newProgress = targetAmount > 0 ? Math.min(100, (newBalance / targetAmount) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositNum <= 0) return;

    setIsSubmitting(true);
    // Simulate instantaneous double-entry settlement
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMsg(`₹${depositNum.toLocaleString('en-IN')} deposited to "${goalTitle}" successfully!`);
      if (onDepositSuccess) {
        onDepositSuccess(goalId, depositNum, selectedAccount);
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E7ECE8] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E7ECE8] flex items-center justify-between bg-[#FAFCFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F5EE] text-[#087A50] flex items-center justify-center font-bold">
              💰
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17231D] tracking-tight">Add Savings to Goal</h3>
              <p className="text-xs text-[#758078]">Direct-post savings to {goalTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#758078] hover:text-[#17231D] hover:bg-[#F0F4F1] flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        {successMsg ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#E8F5EE] text-[#087A50] flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <h4 className="text-base font-bold text-[#17231D]">Deposit Reconciled</h4>
            <p className="text-xs text-[#758078]">{successMsg}</p>
            <Badge variant="positive" size="sm">
              <ShieldCheck className="w-3 h-3 mr-1 inline" />
              Journal Entry Posted & Verified
            </Badge>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Goal Progress Preview */}
            <div className="bg-[#F7F9F7] border border-[#E7ECE8] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#17231D]">{goalTitle}</span>
                <span className="font-mono font-bold text-[#087A50]">
                  {newProgress.toFixed(1)}% Completed
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#E7ECE8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#16A36A] to-[#087A50] transition-all duration-300"
                  style={{ width: `${newProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#758078]">
                <span>Current: {formatCurrency(currentAmount)}</span>
                <ArrowRight className="w-3 h-3 text-[#16A36A]" />
                <span className="font-bold text-[#17231D]">New: {formatCurrency(newBalance)}</span>
              </div>
            </div>

            {/* Deposit Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-[#17231D] mb-1.5">
                Deposit Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#758078]">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-[#E7ECE8] rounded-xl text-sm font-bold text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#16A36A] tabular-nums"
                  required
                />
              </div>
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 mt-2">
                {['10000', '25000', '50000', '100000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                      amount === preset
                        ? 'bg-[#E8F5EE] border-[#16A36A] text-[#087A50]'
                        : 'bg-white border-[#E7ECE8] text-[#505D54] hover:bg-[#F0F4F1]'
                    }`}
                  >
                    +₹{parseInt(preset).toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Funding Account Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#17231D] mb-1.5">
                Source Funding Account
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E7ECE8] rounded-xl text-xs font-semibold text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
              >
                {CONNECTED_FUNDING_ACCOUNTS.map((acc) => (
                  <option key={acc.id} value={acc.name}>
                    {acc.name} ({acc.mask}) — Balance: ₹{acc.balance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {/* Accounting Traceability Note */}
            <div className="p-3 bg-[#FAFCFA] border border-[#E7ECE8] rounded-xl flex items-center gap-2.5 text-[11px] text-[#758078]">
              <ShieldCheck className="w-4 h-4 text-[#16A36A] shrink-0" />
              <span>
                Double-entry settlement automatically debits funding account and credits strategic goal reserve.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Confirm Deposit</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

