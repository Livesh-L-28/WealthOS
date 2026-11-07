"""WealthOS General and Account Ledger Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class LedgerEntryResponse(BaseModel):
    """A single line item in an account ledger view with running balance."""

    model_config = ConfigDict(from_attributes=True)

    line_id: uuid.UUID
    journal_entry_id: uuid.UUID
    entry_number: str
    entry_date: date
    posting_date: datetime | None = None
    description: str | None = None
    reference: str | None = None
    source_type: str
    debit_amount: Decimal
    credit_amount: Decimal
    functional_debit_amount: Decimal
    functional_credit_amount: Decimal
    running_balance: Decimal


class AccountLedgerResponse(BaseModel):
    """Detailed ledger statement for a specific account over a date range."""

    account_id: uuid.UUID
    account_code: str
    account_name: str
    account_type: str
    normal_balance: str
    currency_code: str
    start_date: date | None = None
    end_date: date | None = None
    opening_balance: Decimal
    entries: list[LedgerEntryResponse]
    closing_balance: Decimal
    total_debits: Decimal
    total_credits: Decimal


class GeneralLedgerResponse(BaseModel):
    """Comprehensive general ledger report across accounts."""

    functional_currency: str
    as_of: datetime
    start_date: date | None = None
    end_date: date | None = None
    accounts: list[AccountLedgerResponse]
