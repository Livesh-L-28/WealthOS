'use client';

import React, { useState } from 'react';
import {
  X,
  DollarSign,
  ShieldCheck,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';

interface RecordIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncomePosted?: (data: {
    grossSalary: number;
    tds: number;
    epf: number;
    professionalTax: number;
    netCredit: number;
    account: string;
  }) => void;
}

export function RecordIncomeModal({
  isOpen,
  onClose,
  onIncomePosted,
}: RecordIncomeModalProps) {
  const [date, setDate] = useState('2026-11-01');
  const [account, setAccount] = useState('HDFC Salary Account');
  const [category, setCategory] = useState('Income:Salary:Base Pay');
  const [grossSalary, setGrossSalary] = useState<number>(350000);
  const [tds, setTds] = useState<number>(62000);
  const [epf, setEpf] = useState<number>(18000);
  const [professionalTax, setProfessionalTax] = useState<number>(200);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalDeductions = tds + epf + professionalTax;
  const netCredit = Math.max(0, grossSalary - totalDeductions);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onIncomePosted?.({
        grossSalary,
        tds,
        epf,
        professionalTax,
        netCredit,
        account,
      });
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Record Salary Credit & Tax Splits</h3>
              <p className="text-xs text-muted-foreground">Double-entry accounting with TDS, EPF, and Net take-home</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                Deposited Account
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="HDFC Salary Account">HDFC Salary Account (•••• 4892)</option>
                <option value="ICICI Savings">ICICI Savings (•••• 7812)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              Gross Monthly Salary (₹)
            </label>
            <input
              type="number"
              min="0"
              value={grossSalary}
              onChange={(e) => setGrossSalary(Number(e.target.value))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold text-sm"
            />
          </div>

          {/* Deductions Breakdown */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2.5">
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">
              Statutory & Tax Deductions
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">TDS Paid (Sec 192)</label>
                <input
                  type="number"
                  min="0"
                  value={tds}
                  onChange={(e) => setTds(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-foreground font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">EPF Contribution</label>
                <input
                  type="number"
                  min="0"
                  value={epf}
                  onChange={(e) => setEpf(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-foreground font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Professional Tax</label>
                <input
                  type="number"
                  min="0"
                  value={professionalTax}
                  onChange={(e) => setProfessionalTax(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-foreground font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">Net Bank Take-Home Credit:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatINR(netCredit)}
              </span>
            </div>
          </div>

          {/* Balanced Double-Entry Preview */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[11px] font-mono space-y-1">
            <div className="font-sans font-semibold text-primary mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified 5-Line Journal Posting:
            </div>
            <div className="text-emerald-400">Debit: Asset:Bank:{account} → {formatINR(netCredit)}</div>
            <div className="text-muted-foreground">Debit: Expense:Tax:TDS_Paid → {formatINR(tds)}</div>
            <div className="text-muted-foreground">Debit: Asset:Retirement:EPF → {formatINR(epf)}</div>
            <div className="text-muted-foreground">Debit: Expense:Taxes:Prof_Tax → {formatINR(professionalTax)}</div>
            <div className="text-foreground font-semibold">Credit: Income:Salary:Base_Pay → {formatINR(grossSalary)}</div>
            <div className="text-[10px] text-emerald-400 pt-0.5">
              ΣDebit ({formatINR(grossSalary)}) ≡ ΣCredit ({formatINR(grossSalary)})
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Posting Balanced Entry...' : 'Post Salary Credit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
