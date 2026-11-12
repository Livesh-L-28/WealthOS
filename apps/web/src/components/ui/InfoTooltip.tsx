'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, X } from 'lucide-react';

export interface FinancialTermDefinition {
  term: string;
  simpleExplanation: string;
  example?: string;
  detailUrl?: string;
}

export const FINANCIAL_DICTIONARY: Record<string, FinancialTermDefinition> = {
  'net-worth': {
    term: 'Net Worth',
    simpleExplanation: 'What you own minus what you owe. The single most comprehensive measure of your financial health.',
    example: 'If your assets are ₹50L and your loans are ₹10L, your net worth is ₹40L.',
  },
  assets: {
    term: 'Assets',
    simpleExplanation: 'Everything you own that has financial value: cash in bank accounts, stocks, mutual funds, gold, and properties.',
  },
  liabilities: {
    term: 'Liabilities',
    simpleExplanation: 'All money you owe to others: credit card balances, home loans, vehicle loans, and personal debts.',
  },
  portfolio: {
    term: 'Portfolio',
    simpleExplanation: 'Your entire collection of investments held across stocks, mutual funds, bonds, and deposits.',
  },
  'cost-basis': {
    term: 'Cost Basis',
    simpleExplanation: 'The original purchase amount invested in an asset, including transaction fees and commissions.',
    example: 'Buying 100 shares at ₹500 gives a cost basis of ₹50,000.',
  },
  'realized-profit': {
    term: 'Realized Profit',
    simpleExplanation: 'Actual money locked in or lost after selling an investment. Tax calculations apply to realized gains.',
  },
  'unrealized-profit': {
    term: 'Unrealized Profit',
    simpleExplanation: 'Paper profit or loss from investments you currently hold based on live market prices. It changes daily until sold.',
  },
  'cash-flow': {
    term: 'Cash Flow',
    simpleExplanation: 'The continuous movement of money into your accounts (income) and out of your accounts (expenses).',
  },
  'asset-allocation': {
    term: 'Asset Allocation',
    simpleExplanation: 'How your total wealth is split across different asset classes like Equities, Debt, Cash, and Gold to manage risk.',
  },
  'expense-ratio': {
    term: 'Expense Ratio',
    simpleExplanation: 'The annual percentage fee charged by an asset management company (AMC) to run and administer a mutual fund scheme.',
    example: 'A 0.5% expense ratio means ₹500/year for every ₹1,00,000 invested.',
  },
  cagr: {
    term: 'CAGR (Compound Annual Growth Rate)',
    simpleExplanation: 'The constant annualized rate at which an investment grows from start to finish over multiple years.',
  },
  xirr: {
    term: 'XIRR (Extended Internal Rate of Return)',
    simpleExplanation: 'The accurate annualized return rate for irregular cashflows and SIP investments with multiple purchase dates.',
  },
  diversification: {
    term: 'Diversification',
    simpleExplanation: 'Spreading investments across different assets and sectors to reduce the risk of a single loss hurting your total wealth.',
  },
  'solvency-ratio': {
    term: 'Solvency Ratio',
    simpleExplanation: 'Ratio of total assets to total debt. Above 2.0x indicates solid long-term resilience against financial shocks.',
  },
  'cash-balance': {
    term: 'Cash Balance',
    simpleExplanation: 'Liquid money in depository savings and checking accounts available for immediate withdrawal or spending.',
    example: 'Money in your HDFC savings account is part of your cash balance.',
  },
  'market-value': {
    term: 'Investment Market Value',
    simpleExplanation: 'Current estimated worth of your investment holdings calculated as Quantity multiplied by the latest Market Price.',
    example: '10 shares at ₹2,000 live price gives a market value of ₹20,000.',
  },
  'realized-gain': {
    term: 'Realized Gain',
    simpleExplanation: 'Actual locked-in profit after selling an asset (Sale Proceeds minus FIFO Cost Basis). Subject to capital gains taxation.',
  },
  'unrealized-gain': {
    term: 'Unrealized Gain',
    simpleExplanation: 'Paper profit or loss on securities you still own, reflecting the difference between Market Value and Cost Basis.',
  },
  'expected-income': {
    term: 'Expected Income',
    simpleExplanation: 'Projected or declared incoming funds (such as upcoming salary or announced dividends) that have not yet credited to your account.',
  },
  'actual-income': {
    term: 'Actual Income',
    simpleExplanation: 'Cash that has cleared and deposited into your accounts, verified and posted on the double-entry general ledger.',
  },
};

interface InfoTooltipProps {
  termKey?: keyof typeof FINANCIAL_DICTIONARY;
  title?: string;
  content?: string;
  example?: string;
  iconSize?: 'sm' | 'md';
  className?: string;
}

export function InfoTooltip({
  termKey,
  title,
  content,
  example,
  iconSize = 'sm',
  className = '',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lookup = termKey ? FINANCIAL_DICTIONARY[termKey] : undefined;
  const displayTitle = title || lookup?.term || 'Financial Term';
  const displayContent = content || lookup?.simpleExplanation || '';
  const displayExample = example || lookup?.example;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sizeClasses = iconSize === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ml-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        aria-label={`Explain ${displayTitle}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="text-[#475569] hover:text-[#10B981] focus:text-[#10B981] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] rounded-full p-0.5 transition-colors"
      >
        <HelpCircle className={sizeClasses} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={displayTitle}
          onMouseLeave={() => setIsOpen(false)}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[90vw] p-3.5 bg-white text-[#0F172A] text-xs rounded-xl shadow-xl border border-[#E2E8F0] z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]/60 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#10B981]">
              <Info className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{displayTitle}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#475569] hover:text-[#0F172A] p-0.5 rounded-md"
              aria-label="Close tooltip"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Simple Explanation */}
          <p className="text-[#36423A] leading-relaxed text-[11px] font-normal">
            {displayContent}
          </p>

          {/* Practical Example */}
          {displayExample && (
            <div className="mt-2 pt-2 border-t border-[#E2E8F0]/60 bg-[#F8FAFC] p-2 rounded-lg text-[10px] text-[#475569]">
              <span className="font-semibold text-[#0F172A] block mb-0.5">Example:</span>
              <span>{displayExample}</span>
            </div>
          )}

          {/* Bottom Arrow Indicator */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
        </div>
      )}
    </div>
  );
}
