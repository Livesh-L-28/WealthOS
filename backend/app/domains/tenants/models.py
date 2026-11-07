"""WealthOS Tenants & RBAC Domain Models.

SQLAlchemy 2.x declarative models for multi-tenant workspaces, memberships,
invitations, roles, and granular permissions.
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domains.identity.models import User


class RolePermission(Base):
    """Association table linking roles to granular permissions."""

    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    )


class MembershipRole(Base):
    """Association table linking tenant memberships to assigned roles."""

    __tablename__ = "membership_roles"

    membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenant_memberships.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    )


class Tenant(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Workspace boundary representing an individual, household, or organization."""

    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(150), nullable=False, doc="Workspace display name")
    slug: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False, doc="URL-safe unique identifier"
    )
    tenant_type: Mapped[str] = mapped_column(
        String(50),
        default="personal",
        nullable=False,
        index=True,
        doc="Tenant category: personal, household, organization",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,
        index=True,
        doc="Workspace state: active, suspended, archived",
    )
    settings: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
        doc="Workspace-level preferences, currency, and security settings",
    )

    memberships: Mapped[list["TenantMembership"]] = relationship(
        "TenantMembership", back_populates="tenant", cascade="all, delete-orphan"
    )
    invitations: Mapped[list["TenantInvitation"]] = relationship(
        "TenantInvitation", back_populates="tenant", cascade="all, delete-orphan"
    )
    roles: Mapped[list["Role"]] = relationship(
        "Role", back_populates="tenant", cascade="all, delete-orphan"
    )


class Role(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Role definition scoping permissions to system or tenant level."""

    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_roles_tenant_name"),)

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        doc="Tenant foreign key (NULL for global system roles)",
    )
    name: Mapped[str] = mapped_column(
        String(50), nullable=False, doc="Role identifier: owner, admin, member, viewer"
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_system_role: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True, doc="System-defined immutable role"
    )

    tenant: Mapped["Tenant | None"] = relationship("Tenant", back_populates="roles")
    permissions: Mapped[list["Permission"]] = relationship(
        "Permission", secondary="role_permissions", back_populates="roles"
    )
    memberships: Mapped[list["TenantMembership"]] = relationship(
        "TenantMembership", secondary="membership_roles", back_populates="roles"
    )


class Permission(Base, UUIDPrimaryKeyMixin):
    """Granular action permission token."""

    __tablename__ = "permissions"

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        doc="Standard permission token e.g. members:invite, tenant:update",
    )
    domain: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True, doc="Permission domain e.g. tenant, members, audit"
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    roles: Mapped[list["Role"]] = relationship(
        "Role", secondary="role_permissions", back_populates="permissions"
    )


class TenantMembership(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Association linking user to tenant with specific roles and privileges."""

    __tablename__ = "tenant_memberships"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_tenant_memberships_tenant_user"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,
        index=True,
        doc="Membership state: active, suspended, revoked",
    )
    is_owner: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, doc="Flag indicating workspace owner"
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="memberships")
    user: Mapped["User"] = relationship("User", back_populates="memberships")
    roles: Mapped[list["Role"]] = relationship(
        "Role", secondary="membership_roles", back_populates="memberships"
    )


class TenantInvitation(Base, UUIDPrimaryKeyMixin):
    """Pending email invitation to join a workspace."""

    __tablename__ = "tenant_invitations"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    inviter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True, doc="Invitee normalized email"
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
        doc="SHA-256 digest of secret invitation token",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
        index=True,
        doc="Invitation state: pending, accepted, expired, revoked",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, doc="Invitation expiration timestamp"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="invitations")
