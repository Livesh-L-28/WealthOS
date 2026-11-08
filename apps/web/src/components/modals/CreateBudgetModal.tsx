'use client';

import React, { useState } from 'react';
import {
  X,
  PieChart,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  BellRing,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InfoTooltip } from '../ui/InfoTooltip';

export interface NewBudgetData {
  category: string;
  allocated: number;
  period: string;
  thresholdPercent: number;
}

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetCreated?: (budget: NewBudgetData) => void;
  existingCategories?: string[];
}

const AVAILABLE_CATEGORIES = [
  'Dining & Restaurants',
  'Shopping & Apparel',
  'Entertainment & OTT',
  'Utilities & Bills',
  'Education & Upskilling',
  'Personal Care & Fitness',
  'Home Maintenance',
  'Gifts & Donations',
];

export function CreateBudgetModal({
  isOpen,
  onClose,
  onBudgetCreated,
  existingCategories = [],
}: CreateBudgetModalProps) {
  const [category, setCategory] = useState(AVAILABLE_CATEGORIES[0]);
  const [allocated, setAllocated] = useState('');
  const [threshold, setThreshold] = useState(85);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(allocated) || 0;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!category.trim()) errs.category = 'Please select a spending category';
    if (parsedAmount <= 0) errs.allocated = 'Budget limit must be greater than 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const newBudget: NewBudgetData = {
        category,
        allocated: parsedAmount,
        period: 'Monthly',
        thresholdPercent: threshold,
      };

      if (onBudgetCreated) {
        onBudgetCreated(newBudget);
      }

      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setAllocated('');
        onClose();
      }, 1000);
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-budget-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E7ECE8] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7ECE8] flex items-center justify-between bg-[#FAFCFA]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#6475D8]/10 text-[#6475D8] flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 id="create-budget-title" className="text-sm font-bold text-[#17231D]">
                Create Spending Envelope
              </h3>
              <p className="text-[11px] text-[#717D74]">Set monthly expenditure thresholds</p>
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
        <div className="p-6 space-y-4">
          {success && (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#16A36A]/15 text-[#16A36A] mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#17231D]">Budget Envelope Created!</h4>
              <p className="text-xs text-[#717D74]">
                ₹{parsedAmount.toLocaleString('en-IN')} allocated for {category}.
              </p>
            </div>
          )}

          {!success && (
            <>
              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-[#17231D] block mb-1">
                  Budget Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                >
                  {AVAILABLE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly Spending Limit */}
              <div>
                <label className="text-xs font-semibold text-[#17231D] block mb-1">
                  Monthly Limit (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#717D74]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="500"
                    value={allocated}
                    onChange={(e) => {
                      setAllocated(e.target.value);
                      if (errors.allocated) setErrors((prev) => ({ ...prev, allocated: '' }));
                    }}
                    placeholder="e.g. 15000"
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] font-mono focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                  />
                </div>
                {errors.allocated && (
                  <p className="text-[11px] text-[#DC5B5B] mt-1">{errors.allocated}</p>
                )}
              </div>

              {/* Threshold Slider */}
              <div className="p-3.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#17231D] flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-[#D99A32]" />
                    Warning Alert Threshold
                  </span>
                  <span className="font-mono font-bold text-[#16A36A]">{threshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-[#16A36A]"
                />
                <p className="text-[11px] text-[#717D74]">
                  WealthOS will flag warning alerts when spend crosses ₹
                  {((parsedAmount * threshold) / 100).toLocaleString('en-IN', {
                    maximumFractionDigits: 0,
                  })}
                  .
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 py-4 border-t border-[#E7ECE8] bg-[#FAFCFA] flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Envelope'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
