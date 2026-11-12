'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  ShieldCheck,
  TrendingUp,
  Landmark,
  Calendar,
  CheckCircle2,
  FileText,
  Building,
  Info,
  X,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';

interface DividendVoucher {
  id: string;
  instrument: string;
  ticker: string;
  isin: string;
  paymentDate: string;
  sharesQty: number;
  dividendPerShare: number;
  grossAmount: number;
  tdsWithheld: number;
  netCredited: number;
  accountName: string;
  status: 'RECONCILED' | 'PENDING_BANK';
}

const INITIAL_DIVIDENDS: DividendVoucher[] = [
  {
    id: 'DIV-2026-089',
    instrument: 'Infosys Limited',
    ticker: 'INFY',
    isin: 'INE009A01021',
    paymentDate: '04 Nov 2026',
    sharesQty: 400,
    dividendPerShare: 21.0,
    grossAmount: 8400.0,
    tdsWithheld: 840.0,
    netCredited: 7560.0,
    accountName: 'HDFC Salary Account',
    status: 'RECONCILED',
  },
  {
    id: 'DIV-2026-088',
    instrument: 'Tata Consultancy Services',
    ticker: 'TCS',
    isin: 'INE467B01029',
    paymentDate: '24 Oct 2026',
    sharesQty: 150,
    dividendPerShare: 28.0,
    grossAmount: 4200.0,
    tdsWithheld: 420.0,
    netCredited: 3780.0,
    accountName: 'HDFC Salary Account',
    status: 'RECONCILED',
  },
  {
    id: 'DIV-2026-087',
    instrument: 'ITC Limited',
    ticker: 'ITC',
    isin: 'INE154A01025',
    paymentDate: '15 Sep 2026',
    sharesQty: 1000,
    dividendPerShare: 7.5,
    grossAmount: 7500.0,
    tdsWithheld: 750.0,
    netCredited: 6750.0,
    accountName: 'ICICI Savings',
    status: 'RECONCILED',
  },
  {
    id: 'DIV-2026-086',
    instrument: 'Vedanta Limited',
    ticker: 'VEDL',
    isin: 'INE205A01025',
    paymentDate: '28 Aug 2026',
    sharesQty: 600,
    dividendPerShare: 19.5,
    grossAmount: 11700.0,
    tdsWithheld: 1170.0,
    netCredited: 10530.0,
    accountName: 'HDFC Salary Account',
    status: 'RECONCILED',
  },
  {
    id: 'DIV-2026-085',
    instrument: 'HCL Technologies',
    ticker: 'HCLTECH',
    isin: 'INE860A01027',
    paymentDate: '12 Jul 2026',
    sharesQty: 300,
    dividendPerShare: 18.0,
    grossAmount: 5400.0,
    tdsWithheld: 540.0,
    netCredited: 4860.0,
    accountName: 'HDFC Salary Account',
    status: 'RECONCILED',
  },
];

