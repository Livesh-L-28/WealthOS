"""WealthOS Enterprise Integrations Pydantic Schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class FinancialProviderResponse(BaseModel):
    """Catalog details of a financial provider."""

    id: uuid.UUID
    provider_key: str
    name: str
    category: str
    status: str
    supported_products: list[str]
    auth_type: str
    capabilities: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class ProviderConsentCreate(BaseModel):
    """Request to record a DPDP Act compliant consent."""

    provider_id: uuid.UUID
    scopes_granted: list[str] = Field(..., min_length=1)
    purpose: str = Field(..., min_length=5, max_length=500)
    valid_days: int = Field(default=365, ge=1, le=1095)
    dpdp_notice_version: str = Field(default="1.0.0")


class ProviderConsentResponse(BaseModel):
    """Response schema for recorded consent."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    provider_id: uuid.UUID
    scopes_granted: list[str]
    purpose: str
    valid_until: datetime
    revoked_at: datetime | None = None
    dpdp_notice_version: str
    created_at: datetime


class ProviderConnectionCreate(BaseModel):
    """Request to link a financial provider connection."""

    provider_id: uuid.UUID
    credentials: dict[str, Any] = Field(default_factory=dict)
    account_count: int = Field(default=1, ge=1)


class ProviderConnectionResponse(BaseModel):
    """Response schema for an active provider connection."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    provider_id: uuid.UUID
    status: str
    account_count: int
    last_successful_sync_at: datetime | None = None
    error_summary: str | None = None
    created_at: datetime
    updated_at: datetime


class ProviderSyncRequest(BaseModel):
    """Request to initiate provider synchronization."""

    connection_id: uuid.UUID
    sync_mode: str = Field(default="INCREMENTAL", pattern="^(INCREMENTAL|FULL)$")


class ProviderSyncResponse(BaseModel):
    """Result of provider sync execution."""

    connection_id: uuid.UUID
    status: str
    records_synced: int
    cursor_token: str
    synced_at: datetime


class WebhookPayload(BaseModel):
    """Inbound webhook payload envelope."""

    event_id: str
    event_type: str
    timestamp: int  # Unix timestamp in seconds
    data: dict[str, Any]

