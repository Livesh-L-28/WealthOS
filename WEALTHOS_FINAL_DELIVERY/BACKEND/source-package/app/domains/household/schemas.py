"""WealthOS Household Wealth Management Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class HouseholdCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    timezone: str = Field(default="Asia/Kolkata", min_length=2, max_length=50)


class HouseholdUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    currency: str | None = Field(None, min_length=3, max_length=3)
    timezone: str | None = Field(None, min_length=2, max_length=50)


class HouseholdMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    status: str
    joined_at: datetime


class HouseholdResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    currency: str
    timezone: str
    owner_user_id: uuid.UUID
    memberships: list[HouseholdMemberResponse] = []
    created_at: datetime
    updated_at: datetime


class HouseholdInvitationCreate(BaseModel):
    email: EmailStr
    role: str = Field(default="MEMBER", pattern="^(ADMIN|MEMBER|VIEWER)$")


class HouseholdInvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    email: str
    role: str
    expires_at: datetime
    status: str
    invitation_token: str | None = None
    created_at: datetime


class HouseholdInvitationAccept(BaseModel):
    token: str


class HouseholdResourceShareRequest(BaseModel):
    resource_type: str = Field(..., pattern="^(ACCOUNT|BUDGET|LIABILITY|GOAL|ASSET)$")
    resource_id: uuid.UUID
    visibility: str = Field(default="HOUSEHOLD_SHARED", pattern="^(PERSONAL_ONLY|HOUSEHOLD_SHARED|LIMITED_SHARED)$")
    allocation_percentage: Decimal = Field(default=Decimal("100.00"), ge=Decimal("0.00"), le=Decimal("100.00"))


class HouseholdSharedResourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    owner_user_id: uuid.UUID
    resource_type: str
    resource_id: uuid.UUID
    visibility: str
    allocation_percentage: Decimal
    created_at: datetime


class HouseholdGoalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    target_amount: Decimal = Field(..., gt=Decimal("0.0000"))
    currency: str = Field(default="INR", min_length=3, max_length=3)
    target_date: date


class HouseholdGoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    target_amount: Decimal
    current_amount: Decimal
    currency: str
    target_date: date
    status: str
    created_at: datetime


class HouseholdContributionCreate(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0.0000"))
    note: str | None = Field(None, max_length=255)


class HouseholdContributionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    user_id: uuid.UUID
    amount: Decimal
    currency: str
    contribution_date: date
    note: str | None
    created_at: datetime


class HouseholdSettlementCreate(BaseModel):
    payee_user_id: uuid.UUID
    amount: Decimal = Field(..., gt=Decimal("0.0000"))
    currency: str = Field(default="INR", min_length=3, max_length=3)
    description: str = Field(..., min_length=2, max_length=255)


class HouseholdSettlementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    payer_user_id: uuid.UUID
    payee_user_id: uuid.UUID
    amount: Decimal
    currency: str
    settlement_date: date
    status: str
    description: str
    created_at: datetime


class HouseholdConsolidatedNetWorthResponse(BaseModel):
    household_id: uuid.UUID
    household_name: str
    currency: str
    total_household_net_worth: Decimal
    total_shared_assets: Decimal
    total_shared_liabilities: Decimal
    member_count: int
    shared_resources_count: int
    breakdown_by_member: list[dict[str, Any]]
