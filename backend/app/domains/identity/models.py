"""WealthOS Identity Domain Models.

SQLAlchemy 2.x declarative models for users, credentials, tokens, sessions,
and multi-factor authentication (MFA).
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domains.tenants.models import TenantMembership


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """User account entity representing an authenticated principal."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        doc="Unique normalized email address",
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False, doc="Given name")
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, doc="Family name")
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending_verification",
        nullable=False,
        index=True,
        doc="Account state: pending_verification, active, suspended, deactivated",
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, doc="System superuser flag"
    )
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp of email verification"
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp of most recent login"
    )

    # Relationships
    credential: Mapped["UserCredential"] = relationship(
        "UserCredential", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )
    mfa_credential: Mapped["MFACredential | None"] = relationship(
        "MFACredential", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    recovery_codes: Mapped[list["MFARecoveryCode"]] = relationship(
        "MFARecoveryCode", back_populates="user", cascade="all, delete-orphan"
    )
    memberships: Mapped[list["TenantMembership"]] = relationship(
        "TenantMembership", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        """Return user full display name."""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_active(self) -> bool:
        """Check if user account is active and not soft-deleted."""
        return self.status == "active" and not self.is_deleted


class UserCredential(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User security credentials and password metadata."""

    __tablename__ = "user_credentials"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
        doc="Foreign key to owning user",
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False, doc="Argon2id password hash"
    )
    password_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        doc="Timestamp of last password change",
    )
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Consecutive failed login counter"
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp until account is temporarily locked"
    )

    user: Mapped["User"] = relationship("User", back_populates="credential")


class EmailVerificationToken(Base, UUIDPrimaryKeyMixin):
    """Cryptographic one-time token for account email verification."""

    __tablename__ = "email_verification_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
        doc="SHA-256 digest of secret token",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, doc="Token expiration timestamp"
    )
    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp when token was successfully consumed"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class PasswordResetToken(Base, UUIDPrimaryKeyMixin):
    """Cryptographic one-time token for password reset."""

    __tablename__ = "password_reset_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
        doc="SHA-256 digest of secret token",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, doc="Token expiration timestamp"
    )
    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp when token was successfully consumed"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class UserSession(Base, UUIDPrimaryKeyMixin):
    """Active user authentication session."""

    __tablename__ = "user_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True, doc="Client IPv4 or IPv6 address"
    )
    user_agent: Mapped[str | None] = mapped_column(
        Text, nullable=True, doc="Client browser/mobile User-Agent string"
    )
    device_fingerprint: Mapped[str | None] = mapped_column(
        String(255), nullable=True, doc="Client hardware / device identifier"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True, doc="Session active flag"
    )
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        doc="Timestamp of most recent activity",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, doc="Absolute session expiration"
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp when session was terminated"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="sessions")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="session", cascade="all, delete-orphan"
    )


class RefreshToken(Base, UUIDPrimaryKeyMixin):
    """Hashed refresh token supporting rotation and reuse detection."""

    __tablename__ = "refresh_tokens"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
        doc="SHA-256 digest of raw refresh token",
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
        doc="Token rotation family identifier for reuse containment",
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True, doc="Revocation flag"
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp of revocation"
    )
    revoked_reason: Mapped[str | None] = mapped_column(
        String(50), nullable=True, doc="Reason: rotated, user_logout, reuse_detected"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, doc="Token expiration timestamp"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    session: Mapped["UserSession"] = relationship("UserSession", back_populates="refresh_tokens")


class MFACredential(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User Multi-Factor Authentication configuration and encrypted secret."""

    __tablename__ = "mfa_credentials"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    mfa_type: Mapped[str] = mapped_column(
        String(30), default="totp", nullable=False, doc="MFA mechanism: totp"
    )
    secret_key_encrypted: Mapped[str] = mapped_column(
        Text, nullable=False, doc="AES-256-GCM envelope encrypted base32 secret"
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True, doc="MFA active status"
    )
    enabled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp when user completed verification"
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp of most recent MFA challenge pass"
    )

    user: Mapped["User"] = relationship("User", back_populates="mfa_credential")


class MFARecoveryCode(Base, UUIDPrimaryKeyMixin):
    """Single-use backup recovery codes for MFA account recovery."""

    __tablename__ = "mfa_recovery_codes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    code_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
        doc="SHA-256 digest of 10-character recovery code",
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True, doc="Consumed flag"
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Timestamp when code was redeemed"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="recovery_codes")


class DeviceRegistry(Base, UUIDPrimaryKeyMixin):
    """Trusted client device fingerprint registry for account takeover protection."""

    __tablename__ = "device_registries"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    device_fingerprint: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    device_name: Mapped[str] = mapped_column(String(100), nullable=False)
    device_type: Mapped[str] = mapped_column(String(50), default="WEB_DESKTOP", nullable=False)
    client_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    is_trusted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class WebAuthnCredential(Base, UUIDPrimaryKeyMixin):
    """FIDO2 / WebAuthn passkey credentials."""

    __tablename__ = "webauthn_credentials"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    credential_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    public_key: Mapped[str] = mapped_column(Text, nullable=False)
    sign_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    aaguid: Mapped[str | None] = mapped_column(String(36), nullable=True)
    credential_name: Mapped[str] = mapped_column(String(100), default="Passkey", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UserApiKey(Base, UUIDPrimaryKeyMixin):
    """Scoped developer and machine-to-machine API keys."""

    __tablename__ = "user_api_keys"

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
    key_name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(12), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    scopes: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
