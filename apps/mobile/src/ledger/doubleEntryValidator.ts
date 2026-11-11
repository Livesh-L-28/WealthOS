/**
 * WealthOS Client-Side Double-Entry Pre-Flight Validator.
 *
 * Guarantees mathematical equation integrity:
 * \sum \text{Debits} = \sum \text{Credits}
 *
 * Catches imbalance bugs before mutations touch local store or offline queue.
 * Prevents wash-trading, self-transfers to identical accounts, and negative amounts.
 */

export interface LedgerLeg {
  accountId: string;
  accountName: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
}

export interface ValidationResult {
  isValid: boolean;
  errorCode?: 'UNBALANCED' | 'ZERO_AMOUNT' | 'NEGATIVE_AMOUNT' | 'IDENTICAL_ACCOUNTS' | 'INVALID_ACCOUNT';
  errorMessage?: string;
  imbalanceDelta?: number;
}

export function validateDoubleEntryTransaction(legs: LedgerLeg[]): ValidationResult {
  if (!legs || legs.length < 2) {
    return {
      isValid: false,
      errorCode: 'UNBALANCED',
      errorMessage: 'A valid double-entry transaction must contain at least 2 legs (Debit & Credit).',
    };
  }

  let totalDebits = 0;
  let totalCredits = 0;
  const seenAccountIds = new Set<string>();

  for (const leg of legs) {
    if (!leg.accountId || !leg.accountName) {
      return {
        isValid: false,
        errorCode: 'INVALID_ACCOUNT',
        errorMessage: 'All transaction legs must be assigned to a valid account.',
      };
    }

    if (isNaN(leg.amount) || leg.amount === 0) {
      return {
        isValid: false,
        errorCode: 'ZERO_AMOUNT',
        errorMessage: 'Transaction leg amount cannot be zero.',
      };
    }

    if (leg.amount < 0) {
      return {
        isValid: false,
        errorCode: 'NEGATIVE_AMOUNT',
        errorMessage: 'Transaction amounts must be positive (use Debit/Credit to denote direction).',
      };
    }

    if (leg.direction === 'DEBIT') {
      totalDebits += leg.amount;
    } else if (leg.direction === 'CREDIT') {
      totalCredits += leg.amount;
    }

    seenAccountIds.add(leg.accountId);
  }

  // Check for wash trade / self transfer
  if (legs.length === 2 && seenAccountIds.size === 1) {
    return {
      isValid: false,
      errorCode: 'IDENTICAL_ACCOUNTS',
      errorMessage: 'Transfer source and destination accounts cannot be identical.',
    };
  }

  // Floating-point precision safe comparison (to 2 decimal places / cents)
  const delta = Math.abs(totalDebits - totalCredits);
  if (delta > 0.009) {
    return {
      isValid: false,
      errorCode: 'UNBALANCED',
      errorMessage: `General journal imbalance: Debits (₹${totalDebits.toFixed(2)}) do not match Credits (₹${totalCredits.toFixed(2)}).`,
      imbalanceDelta: delta,
    };
  }

  return { isValid: true };
}
