"""WealthOS Domain Models Package.

Re-exports domain models for unified SQLAlchemy metadata discovery and Alembic migrations.
"""

from app.domains.audit.models import SecurityAuditLog
from app.domains.identity.models import (
    EmailVerificationToken,
    MFACredential,
    MFARecoveryCode,
    PasswordResetToken,
    RefreshToken,
    User,
    UserCredential,
    UserSession,
)
from app.domains.tenants.models import (
    MembershipRole,
    Permission,
    Role,
    RolePermission,
    Tenant,
    TenantInvitation,
    TenantMembership,
)

__all__ = [
    "EmailVerificationToken",
    "MFACredential",
    "MFARecoveryCode",
    "MembershipRole",
    "PasswordResetToken",
    "Permission",
    "RefreshToken",
    "Role",
    "RolePermission",
    "SecurityAuditLog",
    "Tenant",
    "TenantInvitation",
    "TenantMembership",
    "User",
    "UserCredential",
    "UserSession",
]
