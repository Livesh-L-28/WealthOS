"""WealthOS Synchronization & Offline-First Schemas."""

from typing import Any
from pydantic import BaseModel, Field


class SyncSessionCreate(BaseModel):
    device_id: str = Field(..., description="Unique client device identifier")
    client_version: str = Field(..., description="Application semantic version, e.g. 1.0.1")
    platform: str = Field(..., description="Platform identifier: android, ios, or web")


class SyncSessionResponse(BaseModel):
    session_id: str = Field(..., description="Assigned sync session UUID")
    tenant_id: str = Field(..., description="Authenticated tenant ID")
    server_timestamp: str = Field(..., description="Authoritative ISO 8601 server timestamp")
    active_cursor: str = Field(..., description="Initial pagination cursor for delta sync")


class SyncOperationItem(BaseModel):
    operation_id: str = Field(..., description="Globally unique client operation UUID")
    operation_type: str = Field(..., description="Mutation type: RECORD_EXPENSE, UPDATE_BUDGET, RECORD_TRANSFER, etc.")
    entity_id: str | None = Field(None, description="Optional target entity ID")
    idempotency_key: str = Field(..., description="Client-provided idempotency key")
    client_timestamp: str = Field(..., description="Client creation timestamp")
    payload: dict[str, Any] = Field(default_factory=dict, description="Operation payload parameters")


class SyncBatchRequest(BaseModel):
    session_id: str = Field(..., description="Active sync session identifier")
    operations: list[SyncOperationItem] = Field(default_factory=list, description="Ordered batch of pending offline operations")


class SyncBatchResponse(BaseModel):
    accepted_operations: list[str] = Field(default_factory=list, description="List of accepted operation IDs")
    rejected_operations: list[dict[str, Any]] = Field(default_factory=list, description="List of rejected operations with error codes")
    conflict_operations: list[dict[str, Any]] = Field(default_factory=list, description="List of operations requiring conflict resolution")
    server_timestamp: str = Field(..., description="Authoritative server timestamp")


class SyncOperationStatusResponse(BaseModel):
    operation_id: str
    tenant_id: str
    state: str = Field(..., description="ACCEPTED, REJECTED, CONFLICT, or PENDING")
    authoritative_entity_id: str | None = None
    error_message: str | None = None
    resolved_at: str | None = None


class SyncConflictItem(BaseModel):
    conflict_id: str
    operation_id: str
    operation_type: str
    reason: str
    client_payload: dict[str, Any]
    server_state: dict[str, Any]
    resolution_options: list[str] = Field(default_factory=lambda: ["SERVER_WIN", "CLIENT_WIN", "MANUAL_MERGE"])


class SyncConflictResolutionRequest(BaseModel):
    resolution_strategy: str = Field(..., description="SERVER_WIN, CLIENT_WIN, or MANUAL_MERGE")
    merged_payload: dict[str, Any] | None = None


class SyncConflictResolutionResponse(BaseModel):
    conflict_id: str
    status: str
    resolved_at: str


class SyncDeltaResponse(BaseModel):
    cursor: str = Field(..., description="Opaque cursor token for next incremental sync")
    server_timestamp: str = Field(..., description="Authoritative server timestamp")
    has_more: bool = False
    changes: list[dict[str, Any]] = Field(default_factory=list, description="Chronological server mutations")


class DeviceRegistrationRequest(BaseModel):
    device_id: str = Field(..., description="Unique client hardware/instance identifier")
    device_name: str = Field(..., description="Human-readable device model or browser name")
    platform: str = Field(..., description="android, ios, or web")
    app_version: str = Field(..., description="Client software build version")


class DeviceRegistrationResponse(BaseModel):
    device_id: str
    tenant_id: str
    status: str = Field(default="ACTIVE")
    registered_at: str
    revoked_at: str | None = None


class LedgerSnapshotPayload(BaseModel):
    accounts: list[dict[str, Any]] = Field(default_factory=list)
    transactions: list[dict[str, Any]] = Field(default_factory=list)
    budgets: list[dict[str, Any]] = Field(default_factory=list)
    goals: list[dict[str, Any]] = Field(default_factory=list)
    holdings: list[dict[str, Any]] = Field(default_factory=list)
    timestamp: str | None = None


class LedgerSnapshotResponse(BaseModel):
    success: bool = True
    tenant_id: str
    data: dict[str, Any]
    server_timestamp: str


