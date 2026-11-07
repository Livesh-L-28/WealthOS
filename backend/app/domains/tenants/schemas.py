"""WealthOS Tenants & RBAC Domain Pydantic v2 Schemas.

Request and response contracts for workspaces, memberships, invitations, and roles.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CreateTenantRequest(BaseModel):
    """Payload to create a new collaborative workspace."""

    name: str = Field(min_length=2, max_length=150)
    tenant_type: str = Field(default="household", pattern="^(household|organization)$")


class UpdateTenantRequest(BaseModel):
    """Workspace metadata update payload."""

    name: str | None = Field(default=None, min_length=2, max_length=150)
    settings: dict[str, Any] | None = None


class TenantDetailResponse(BaseModel):
    """Workspace details and user role context."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    tenant_type: str
    status: str
    role: str
    is_owner: bool
    created_at: datetime
    member_count: int = 1


class SwitchTenantRequest(BaseModel):
    """Request to change active workspace."""

    tenant_id: uuid.UUID


class InviteMemberRequest(BaseModel):
    """Payload to invite a collaborator to the workspace."""

    email: EmailStr
    role_name: str = Field(default="member", pattern="^(admin|member|viewer)$")


class TenantInvitationResponse(BaseModel):
    """Pending or processed invitation details."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    role_name: str
    status: str
    expires_at: datetime
    created_at: datetime


class AcceptInvitationRequest(BaseModel):
    """Token submission to accept a workspace invitation."""

    token: str = Field(min_length=16)


class UpdateMemberRequest(BaseModel):
    """Modify workspace member status or role."""

    role_name: str | None = Field(default=None, pattern="^(admin|member|viewer)$")
    status: str | None = Field(default=None, pattern="^(active|suspended)$")


class TenantMemberResponse(BaseModel):
    """Workspace membership summary."""

    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    name: str
    role: str
    is_owner: bool
    status: str
    joined_at: datetime


class TransferOwnershipRequest(BaseModel):
    """Safeguarded ownership transfer requiring target and password confirmation."""

    target_user_id: uuid.UUID
    current_password: str


class PermissionResponse(BaseModel):
    """Granular permission token description."""

    name: str
    domain: str
    description: str | None = None


class RoleResponse(BaseModel):
    """Role definition and associated permissions."""

    id: uuid.UUID
    name: str
    description: str | None = None
    is_system_role: bool
    permissions: list[str] = Field(default_factory=list)


class CreateRoleRequest(BaseModel):
    """Custom role creation payload."""

    name: str = Field(min_length=2, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    description: str | None = Field(default=None, max_length=255)
    permissions: list[str] = Field(min_length=1)


class AuditLogResponse(BaseModel):
    """Security audit log record."""

    id: uuid.UUID
    tenant_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    event_type: str
    status: str
    ip_address: str | None = None
    user_agent: str | None = None
    correlation_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
