"""WealthOS Identity Domain Pydantic v2 Schemas.

Request and response contracts for registration, authentication, sessions, and MFA.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """User account registration payload."""

    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)


class RegisterResponse(BaseModel):
    """Registration outcome response."""

    user_id: uuid.UUID
    email: str
    status: str
    personal_tenant_id: uuid.UUID
    message: str


class LoginRequest(BaseModel):
    """User authentication credentials."""

    email: EmailStr
    password: str


class UserSummary(BaseModel):
    """Brief user identity summary."""

    id: uuid.UUID
    email: str
    name: str
    mfa_enabled: bool


class TenantSummary(BaseModel):
    """Brief tenant summary for active workspace."""

    id: uuid.UUID
    name: str
    slug: str
    tenant_type: str
    role: str
    is_owner: bool


class LoginSuccessData(BaseModel):
    """Payload returned upon complete successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserSummary
    active_tenant: TenantSummary


class MFARequiredData(BaseModel):
    """Payload returned when user credentials are valid but MFA is required."""

    mfa_required: bool = True
    mfa_token: str
    mfa_type: str = "totp"


class RefreshTokenRequest(BaseModel):
    """Refresh token payload (if not delivered via HttpOnly cookie)."""

    refresh_token: str | None = None


class VerifyEmailRequest(BaseModel):
    """Email verification token submission."""

    token: str = Field(min_length=16)


class ResendVerificationRequest(BaseModel):
    """Request to resend account verification email."""

    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    """Password recovery request."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Password reset token submission and new password."""

    token: str = Field(min_length=16)
    new_password: str = Field(min_length=12, max_length=128)


class ChangePasswordRequest(BaseModel):
    """Authenticated user password modification."""

    current_password: str
    new_password: str = Field(min_length=12, max_length=128)


class MFAEnrollResponse(BaseModel):
    """TOTP setup provisioning details."""

    secret: str
    provisioning_uri: str
    recovery_codes: list[str]


class MFAVerifyEnrollmentRequest(BaseModel):
    """Confirmation code verifying authenticator configuration."""

    code: str = Field(min_length=6, max_length=6)


class MFAChallengeRequest(BaseModel):
    """MFA challenge submission during login."""

    mfa_token: str
    code: str | None = None
    recovery_code: str | None = None


class MFADisableRequest(BaseModel):
    """Deactivation request requiring password and current TOTP code."""

    password: str
    code: str = Field(min_length=6, max_length=6)


class SessionResponse(BaseModel):
    """Session details for user device management."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ip_address: str | None = None
    user_agent: str | None = None
    device_fingerprint: str | None = None
    is_current: bool = False
    last_active_at: datetime
    created_at: datetime


class UserProfileResponse(BaseModel):
    """Comprehensive authenticated user profile."""

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    full_name: str
    status: str
    is_email_verified: bool
    mfa_enabled: bool
    active_tenant: TenantSummary | None = None
    memberships: list[TenantSummary] = Field(default_factory=list)


class DeleteAccountRequest(BaseModel):
    """Payload for requesting permanent user account deletion."""

    password: str = Field(min_length=1, description="Current password for verification")
    confirmation_phrase: str = Field(description="Must match 'DELETE MY ACCOUNT'")


class OTPSendRequest(BaseModel):
    """Payload for requesting a 6-digit OTP code for mobile phone or email."""

    identifier: str = Field(
        min_length=3,
        max_length=255,
        description="Mobile phone number (e.g. +91 9876543210) or email address",
    )


class OTPSendResponse(BaseModel):
    """Response returned upon OTP code generation and dispatch."""

    success: bool
    message: str
    identifier: str
    debug_otp: str | None = None


class OTPVerifyRequest(BaseModel):
    """Payload for verifying 6-digit OTP code and completing login."""

    identifier: str = Field(
        min_length=3,
        max_length=255,
        description="Mobile phone number or email address",
    )
    otp: str = Field(
        min_length=4,
        max_length=8,
        description="6-digit verification code",
    )

