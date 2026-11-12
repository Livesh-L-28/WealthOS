'use client';

import React, { useState } from 'react';
import {
  X,
  Landmark,
  Building,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InfoTooltip } from '../ui/InfoTooltip';

export interface NewAccountData {
  name: string;
  institution: string;
  type: 'SAVINGS' | 'CURRENT' | 'DEMAT' | 'CREDIT_CARD' | 'LOAN';
  mask: string;
  currency: string;
  balance: number;
}

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded?: (account: NewAccountData) => void;
}

const ACCOUNT_TYPES = [
  {
    type: 'SAVINGS' as const,
    label: 'Savings Account',
    description: 'Personal everyday banking & liquid savings',
    icon: Landmark,
  },
  {
    type: 'CURRENT' as const,
    label: 'Current Account',
    description: 'Business or operational transaction account',
    icon: Building,
  },
  {
    type: 'DEMAT' as const,
    label: 'Demat / Trading Account',
    description: 'Equities, mutual funds, and securities holdings',
    icon: TrendingUp,
  },
  {
    type: 'CREDIT_CARD' as const,
    label: 'Credit Card',
    description: 'Revolving line of credit and card balance',
    icon: CreditCard,
  },
  {
    type: 'LOAN' as const,
    label: 'Loan / Mortgage',
    description: 'Fixed term loan, home mortgage, or vehicle debt',
    icon: CreditCard,
  },
];

const POPULAR_INSTITUTIONS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Zerodha',
  'Groww',
  'Kotak Mahindra Bank',
];

