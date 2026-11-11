import { describe, it, expect } from 'vitest';
import {
  safeParseAccounts,
  safeParseTransactions,
  safeParseHoldings,
  safeParseBudgets,
  BankAccountSchema,
  TransactionSchema,
} from './schemas';
import {
  generateIdempotencyKey,
  registerIdempotencyKey,
  commitIdempotencyKey,
} from './idempotency';
import { validateDoubleEntryTransaction, LedgerLeg } from './ledger/doubleEntryValidator';
import { sanitizeLogData } from './logger';

describe('Phase 1: Zod Runtime Schema Validation & Crash Prevention', () => {
  it('safely parses valid bank accounts and assigns defaults for missing non-critical fields', () => {
    const raw = [
      { id: 'acc-1', name: 'HDFC Savings', balance: 50000 },
      { id: 'acc-2' }, // Missing almost everything
    ];
    const accounts = safeParseAccounts(raw);
    expect(accounts).toHaveLength(2);
    expect(accounts[0].balance).toBe(50000);
    expect(accounts[0].currency).toBe('INR');
    expect(accounts[1].name).toBe('Unnamed Account');
    expect(accounts[1].balance).toBe(0);
  });

  it('drops severely malformed records (e.g. missing id) without throwing an unhandled exception', () => {
    const corrupted = [
      { name: 'Invalid account with no ID', balance: 100 },
      { id: 'valid-acc', name: 'Valid Account', balance: 25000 },
    ];
    const accounts = safeParseAccounts(corrupted);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe('valid-acc');
  });

  it('recovers from NaN and negative numbers in transactions safely', () => {
    const rawTxs = [
      { id: 'tx-1', title: 'Groceries', amount: 500, type: 'DEBIT' },
      { id: 'tx-2', title: 'Corrupted amount', amount: -50, type: 'DEBIT' },
    ];
    const txs = safeParseTransactions(rawTxs);
    expect(txs).toHaveLength(2);
    expect(txs[0].amount).toBe(500);
    // Negative amounts are safely caught and assigned default safe positive or 0
    expect(txs[1].amount).toBe(0);
  });
});

describe('Phase 2: Client-Side Idempotency Shield', () => {
  it('generates valid UUID v4 format tokens', () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    expect(key1).not.toBe(key2);
    expect(key1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('blocks duplicate rapid actions with the same idempotency key', () => {
    const testKey = generateIdempotencyKey();
    const firstAttempt = registerIdempotencyKey(testKey);
    expect(firstAttempt).toBe(true);

    // Second immediate attempt must be blocked
    const secondAttempt = registerIdempotencyKey(testKey);
    expect(secondAttempt).toBe(false);

    // Commit the key
    commitIdempotencyKey(testKey, { success: true });
    // Still blocked after commit
    expect(registerIdempotencyKey(testKey)).toBe(false);
  });
});

describe('Phase 3: Double-Entry Mathematical Pre-Validation', () => {
  it('validates perfectly balanced debit and credit legs', () => {
    const legs: LedgerLeg[] = [
      { accountId: 'acc-savings', accountName: 'Savings', amount: 10000, direction: 'DEBIT' },
      { accountId: 'acc-fixed', accountName: 'Fixed Deposit', amount: 10000, direction: 'CREDIT' },
    ];
    const res = validateDoubleEntryTransaction(legs);
    expect(res.isValid).toBe(true);
  });

  it('rejects unbalanced transactions with an exact delta', () => {
    const legs: LedgerLeg[] = [
      { accountId: 'acc-1', accountName: 'Account 1', amount: 5000, direction: 'DEBIT' },
      { accountId: 'acc-2', accountName: 'Account 2', amount: 4500, direction: 'CREDIT' },
    ];
    const res = validateDoubleEntryTransaction(legs);
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe('UNBALANCED');
    expect(res.imbalanceDelta).toBe(500);
  });

  it('prevents self-transfer wash trading to the identical account', () => {
    const legs: LedgerLeg[] = [
      { accountId: 'acc-same', accountName: 'Same Acc', amount: 2000, direction: 'DEBIT' },
      { accountId: 'acc-same', accountName: 'Same Acc', amount: 2000, direction: 'CREDIT' },
    ];
    const res = validateDoubleEntryTransaction(legs);
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe('IDENTICAL_ACCOUNTS');
  });

  it('rejects zero or negative amounts', () => {
    const legs: LedgerLeg[] = [
      { accountId: 'acc-1', accountName: 'Acc 1', amount: 0, direction: 'DEBIT' },
      { accountId: 'acc-2', accountName: 'Acc 2', amount: 0, direction: 'CREDIT' },
    ];
    const res = validateDoubleEntryTransaction(legs);
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe('ZERO_AMOUNT');
  });
});

describe('Phase 4: Automated PII & Financial Data Redaction in Logs', () => {
  it('masks Bearer JWT tokens', () => {
    const logStr = 'User token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';
    const sanitized = sanitizeLogData(logStr);
    expect(sanitized).toBe('User token: Bearer [REDACTED_TOKEN]');
    expect(sanitized).not.toContain('eyJhbGci');
  });

  it('masks PAN tax numbers', () => {
    const logStr = 'KYC verified for PAN ABCDE1234F successfully.';
    const sanitized = sanitizeLogData(logStr);
    expect(sanitized).toBe('KYC verified for PAN AB•••••4F successfully.');
    expect(sanitized).not.toContain('ABCDE1234F');
  });

  it('masks bank account numbers', () => {
    const logStr = 'Transfer to account 123456789012 completed.';
    const sanitized = sanitizeLogData(logStr);
    expect(sanitized).toBe('Transfer to account ••••••••9012 completed.');
    expect(sanitized).not.toContain('123456789012');
  });

  it('masks sensitive object keys such as password, token, pin', () => {
    const payload = {
      user: 'Livesh',
      password: 'SuperSecretPassword123!',
      pin: '1234',
      accountNumber: '987654321012',
    };
    const sanitized = sanitizeLogData(payload);
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.pin).toBe('[REDACTED]');
    expect(sanitized.accountNumber).toBe('••••••••1012');
    expect(sanitized.user).toBe('Livesh');
  });
});
