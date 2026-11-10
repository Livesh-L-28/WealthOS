"""WealthOS Accounting Domain Exceptions."""


class AccountingDomainError(Exception):
    """Base exception for all financial and accounting domain violations."""

    def __init__(self, message: str, code: str = "ACCOUNTING_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class UnbalancedJournalError(AccountingDomainError):
    """Raised when total functional debits do not strictly equal total functional credits."""

    def __init__(self, total_debit: str, total_credit: str, difference: str):
        message = (
            f"Journal entry is unbalanced: Total Debits ({total_debit}) != "
            f"Total Credits ({total_credit}). Imbalance: {difference}."
        )
        super().__init__(message, code="UNBALANCED_JOURNAL")
        self.total_debit = total_debit
        self.total_credit = total_credit
        self.difference = difference


class AccountInactiveError(AccountingDomainError):
    """Raised when attempting to post against an inactive account."""

    def __init__(self, account_id: str, account_code: str):
        super().__init__(
            f"Account {account_code} ({account_id}) is inactive and cannot receive postings.",
            code="ACCOUNT_INACTIVE",
        )


class AccountNotFoundError(AccountingDomainError):
    """Raised when a referenced account does not exist within the active tenant."""

    def __init__(self, account_identifier: str):
        super().__init__(
            f"Account '{account_identifier}' not found in the current workspace.",
            code="ACCOUNT_NOT_FOUND",
        )


class JournalEntryNotFoundError(AccountingDomainError):
    """Raised when a referenced journal entry does not exist within the active tenant."""

    def __init__(self, entry_identifier: str):
        super().__init__(
            f"Journal entry '{entry_identifier}' not found in the current workspace.",
            code="JOURNAL_ENTRY_NOT_FOUND",
        )


class PeriodClosedError(AccountingDomainError):
    """Raised when an entry date falls within a closed accounting period."""

    def __init__(self, entry_date: str, period_name: str = ""):
        desc = f" '{period_name}'" if period_name else ""
        super().__init__(
            f"Entry date {entry_date} falls within closed accounting period{desc}.",
            code="PERIOD_CLOSED",
        )


class IdempotencyConflictError(AccountingDomainError):
    """Raised when an idempotency key is reused with a mismatched payload fingerprint."""

    def __init__(self, key: str):
        super().__init__(
            f"Idempotency key '{key}' was previously used with a different request payload.",
            code="IDEMPOTENCY_CONFLICT",
        )


class DuplicateReversalError(AccountingDomainError):
    """Raised when attempting to reverse an entry that has already been reversed."""

    def __init__(self, journal_id: str):
        super().__init__(
            f"Journal entry {journal_id} has already been reversed.",
            code="DUPLICATE_REVERSAL",
        )


class ImmutableJournalError(AccountingDomainError):
    """Raised when an update or delete is attempted on a posted journal entry."""

    def __init__(self, journal_id: str):
        super().__init__(
            f"Journal entry {journal_id} is POSTED and cannot be edited or deleted.",
            code="IMMUTABLE_JOURNAL",
        )


class CircularAccountHierarchyError(AccountingDomainError):
    """Raised when account parent-child assignments create a circular reference."""

    def __init__(self, account_id: str, parent_id: str, message: str | None = None):
        msg = (
            message
            or f"Setting parent account {parent_id} for account {account_id} creates a circular dependency."
        )
        super().__init__(
            msg,
            code="CIRCULAR_ACCOUNT_HIERARCHY",
        )
        self.account_id = account_id
        self.parent_id = parent_id


class InvalidMoneyError(AccountingDomainError):
    """Raised when a monetary value violates precision, scale, or positivity invariants."""

    def __init__(self, message: str):
        super().__init__(message, code="INVALID_MONEY")


# Aliases for consistent multi-layer naming
AccountingEngineError = AccountingDomainError
AccountingPeriodClosedError = PeriodClosedError
DuplicateTransactionError = IdempotencyConflictError
ImmutableLedgerError = ImmutableJournalError
InvalidAccountHierarchyError = CircularAccountHierarchyError
ReversalNotAllowedError = DuplicateReversalError
