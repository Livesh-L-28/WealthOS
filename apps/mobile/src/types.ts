export type TabType = 'overview' | 'accounts' | 'investments' | 'budgets' | 'copilot';

export type DashboardPeriod = '1M' | '3M' | 'YTD' | 'ALL';

export interface BankAccount {
  id: string;
  name: string;
  institution: string;
  accountNumberMask: string;
  type: 'SAVINGS' | 'CURRENT' | 'TERM_DEPOSIT' | 'DEMAT' | 'CREDIT_CARD' | 'LOAN';
  category: 'ASSET' | 'LIABILITY';
  balance: number;
  interestRate?: number;
  currency: string;
  status: 'ACTIVE' | 'SYNCED' | 'NEEDS_RECONNECT';
  lastSynced: string;
}

export interface Transaction {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  accountName: string;
  date: string;
  status: 'SETTLED' | 'PENDING' | 'RECONCILED';
}

export interface InvestmentHolding {
  id: string;
  symbol: string;
  name: string;
  type: 'EQUITY' | 'MUTUAL_FUND' | 'GOLD' | 'FIXED_INCOME';
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  fifoLotAge: string;
}

export interface BudgetEnvelope {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
  color: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetYear: number;
  category: string;
  monthlySavingsTarget?: number;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  metrics?: { label: string; value: string }[];
}

export interface LedgerReconciliation {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  variance: number;
  syncedInstitutionsCount: number;
  totalInstitutionsCount: number;
  auditHash: string;
  lastChecked: string;
}
