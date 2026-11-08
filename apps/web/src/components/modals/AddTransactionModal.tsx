'use client';

import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InfoTooltip } from '../ui/InfoTooltip';

export interface NewTransactionData {
  description: string;
  account: string;
  category: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  date: string;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded?: (tx: NewTransactionData) => void;
  accountsList?: string[];
}

const DEFAULT_ACCOUNTS = [
  'Primary Operating Savings',
  'Treasury & Tax Reserve',
  'Equity Portfolio Demat',
  'Corporate Infinite Card',
];

const EXPENSE_CATEGORIES = [
  'Technology & Hosting',
  'Groceries & Dining',
  'Rent & Real Estate',
  'Travel & Mobility',
  'Health & Wellness',
  'Utilities & Bills',
  'Personal & Shopping',
];

const INCOME_CATEGORIES = [
  'Professional Services',
  'Dividend Income',
  'Salary & Bonus',
  'Investment Return',
  'Interest Yield',
];

export function AddTransactionModal({
  isOpen,
  onClose,
  onTransactionAdded,
  accountsList = DEFAULT_ACCOUNTS,
}: AddTransactionModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState(accountsList[0] || 'Primary Operating Savings');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      errs.amount = 'Please enter an amount greater than 0';
    }
    if (!account) errs.account = 'Please select an account';
    if (!category.trim()) errs.category = 'Please choose a category';
    if (!description.trim()) errs.description = 'Please provide a short description or merchant name';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      setStep(2);
    }
  };

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newTx: NewTransactionData = {
        description,
        account,
        category,
        amount: parseFloat(amount),
        type,
        date,
      };

      if (onTransactionAdded) {
        onTransactionAdded(newTx);
      }

      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStep(1);
        setAmount('');
        setDescription('');
        onClose();
      }, 1000);
    }, 400);
  };

  const availableCategories = type === 'DEBIT' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-transaction-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E7ECE8] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7ECE8] flex items-center justify-between bg-[#FAFCFA]">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                type === 'DEBIT' ? 'bg-[#DC5B5B]/10 text-[#DC5B5B]' : 'bg-[#16A36A]/10 text-[#16A36A]'
              }`}
            >
              {type === 'DEBIT' ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 id="add-transaction-title" className="text-sm font-bold text-[#17231D]">
                Record Financial Transaction
              </h3>
              <p className="text-[11px] text-[#717D74]">
                {step === 1 ? 'Enter Details' : 'Review Double-Entry Posting'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#717D74] hover:text-[#17231D] hover:bg-[#F0F4F1] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {success && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#16A36A]/15 text-[#16A36A] mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#17231D]">Transaction Recorded!</h4>
              <p className="text-xs text-[#717D74]">
                Journal entry posted with Σ(Dr - Cr) = 0.0000 balance guarantee.
              </p>
            </div>
          )}

          {!success && step === 1 && (
            <div className="space-y-4">
              {/* Type Switcher: Expense vs Income */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F0F4F1] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setType('DEBIT');
                    setCategory(EXPENSE_CATEGORIES[0]);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    type === 'DEBIT'
                      ? 'bg-white text-[#DC5B5B] shadow-xs'
                      : 'text-[#717D74] hover:text-[#17231D]'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Expense (Outflow)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('CREDIT');
                    setCategory(INCOME_CATEGORIES[0]);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    type === 'CREDIT'
                      ? 'bg-white text-[#16A36A] shadow-xs'
                      : 'text-[#717D74] hover:text-[#17231D]'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Income (Inflow)</span>
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-[#17231D] block mb-1">
                  Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#717D74]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                    }}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 text-base rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                  />
                </div>
                {errors.amount && (
                  <p className="text-[11px] text-[#DC5B5B] mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Account Selection */}
              <div>
                <label className="text-xs font-semibold text-[#17231D] block mb-1">
                  Financial Account
                </label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                >
                  {accountsList.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#17231D]">Category</label>
                  <span className="text-[10px] text-[#717D74]">Click chip to select</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        category === cat
                          ? 'bg-[#16A36A] text-white shadow-xs'
                          : 'bg-[#F0F4F1] text-[#717D74] hover:text-[#17231D]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#17231D] block mb-1">
                    Description / Merchant
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description)
                        setErrors((prev) => ({ ...prev, description: '' }));
                    }}
                    placeholder="e.g. Swiggy, Netflix, Amazon"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                  />
                  {errors.description && (
                    <p className="text-[11px] text-[#DC5B5B] mt-1">{errors.description}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#17231D] block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                  />
                </div>
              </div>
            </div>
          )}

          {!success && step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17231D] uppercase tracking-wider">
                    Ledger Posting Preview
                  </span>
                  <Badge variant={type === 'DEBIT' ? 'neutral' : 'positive'} size="sm">
                    {type === 'DEBIT' ? 'Expense' : 'Income'}
                  </Badge>
                </div>

                <div className="text-2xl font-bold font-mono text-[#17231D]">
                  {type === 'DEBIT' ? '-' : '+'}₹
                  {parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E7ECE8]">
                  <div>
                    <span className="text-[#717D74] block">Account:</span>
                    <span className="font-semibold text-[#17231D]">{account}</span>
                  </div>
                  <div>
                    <span className="text-[#717D74] block">Category:</span>
                    <span className="font-semibold text-[#17231D]">{category}</span>
                  </div>
                  <div>
                    <span className="text-[#717D74] block">Merchant / Note:</span>
                    <span className="font-semibold text-[#17231D]">{description}</span>
                  </div>
                  <div>
                    <span className="text-[#717D74] block">Transaction Date:</span>
                    <span className="font-semibold text-[#17231D]">{date}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E7ECE8] text-[11px] text-[#717D74] space-y-1">
                  <div className="flex justify-between font-mono">
                    <span>
                      {type === 'DEBIT' ? `Dr. Expense: ${category}` : `Dr. Asset: ${account}`}
                    </span>
                    <span>₹{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>
                      {type === 'DEBIT' ? `Cr. Asset: ${account}` : `Cr. Income: ${category}`}
                    </span>
                    <span>₹{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-[#16A36A] font-semibold text-right pt-0.5">
                    Net Balance = ₹0.00
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 py-4 border-t border-[#E7ECE8] bg-[#FAFCFA] flex items-center justify-between">
            {step === 2 ? (
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}

            {step === 1 ? (
              <Button variant="primary" size="sm" onClick={handleNext} className="gap-1">
                <span>Review Entry</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post to Ledger'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
