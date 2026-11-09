export type TabType = 'overview' | 'accounts' | 'investments' | 'budgets' | 'copilot';

/**
 * WealthOS Mobile 2.0 Modern Fintech Navigation Pillars
 */
export type PillarType = 'home' | 'money' | 'invest' | 'plan' | 'more';

export type HubViewType =
  | 'net-worth'
  | 'reports'
  | 'analytics'
  | 'reconciliation'
  | 'documents'
  | 'household'
  | 'settings'
  | 'transactions'
  | 'goals'
  | 'security'
  | 'search'
  | 'transfers'
  | 'calendar'
  | 'dividends'
  | 'liabilities';

export type ActiveScreen = TabType | HubViewType | PillarType;

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
  journalEntryId?: string;
  notes?: string;
  isRecurring?: boolean;
  isDuplicateFlag?: boolean;
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
  citations?: string[];
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

export interface AmortizationScheduleItem {
  installment: number;
  dueDate: string;
  emi: number;
  principal: number;
  interest: number;
  remaining: number;
  status: 'PAID' | 'DUE' | 'UPCOMING';
}

export interface DiscrepancyItem {
  id: string;
  sourceReference: string;
  accountName: string;
  expectedAmount: number;
  postedAmount: number | null;
  difference: number;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'UNMATCHED' | 'DISCREPANCY' | 'MATCHED';
  reason: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  uploadDate: string;
  status: 'POSTED' | 'RECONCILED' | 'READY_FOR_APPROVAL' | 'QUARANTINED';
  confidence: number;
  journalRef?: string;
  arithmeticCheck: 'VALIDATED' | 'MISMATCH';
}

export interface HouseholdMember {
  id: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  sharedAssets: number;
  sharedLiabilities: number;
  netContributionPercentage: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  hash: string;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  notes?: string;
}

export interface DividendItem {
  id: string;
  symbol: string;
  company: string;
  payoutDate: string;
  amountPerShare: number;
  totalPayout: number;
  status: 'RECEIVED' | 'PROJECTED';
}

export interface UpcomingObligation {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  type: 'EMI' | 'BILL' | 'SIP' | 'SALARY';
  accountName: string;
  isPaid: boolean;
}

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'ACCOUNT' | 'TRANSACTION' | 'INVESTMENT' | 'GOAL' | 'DOCUMENT';
  targetScreen: ActiveScreen;
  amount?: number;
}