export function AddAccountModal({ isOpen, onClose, onAccountAdded }: AddAccountModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountType, setAccountType] = useState<NewAccountData['type']>('SAVINGS');
  const [institution, setInstitution] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [balance, setBalance] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!institution.trim()) errs.institution = 'Please select or enter an institution';
    if (!accountName.trim()) errs.accountName = 'Please enter an account nickname';
    if (!accountNumber.trim()) {
      errs.accountNumber = 'Please enter the last 4 digits of account number';
    } else if (!/^\d{4}$/.test(accountNumber.trim())) {
      errs.accountNumber = 'Must be exactly 4 digits';
    }
    if (!balance.trim() || isNaN(Number(balance))) {
      errs.balance = 'Please enter a valid opening balance (e.g. 50000)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const parsedBalance = Number(balance);
      const isLiability = accountType === 'CREDIT_CARD' || accountType === 'LOAN';
      const finalBalance = isLiability ? -Math.abs(parsedBalance) : Math.abs(parsedBalance);

      const newAccount: NewAccountData = {
        name: accountName,
        institution,
        type: accountType,
        mask: `•••• ${accountNumber}`,
        currency,
        balance: finalBalance,
      };

      if (onAccountAdded) {
        onAccountAdded(newAccount);
      }
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStep(1);
        setAccountName('');
        setInstitution('');
        setAccountNumber('');
        setBalance('');
        onClose();
      }, 1000);
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 id="add-account-title" className="text-sm font-bold text-[#0F172A]">
                Add Financial Account
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Step {step} of 3 &bull;{' '}
                {step === 1 ? 'Select Type' : step === 2 ? 'Account Details' : 'Review & Confirm'}
              </p>
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

        {/* Step Progress Bar */}
        <div className="w-full bg-[#E2E8F0] h-1">
          <div
            className="bg-[#10B981] h-1 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Success state */}
          {success && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#10B981]/15 text-[#10B981] mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0F172A]">Account Connected!</h4>
              <p className="text-xs text-[#64748B]">
                {accountName} ({institution}) is now linked to your general ledger.
              </p>
            </div>
          )}

          {!success && step === 1 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#0F172A] block">
                Choose Account Category
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {ACCOUNT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = accountType === t.type;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setAccountType(t.type)}
                      className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#10B981] bg-[#10B981]/5 ring-1 ring-[#10B981]'
                          : 'border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#10B981]/50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#10B981] text-white'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-[#0F172A] block">
                          {t.label}
                        </span>
                        <span className="text-[11px] text-[#64748B]">{t.description}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#10B981]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!success && step === 2 && (
            <div className="space-y-4">
              {/* Institution Selection */}
              <div>
                <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                  Financial Institution / Bank
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => {
                    setInstitution(e.target.value);
                    if (errors.institution) setErrors((prev) => ({ ...prev, institution: '' }));
                  }}
                  placeholder="e.g. HDFC Bank, Zerodha, ICICI"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
                {/* Popular chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {POPULAR_INSTITUTIONS.slice(0, 5).map((inst) => (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => setInstitution(inst)}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]"
                    >
                      {inst}
                    </button>
                  ))}
                </div>
                {errors.institution && (
                  <p className="text-[11px] text-[#EF4444] mt-1">{errors.institution}</p>
                )}
              </div>

              {/* Account Nickname */}
              <div>
                <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                  Account Nickname
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    if (errors.accountName) setErrors((prev) => ({ ...prev, accountName: '' }));
                  }}
                  placeholder="e.g. Salary Account, Emergency Fund, Trading Demat"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
                {errors.accountName && (
                  <p className="text-[11px] text-[#EF4444] mt-1">{errors.accountName}</p>
                )}
              </div>

              {/* Last 4 digits */}
              <div>
                <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                  Last 4 Digits of Account Number
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, ''));
                    if (errors.accountNumber) setErrors((prev) => ({ ...prev, accountNumber: '' }));
                  }}
                  placeholder="e.g. 4092"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
                {errors.accountNumber && (
                  <p className="text-[11px] text-[#EF4444] mt-1">{errors.accountNumber}</p>
                )}
              </div>

              {/* Opening Balance & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                    Current Balance
                    <InfoTooltip
                      content={
                        accountType === 'CREDIT_CARD' || accountType === 'LOAN'
                          ? 'Enter the current outstanding amount you owe. It will be recorded as a liability.'
                          : 'Enter your current cleared balance.'
                      }
                    />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">
                      {currency === 'INR' ? '₹' : currency}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={balance}
                      onChange={(e) => {
                        setBalance(e.target.value);
                        if (errors.balance) setErrors((prev) => ({ ...prev, balance: '' }));
                      }}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                  {errors.balance && (
                    <p className="text-[11px] text-[#EF4444] mt-1">{errors.balance}</p>
                  )}
                </div>
              </div>

              {/* Security reassurance banner */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2.5 text-[11px] text-[#64748B]">
                <ShieldCheck className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                <span>
                  WealthOS never asks for bank passwords, UPI PINs, or debit card PINs. Read-only ledger tracking.
                </span>
              </div>
            </div>
          )}

          {!success && step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Review Account Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Account Type:</span>
                    <span className="font-semibold text-[#0F172A]">{accountType}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Institution:</span>
                    <span className="font-semibold text-[#0F172A]">{institution}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Account Name:</span>
                    <span className="font-semibold text-[#0F172A]">{accountName}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Masked Identifier:</span>
                    <span className="font-mono font-semibold text-[#0F172A]">•••• {accountNumber}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#64748B] block">Initial Balance:</span>
                    <span className="text-base font-mono font-bold text-[#10B981]">
                      {currency === 'INR' ? '₹' : currency}{' '}
                      {Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {(accountType === 'CREDIT_CARD' || accountType === 'LOAN') && (
                      <span className="text-[10px] text-[#EF4444] block mt-0.5">
                        Recorded as Liability (Owed)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#64748B]">
                By clicking <strong>Confirm & Link Account</strong>, an opening general journal entry will be created in your workspace ledger.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!success && (
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            {step > 1 ? (
              <Button variant="outline" size="sm" onClick={handleBack} className="gap-1">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}

            {step < 3 ? (
              <Button variant="primary" size="sm" onClick={handleNext} className="gap-1">
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="gap-1"
              >
                {isSubmitting ? 'Linking...' : 'Confirm & Link Account'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
