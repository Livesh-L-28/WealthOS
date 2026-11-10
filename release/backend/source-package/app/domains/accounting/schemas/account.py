"""WealthOS Chart of Accounts Schemas."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domains.accounting.domain.accounting_rules import AccountType, NormalBalance
from app.domains.accounting.domain.money import validate_currency_code


class CreateAccountRequest(BaseModel):
    """Payload to create a new account in Chart of Accounts."""

    account_code: str = Field(
        ..., min_length=1, max_length=50, description="Account code e.g. 1020"
    )
    account_name: str = Field(..., min_length=1, max_length=255, description="Account name")
    account_type: AccountType = Field(
        ..., description="ASSET, LIABILITY, EQUITY, INCOME, or EXPENSE"
    )
    normal_balance: NormalBalance | None = Field(
        default=None, description="Optional override, defaults per account type"
    )
    description: str | None = Field(default=None, max_length=1000)
    parent_account_id: uuid.UUID | None = Field(default=None)
    currency_code: str = Field(default="INR", min_length=3, max_length=3)
    is_control_account: bool = Field(default=False)

    @field_validator("currency_code")
    @classmethod
    def check_currency(cls, v: str) -> str:
        return validate_currency_code(v)


class UpdateAccountRequest(BaseModel):
    """Payload to update an existing account."""

    account_name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    parent_account_id: uuid.UUID | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class AccountResponse(BaseModel):
    """Serialized account model."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    account_code: str
    account_name: str
    description: str | None = None
    account_type: str
    normal_balance: str
    parent_account_id: uuid.UUID | None = None
    currency_code: str
    is_system_account: bool
    is_active: bool
    is_control_account: bool
    created_at: datetime
    updated_at: datetime


class AccountBalanceResponse(BaseModel):
    """Real-time account balance computed from posted journal entries."""

    account_id: uuid.UUID
    account_code: str
    account_name: str
    account_type: str
    normal_balance: str
    currency_code: str
    total_debit: Decimal
    total_credit: Decimal
    balance: Decimal
    as_of: datetime
