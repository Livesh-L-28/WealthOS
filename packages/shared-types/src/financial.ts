/**
 * Core Financial Enums & Constants
 */

export enum AccountClassification {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum AccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
  CREDIT_CARD = 'CREDIT_CARD',
  INVESTMENT_BROKER = 'INVESTMENT_BROKER',
  WALLET = 'WALLET',
  CASH = 'CASH',
  TERM_LOAN = 'TERM_LOAN',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  RECONCILED = 'RECONCILED',
  VOIDED = 'VOIDED',
}

export enum AssetClass {
  EQUITY = 'EQUITY',
  MUTUAL_FUND = 'MUTUAL_FUND',
  COMMODITY = 'COMMODITY',
  BOND = 'BOND',
  REAL_ESTATE = 'REAL_ESTATE',
  RETIREMENT = 'RETIREMENT',
  ALTERNATIVE = 'ALTERNATIVE',
}

export enum BaseCurrency {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  AED = 'AED',
  SGD = 'SGD',
}

export interface MoneyAmount {
  amount: string; // Stored as Decimal string to eliminate floating-point drift
  currency: string;
}
