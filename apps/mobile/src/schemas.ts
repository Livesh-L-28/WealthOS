/**
 * WealthOS Domain Runtime Schema Validation (Zod).
 *
 * Enforces fail-safe deserialization for all local storage reads and network API payloads.
 * Protects against undefined property crashes, malformed records, and data shape mutations.
 */

import { z } from 'zod';
import {
  BankAccount,
  Transaction,
  InvestmentHolding,
  BudgetEnvelope,
  FinancialGoal,
  DocumentItem,
  CopilotMessage,
} from './types';
import { logger } from './logger';

export const BankAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().default('Unnamed Account'),
  institution: z.string().default('Private Banking'),
  accountNumberMask: z.string().default('••••0000'),
  type: z.enum(['SAVINGS', 'CURRENT', 'TERM_DEPOSIT', 'DEMAT', 'CREDIT_CARD', 'LOAN']).default('SAVINGS'),
  category: z.enum(['ASSET', 'LIABILITY']).default('ASSET'),
  balance: z.number().catch(0),
  interestRate: z.number().optional(),
  currency: z.string().default('INR'),
  status: z.enum(['ACTIVE', 'SYNCED', 'NEEDS_RECONNECT']).default('ACTIVE'),
  lastSynced: z.string().default('Just now'),
});

export const TransactionSchema = z.object({
  id: z.string().min(1),
  title: z.string().default('Transaction'),
  category: z.string().default('General Expense'),
  amount: z.number().positive().catch(0),
  type: z.enum(['CREDIT', 'DEBIT']).default('DEBIT'),
  accountName: z.string().default('Primary Account'),
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  status: z.enum(['SETTLED', 'PENDING', 'RECONCILED']).default('SETTLED'),
  journalEntryId: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  isDuplicateFlag: z.boolean().optional(),
});

export const InvestmentHoldingSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().default('HOLDING'),
  name: z.string().default('Investment Asset'),
  type: z.enum(['EQUITY', 'MUTUAL_FUND', 'GOLD', 'FIXED_INCOME']).default('EQUITY'),
  quantity: z.number().nonnegative().catch(0),
  avgBuyPrice: z.number().nonnegative().catch(0),
  currentPrice: z.number().nonnegative().catch(0),
  investedValue: z.number().nonnegative().catch(0),
  currentValue: z.number().nonnegative().catch(0),
  pnl: z.number().catch(0),
  pnlPercentage: z.number().catch(0),
  fifoLotAge: z.string().default('< 1 Year'),
});

export const BudgetEnvelopeSchema = z.object({
  id: z.string().min(1),
  category: z.string().default('General'),
  budgeted: z.number().nonnegative().catch(0),
  spent: z.number().nonnegative().catch(0),
  color: z.string().default('#3B82F6'),
});

export const FinancialGoalSchema = z.object({
  id: z.string().min(1),
  title: z.string().default('Financial Goal'),
  targetAmount: z.number().positive().catch(100000),
  currentAmount: z.number().nonnegative().catch(0),
  targetYear: z.number().default(() => new Date().getFullYear() + 5),
  category: z.string().default('Capital Growth'),
  monthlySavingsTarget: z.number().optional(),
});

export const DocumentItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().default('Document'),
  mimeType: z.string().default('application/pdf'),
  size: z.string().default('1.0 MB'),
  uploadDate: z.string().default('Recent'),
  status: z.enum(['POSTED', 'RECONCILED', 'READY_FOR_APPROVAL', 'QUARANTINED']).default('POSTED'),
  confidence: z.number().default(1.0),
  journalRef: z.string().optional(),
  arithmeticCheck: z.enum(['VALIDATED', 'MISMATCH']).default('VALIDATED'),
});

export const CopilotMessageSchema = z.object({
  id: z.string().min(1),
  sender: z.enum(['user', 'copilot']).default('copilot'),
  text: z.string().default(''),
  timestamp: z.string().default('Just now'),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  citations: z.array(z.string()).optional(),
});

/**
 * Safe Array Parsers: Validates and sanitizes arrays of domain items.
 * If an item is malformed, it attempts safe partial recovery or drops only the malformed record,
 * preventing full array deserialization crashes.
 */
export function safeParseAccounts(raw: unknown): BankAccount[] {
  if (!Array.isArray(raw)) return [];
  const valid: BankAccount[] = [];
  for (const item of raw) {
    const parsed = BankAccountSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      logger.warn('Dropped corrupted bank account record:', parsed.error.message);
    }
  }
  return valid;
}

export function safeParseTransactions(raw: unknown): Transaction[] {
  if (!Array.isArray(raw)) return [];
  const valid: Transaction[] = [];
  for (const item of raw) {
    const parsed = TransactionSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      logger.warn('Dropped corrupted transaction record:', parsed.error.message);
    }
  }
  return valid;
}

export function safeParseHoldings(raw: unknown): InvestmentHolding[] {
  if (!Array.isArray(raw)) return [];
  const valid: InvestmentHolding[] = [];
  for (const item of raw) {
    const parsed = InvestmentHoldingSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      logger.warn('Dropped corrupted investment holding record:', parsed.error.message);
    }
  }
  return valid;
}

export function safeParseBudgets(raw: unknown): BudgetEnvelope[] {
  if (!Array.isArray(raw)) return [];
  const valid: BudgetEnvelope[] = [];
  for (const item of raw) {
    const parsed = BudgetEnvelopeSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      logger.warn('Dropped corrupted budget envelope record:', parsed.error.message);
    }
  }
  return valid;
}

export function safeParseGoals(raw: unknown): FinancialGoal[] {
  if (!Array.isArray(raw)) return [];
  const valid: FinancialGoal[] = [];
  for (const item of raw) {
    const parsed = FinancialGoalSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      logger.warn('Dropped corrupted financial goal record:', parsed.error.message);
    }
  }
  return valid;
}

export function safeParseDocuments(raw: unknown): DocumentItem[] {
  if (!Array.isArray(raw)) return [];
  const valid: DocumentItem[] = [];
  for (const item of raw) {
    const parsed = DocumentItemSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      logger.warn('Dropped corrupted document record:', parsed.error.message);
    }
  }
  return valid;
}

export function safeParseCopilotMessages(raw: unknown): CopilotMessage[] {
  if (!Array.isArray(raw)) return [];
  const valid: CopilotMessage[] = [];
  for (const item of raw) {
    const parsed = CopilotMessageSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      logger.warn('Dropped corrupted copilot message record:', parsed.error.message);
    }
  }
  return valid;
}
