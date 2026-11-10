"""WealthOS Trial Balance and Balance Reporting Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class TrialBalanceItemResponse(BaseModel):
    """An account line in the trial balance report."""

    model_config = ConfigDict(from_attributes=True)

    account_id: uuid.UUID
    account_code: str
    account_name: str
    account_type: str
    normal_balance: str
    debit_balance: Decimal
    credit_balance: Decimal


class TrialBalanceResponse(BaseModel):
    """Trial Balance report confirming Sigma(Debits) == Sigma(Credits)."""

    as_of_date: date
    generated_at: datetime
    functional_currency: str
    accounts: list[TrialBalanceItemResponse]
    total_debit: Decimal
    total_credit: Decimal
    is_balanced: bool