export default function DividendsPage() {
  const [dividends, setDividends] = useState<DividendVoucher[]>(INITIAL_DIVIDENDS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [instrument, setInstrument] = useState('Infosys Limited (INFY)');
  const [paymentDate, setPaymentDate] = useState('2026-11-12');
  const [sharesQty, setSharesQty] = useState<number>(250);
  const [dps, setDps] = useState<number>(15.0);
  const [accountName, setAccountName] = useState('HDFC Salary Account');

  const grossCalculated = sharesQty * dps;
  const tdsCalculated = Math.round(grossCalculated * 0.1);
  const netCalculated = grossCalculated - tdsCalculated;

  const totalGross = dividends.reduce((sum, d) => sum + d.grossAmount, 0);
  const totalTDS = dividends.reduce((sum, d) => sum + d.tdsWithheld, 0);
  const totalNet = dividends.reduce((sum, d) => sum + d.netCredited, 0);

  const handleRecordDividend = (e: React.FormEvent) => {
    e.preventDefault();
    const newVoucher: DividendVoucher = {
      id: `DIV-${Date.now().toString().slice(-4)}`,
      instrument: instrument.split(' (')[0],
      ticker: instrument.includes('(') ? instrument.split('(')[1].replace(')', '') : 'DIV',
      isin: 'INE' + Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join(''),
      paymentDate: new Date(paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      sharesQty,
      dividendPerShare: dps,
      grossAmount: grossCalculated,
      tdsWithheld: tdsCalculated,
      netCredited: netCalculated,
      accountName,
      status: 'RECONCILED',
    };

    setDividends([newVoucher, ...dividends]);
    setIsModalOpen(false);
    setSuccessToast(`Dividend of ${formatINR(grossCalculated)} recorded with ${formatINR(tdsCalculated)} TDS posted to ledger.`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-primary/20 text-primary border border-primary/30">
              Passive Income
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Section 194 TDS Reconciled
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Dividends & Passive Income Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track gross company distributions, automate 10% TDS withholding, and reconcile net bank deposits with double-entry balance.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Dividend Receipt
        </button>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            Ledger Balanced
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Gross Dividends</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {formatINR(totalGross)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Total distribution from {dividends.length} payouts
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">TDS Withheld (10%)</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {formatINR(totalTDS)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Section 194 Form 26AS Tax Credit
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Net Bank Credits</span>
            <Landmark className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatINR(totalNet)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            100% Reconciled with bank accounts
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Portfolio Yield</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            2.48%
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Annualized trailing passive income
          </p>
        </div>
      </div>

      {/* Dividend Table */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Dividend Declarations & Bank Receipts
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every payout anchors an immutable double-entry journal posting.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {dividends.length} Reconciled Vouchers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 px-3">Company / Scrip</th>
                <th className="py-2.5 px-3">Payment Date</th>
                <th className="py-2.5 px-3 text-right">Holdings</th>
                <th className="py-2.5 px-3 text-right">DPS (₹)</th>
                <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                <th className="py-2.5 px-3 text-right">TDS (10%)</th>
                <th className="py-2.5 px-3 text-right">Net Credited</th>
                <th className="py-2.5 px-3">Deposited Account</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {dividends.map((row) => (
                <tr key={row.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 px-3 font-sans font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-secondary text-primary">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div>{row.instrument}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{row.ticker} • {row.isin}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    {row.paymentDate}
                  </td>
                  <td className="py-3 px-3 text-right text-foreground">
                    {row.sharesQty} shares
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground">
                    ₹{row.dividendPerShare.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-foreground">
                    {formatINR(row.grossAmount)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-400">
                    -{formatINR(row.tdsWithheld)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-400">
                    {formatINR(row.netCredited)}
                  </td>
                  <td className="py-3 px-3 font-sans text-muted-foreground">
                    {row.accountName}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-sans font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Reconciled
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Dividend Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Record Dividend Receipt</h3>
                <p className="text-xs text-muted-foreground">Post dividend distribution and balance ledger with bank receipt</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDividend} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Instrument / Company
                </label>
                <select
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Infosys Limited (INFY)">Infosys Limited (INFY) — IT Services</option>
                  <option value="Tata Consultancy Services (TCS)">Tata Consultancy Services (TCS)</option>
                  <option value="HDFC Bank Limited (HDFCBANK)">HDFC Bank Limited (HDFCBANK)</option>
                  <option value="ITC Limited (ITC)">ITC Limited (ITC) — FMCG</option>
                  <option value="Vedanta Limited (VEDL)">Vedanta Limited (VEDL) — Metals & Mining</option>
                  <option value="Reliance Industries (RELIANCE)">Reliance Industries (RELIANCE)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Credit Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Holding Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sharesQty}
                    onChange={(e) => setSharesQty(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Dividend Per Share (₹)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={dps}
                    onChange={(e) => setDps(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Deposited Bank Account
                  </label>
                  <select
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="HDFC Salary Account">HDFC Salary Account (•••• 4892)</option>
                    <option value="ICICI Savings">ICICI Savings (•••• 7812)</option>
                    <option value="Zerodha Trading Cash">Zerodha Trading Cash</option>
                  </select>
                </div>
              </div>

              {/* Arithmetic Calculation Card */}
              <div className="p-3.5 rounded-lg bg-secondary/60 border border-border space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Gross Dividend ({sharesQty} × ₹{dps.toFixed(2)}):</span>
                  <span className="font-mono font-semibold text-foreground">{formatINR(grossCalculated)}</span>
                </div>
                <div className="flex items-center justify-between text-amber-400">
                  <span>TDS Withheld (10% Sec 194):</span>
                  <span className="font-mono font-semibold">-{formatINR(tdsCalculated)}</span>
                </div>
                <div className="h-px bg-border/80 my-1" />
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>Net Credited to {accountName}:</span>
                  <span className="font-mono text-emerald-400 text-sm">{formatINR(netCalculated)}</span>
                </div>
              </div>

              {/* Double-Entry Ledger Preview */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[11px] font-mono space-y-1">
                <div className="font-sans font-semibold text-primary mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Journal Invariant: ΣDebit ≡ ΣCredit
                </div>
                <div className="text-muted-foreground">Debit: Asset:Bank:{accountName} → {formatINR(netCalculated)}</div>
                <div className="text-muted-foreground">Debit: Asset:Tax:TDS_Receivable → {formatINR(tdsCalculated)}</div>
                <div className="text-muted-foreground">Credit: Income:Dividends:Equities → {formatINR(grossCalculated)}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 shadow-sm"
                >
                  Post Dividend to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
