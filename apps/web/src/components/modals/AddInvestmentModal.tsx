'use client';

import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Check,
  ChevronRight,
  ChevronLeft,
  Coins,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InfoTooltip } from '../ui/InfoTooltip';

export interface NewInvestmentData {
  schemeName: string;
  folioNumber: string;
  category: string;
  units: number;
  nav: number;
  investedValue: number;
  type: 'BUY' | 'SIP';
}

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvestmentAdded?: (inv: NewInvestmentData) => void;
}

const POPULAR_SCHEMES = [
  { name: 'Parag Parikh Flexi Cap Fund - Direct Growth', category: 'Flexi Cap Fund' },
  { name: 'Mirae Asset Large & Midcap Fund - Direct', category: 'Large & Mid Cap' },
  { name: 'Quant Small Cap Fund - Direct Growth', category: 'Small Cap Fund' },
  { name: 'HDFC Nifty 50 Index Fund - Direct Plan', category: 'Index Fund' },
  { name: 'SBI Sovereign Gold Bond Scheme 2026', category: 'Gold / SGB' },
];

export function AddInvestmentModal({
  isOpen,
  onClose,
  onInvestmentAdded,
}: AddInvestmentModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [schemeName, setSchemeName] = useState(POPULAR_SCHEMES[0].name);
  const [category, setCategory] = useState(POPULAR_SCHEMES[0].category);
  const [folioNumber, setFolioNumber] = useState('');
  const [units, setUnits] = useState('');
  const [nav, setNav] = useState('');
  const [investType, setInvestType] = useState<'BUY' | 'SIP'>('BUY');
  const [fees, setFees] = useState('0.00');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const parsedUnits = parseFloat(units) || 0;
  const parsedNav = parseFloat(nav) || 0;
  const parsedFees = parseFloat(fees) || 0;
  const totalInvested = parsedUnits * parsedNav + parsedFees;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!schemeName.trim()) errs.schemeName = 'Please enter or select a scheme name';
    if (!folioNumber.trim()) errs.folioNumber = 'Please enter folio or holding account number';
    if (parsedUnits <= 0) errs.units = 'Units must be greater than 0';
    if (parsedNav <= 0) errs.nav = 'Purchase price / NAV must be greater than 0';
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
      const newInv: NewInvestmentData = {
        schemeName,
        folioNumber: `FOL-${folioNumber.trim()}`,
        category,
        units: parsedUnits,
        nav: parsedNav,
        investedValue: totalInvested,
        type: investType,
      };

      if (onInvestmentAdded) {
        onInvestmentAdded(newInv);
      }

      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStep(1);
        setUnits('');
        setNav('');
        setFolioNumber('');
        onClose();
      }, 1000);
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-investment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 id="add-investment-title" className="text-sm font-bold text-[#0F172A]">
                Record Investment Holding
              </h3>
              <p className="text-[11px] text-[#64748B]">
                {step === 1 ? 'Folio & Purchase Details' : 'Verify Allocation & Cost Basis'}
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {success && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#10B981]/15 text-[#10B981] mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0F172A]">Investment Added!</h4>
              <p className="text-xs text-[#64748B]">
                Portfolio cost basis updated with automated daily NAV tracking.
              </p>
            </div>
          )}

          {!success && step === 1 && (
            <div className="space-y-4">
              {/* Transaction Type: Lump Sum vs SIP */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-xl">
                <button
                  type="button"
                  onClick={() => setInvestType('BUY')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    investType === 'BUY'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <span>Lump Sum Purchase</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvestType('SIP')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    investType === 'SIP'
                      ? 'bg-white text-[#10B981] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <span>SIP Installment</span>
                </button>
              </div>

              {/* Scheme / Asset Name */}
              <div>
                <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                  Scheme / Asset Name
                </label>
                <input
                  type="text"
                  value={schemeName}
                  onChange={(e) => {
                    setSchemeName(e.target.value);
                    if (errors.schemeName) setErrors((prev) => ({ ...prev, schemeName: '' }));
                  }}
                  placeholder="e.g. Parag Parikh Flexi Cap Fund"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
                {/* Popular chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {POPULAR_SCHEMES.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        setSchemeName(s.name);
                        setCategory(s.category);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] truncate max-w-[200px]"
                    >
                      {s.name.split(' - ')[0]}
                    </button>
                  ))}
                </div>
                {errors.schemeName && (
                  <p className="text-[11px] text-[#EF4444] mt-1">{errors.schemeName}</p>
                )}
              </div>

              {/* Folio / Account Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                    Folio / Demat Mask
                  </label>
                  <input
                    type="text"
                    value={folioNumber}
                    onChange={(e) => {
                      setFolioNumber(e.target.value);
                      if (errors.folioNumber) setErrors((prev) => ({ ...prev, folioNumber: '' }));
                    }}
                    placeholder="e.g. 98402"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  {errors.folioNumber && (
                    <p className="text-[11px] text-[#EF4444] mt-1">{errors.folioNumber}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Flexi Cap, Large Cap"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              {/* Units & NAV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                    Units Allocated
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={units}
                    onChange={(e) => {
                      setUnits(e.target.value);
                      if (errors.units) setErrors((prev) => ({ ...prev, units: '' }));
                    }}
                    placeholder="e.g. 150.250"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  {errors.units && (
                    <p className="text-[11px] text-[#EF4444] mt-1">{errors.units}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                    Purchase NAV (₹)
                    <InfoTooltip
                      content="The Net Asset Value price per unit on the allotment date."
                    />
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={nav}
                    onChange={(e) => {
                      setNav(e.target.value);
                      if (errors.nav) setErrors((prev) => ({ ...prev, nav: '' }));
                    }}
                    placeholder="e.g. 78.45"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  {errors.nav && (
                    <p className="text-[11px] text-[#EF4444] mt-1">{errors.nav}</p>
                  )}
                </div>
              </div>

              {/* Date & Calculated Total */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                    Allotment Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                    Total Cost Basis
                    <InfoTooltip termKey="cost-basis" />
                  </label>
                  <div className="px-3 py-2 text-xs font-bold font-mono text-[#10B981] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    ₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!success && step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Holding Allotment Review
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2">
                    <span className="text-[#64748B] block">Scheme:</span>
                    <span className="font-semibold text-[#0F172A]">{schemeName}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Category:</span>
                    <span className="font-semibold text-[#0F172A]">{category}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Folio Number:</span>
                    <span className="font-mono font-semibold text-[#0F172A]">FOL-{folioNumber}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Units:</span>
                    <span className="font-mono font-semibold text-[#0F172A]">
                      {parsedUnits.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Allotment NAV:</span>
                    <span className="font-mono font-semibold text-[#0F172A]">
                      ₹{parsedNav.toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#64748B] block">Total Invested (Cost Basis):</span>
                    <span className="text-base font-mono font-bold text-[#10B981]">
                      ₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
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
                <span>Review Holding</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Confirm & Save Holding'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
