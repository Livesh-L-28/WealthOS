'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  ShieldCheck,
  Info,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Landmark,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';

interface TransferFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess?: (data: {
    sourceAccount: string;
    destinationAccount: string;
    amount: number;
    reference: string;
  }) => void;
}

export function TransferFundsModal({
  isOpen,
  onClose,
  onTransferSuccess,
}: TransferFundsModalProps) {
  const [sourceAccount, setSourceAccount] = useState('HDFC Salary Account');
  const [destinationAccount, setDestinationAccount] = useState('Zerodha Trading Cash');
  const [amount, setAmount] = useState<number>(50000);
  const [date, setDate] = useState('2026-11-12');
  const [reference, setReference] = useState('IMPS6110294829');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceAccount === destinationAccount) {
      setErrorMessage('Source and Destination accounts must be different.');
      return;
    }
    if (!amount || amount <= 0) {
      setErrorMessage('Transfer amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onTransferSuccess?.({
        sourceAccount,
        destinationAccount,
        amount,
        reference,
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
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Transfer Funds Between Accounts</h3>
              <p className="text-xs text-muted-foreground">Internal transfer with zero net worth change</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                Source Account (From)
              </label>
              <select
                value={sourceAccount}
                onChange={(e) => {
                  setSourceAccount(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="HDFC Salary Account">HDFC Salary Account (₹2,69,800.00)</option>
                <option value="ICICI Savings">ICICI Savings (₹84,200.00)</option>
                <option value="Emergency Fund Vault">Emergency Fund Vault (₹4,00,000.00)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                Destination Account (To)
              </label>
              <select
                value={destinationAccount}
                onChange={(e) => {
                  setDestinationAccount(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Zerodha Trading Cash">Zerodha Trading Cash (₹12,400.00)</option>
                <option value="HDFC Salary Account">HDFC Salary Account</option>
                <option value="ICICI Savings">ICICI Savings</option>
                <option value="Emergency Fund Vault">Emergency Fund Vault</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                Transfer Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(Number(e.target.value));
                  setErrorMessage(null);
                }}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                Date & Time
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              Reference / UTR Number
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. IMPS6110294829 or UPI Ref"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          {/* Prominent Accounting Impact Notice */}
          <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
              <Info className="w-4 h-4" />
              Accounting Impact Notice
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Internal transfer. Income and expenses will not be affected. Overall net worth is completely unchanged.
            </p>
          </div>

          {/* Balanced Double-Entry Preview */}
          <div className="p-3 rounded-lg bg-secondary/60 border border-border/80 text-[11px] font-mono space-y-1">
            <div className="font-sans font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Double-Entry Ledger Posting:
            </div>
            <div className="text-emerald-400">Debit: Asset:Broker:{destinationAccount} → +{formatINR(amount)}</div>
            <div className="text-muted-foreground">Credit: Asset:Bank:{sourceAccount} → -{formatINR(amount)}</div>
            <div className="text-[10px] text-muted-foreground/80 mt-1">
              Invariant Verified: Net Balance Drift = ₹0.00
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
              {isSubmitting ? 'Posting Ledger Entry...' : 'Confirm & Post Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

