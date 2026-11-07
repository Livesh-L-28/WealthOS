"""WealthOS Accounting Rules, Account Types, and Normal Balances."""

from decimal import Decimal
from enum import StrEnum

from app.domains.accounting.domain.money import quantize_money


class AccountType(StrEnum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class NormalBalance(StrEnum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class JournalStatus(StrEnum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    REVERSED = "REVERSED"


class PeriodStatus(StrEnum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class ReconciliationStatus(StrEnum):
    UNMATCHED = "UNMATCHED"
    MATCHED = "MATCHED"
    PARTIALLY_MATCHED = "PARTIALLY_MATCHED"
    DISCREPANCY = "DISCREPANCY"


DEFAULT_NORMAL_BALANCES: dict[AccountType, NormalBalance] = {
    AccountType.ASSET: NormalBalance.DEBIT,
    AccountType.EXPENSE: NormalBalance.DEBIT,
    AccountType.LIABILITY: NormalBalance.CREDIT,
    AccountType.EQUITY: NormalBalance.CREDIT,
    AccountType.INCOME: NormalBalance.CREDIT,
}


def get_default_normal_balance(account_type: str | AccountType) -> NormalBalance:
    """Retrieve the standard financial normal balance for an account category."""
    acct_enum = AccountType(account_type)
    return DEFAULT_NORMAL_BALANCES[acct_enum]


def compute_account_balance(
    normal_balance: str | NormalBalance,
    total_debits: Decimal,
    total_credits: Decimal,
) -> Decimal:
    """Compute the normalized balance according to the account's normal balance orientation.

    For DEBIT-normal accounts (Assets, Expenses):
        Balance = Total Debits - Total Credits
        (Positive when Debits exceed Credits, e.g., positive cash in bank or accumulated expense)

    For CREDIT-normal accounts (Liabilities, Equity, Income):
        Balance = Total Credits - Total Debits
        (Positive when Credits exceed Debits, e.g., outstanding loan balance, earned income, or equity)

    Args:
        normal_balance: NormalBalance enum or string ('DEBIT' or 'CREDIT').
        total_debits: Cumulative debit postings.
        total_credits: Cumulative credit postings.

    Returns:
        Decimal quantized to 4 decimal places.
    """
    nb = NormalBalance(normal_balance)
    deb = quantize_money(total_debits)
    cred = quantize_money(total_credits)

    if nb == NormalBalance.DEBIT:
        return quantize_money(deb - cred)
    else:
        return quantize_money(cred - deb)
