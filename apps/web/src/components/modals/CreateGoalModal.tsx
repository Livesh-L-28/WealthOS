'use client';

import React, { useState } from 'react';
import {
  X,
  Target,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InfoTooltip } from '../ui/InfoTooltip';

export interface NewGoalData {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  currency: string;
}

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated?: (goal: NewGoalData) => void;
}

const GOAL_TEMPLATES = [
  { name: 'Emergency Runway (6 Months)', defaultTarget: '900000' },
  { name: 'Commercial Property Down Payment', defaultTarget: '2500000' },
  { name: 'International Travel & Sabbatical', defaultTarget: '500000' },
  { name: 'Electric Vehicle Purchase', defaultTarget: '1500000' },
];

export function CreateGoalModal({
  isOpen,
  onClose,
  onGoalCreated,
}: CreateGoalModalProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('2028-12-31');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const parsedTarget = parseFloat(targetAmount) || 0;
  const parsedCurrent = parseFloat(currentAmount) || 0;

  // Calculate remaining months and required monthly savings
  const now = new Date();
  const targetDateObj = new Date(targetDate);
  const diffMonths = Math.max(
    1,
    (targetDateObj.getFullYear() - now.getFullYear()) * 12 +
      (targetDateObj.getMonth() - now.getMonth())
  );
  const remainingToSave = Math.max(0, parsedTarget - parsedCurrent);
  const requiredMonthly = remainingToSave / diffMonths;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Please give your goal a title';
    if (parsedTarget <= 0) errs.targetAmount = 'Target amount must be greater than 0';
    if (parsedCurrent < 0) errs.currentAmount = 'Current saved amount cannot be negative';
    if (parsedCurrent > parsedTarget) {
      errs.currentAmount = 'Current savings cannot exceed the target';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const newGoal: NewGoalData = {
        name,
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        targetDate,
        monthlyContribution: requiredMonthly,
        currency: 'INR',
      };

      if (onGoalCreated) {
        onGoalCreated(newGoal);
      }

      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setName('');
        setTargetAmount('');
        setCurrentAmount('0');
        onClose();
      }, 1000);
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-goal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E7ECE8] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7ECE8] flex items-center justify-between bg-[#FAFCFA]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#16A36A]/10 text-[#16A36A] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 id="create-goal-title" className="text-sm font-bold text-[#17231D]">
                Create Financial Goal
              </h3>
              <p className="text-[11px] text-[#717D74]">Plan and track wealth milestones</p>
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
              <h4 className="text-base font-bold text-[#17231D]">Financial Goal Active!</h4>
              <p className="text-xs text-[#717D74]">
                Target ₹{parsedTarget.toLocaleString('en-IN')} by {targetDate}.
              </p>
            </div>
          )}

          {!success && (
            <>
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-[#17231D] block mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. Dream Home Down Payment"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                />
                {/* Templates */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {GOAL_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      type="button"
                      onClick={() => {
                        setName(tmpl.name);
                        setTargetAmount(tmpl.defaultTarget);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-[#F0F4F1] text-[#717D74] hover:text-[#17231D] hover:bg-[#E7ECE8]"
                    >
                      {tmpl.name.split(' (')[0]}
                    </button>
                  ))}
                </div>
                {errors.name && (
                  <p className="text-[11px] text-[#DC5B5B] mt-1">{errors.name}</p>
                )}
              </div>

              {/* Target & Current Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#17231D] block mb-1">
                    Target Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={targetAmount}
                    onChange={(e) => {
                      setTargetAmount(e.target.value);
                      if (errors.targetAmount) setErrors((prev) => ({ ...prev, targetAmount: '' }));
                    }}
                    placeholder="e.g. 1000000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] font-mono focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                  />
                  {errors.targetAmount && (
                    <p className="text-[11px] text-[#DC5B5B] mt-1">{errors.targetAmount}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#17231D] block mb-1">
                    Already Saved (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={currentAmount}
                    onChange={(e) => {
                      setCurrentAmount(e.target.value);
                      if (errors.currentAmount)
                        setErrors((prev) => ({ ...prev, currentAmount: '' }));
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] font-mono focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                  />
                  {errors.currentAmount && (
                    <p className="text-[11px] text-[#DC5B5B] mt-1">{errors.currentAmount}</p>
                  )}
                </div>
              </div>

              {/* Target Date */}
              <div>
                <label className="text-xs font-semibold text-[#17231D] block mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7ECE8] bg-white text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#16A36A]"
                />
              </div>

              {/* Automatic Trajectory Projection Card */}
              {parsedTarget > 0 && (
                <div className="p-3.5 rounded-xl bg-[#16A36A]/5 border border-[#16A36A]/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#087A50]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Recommended Monthly Contribution:
                    </span>
                    <span className="font-mono text-sm font-bold text-[#16A36A]">
                      ₹
                      {requiredMonthly.toLocaleString('en-IN', {
                        maximumFractionDigits: 0,
                      })}
                      /mo
                    </span>
                  </div>
                  <p className="text-[11px] text-[#717D74]">
                    Saving ₹{Math.round(requiredMonthly).toLocaleString('en-IN')} each month for{' '}
                    {diffMonths} months will hit your goal of ₹
                    {parsedTarget.toLocaleString('en-IN')}.
                  </p>
                </div>
              )}
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
              {isSubmitting ? 'Saving...' : 'Set Financial Goal'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
