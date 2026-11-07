"""WealthOS JWT Token Management & Validation.

Handles short-lived Access JWTs, MFA challenge tokens, and strict claims enforcement.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings


class TokenSecurityError(ValueError):
    """Raised when token validation or claims check fails."""


def create_access_token(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    tenant_id: uuid.UUID | None = None,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create a signed short-lived JWT access token."""
    now = datetime.now(UTC)
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = now + delta

    payload: dict[str, Any] = {
        "iss": settings.JWT_ISSUER,
        "sub": str(user_id),
        "aud": settings.JWT_AUDIENCE,
        "exp": int(expire.timestamp()),
        "nbf": int(now.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),
        "sid": str(session_id),
        "tid": str(tenant_id) if tenant_id else None,
        "token_type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_mfa_challenge_token(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    expires_minutes: int = 5,
) -> str:
    """Create a temporary, bounded JWT for completing an active MFA challenge."""
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=expires_minutes)

    payload: dict[str, Any] = {
        "iss": settings.JWT_ISSUER,
        "sub": str(user_id),
        "aud": settings.JWT_AUDIENCE,
        "exp": int(expire.timestamp()),
        "nbf": int(now.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),
        "sid": str(session_id),
        "token_type": "mfa_challenge",
    }
    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_and_validate_token(
    token: str,
    expected_token_type: str = "access",
) -> dict[str, Any]:
    """Decode, verify signature, and validate standard claims of a JWT."""
    try:
        # Strict algorithm validation prevents algorithm confusion and 'none' exploits
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
            options={
                "verify_signature": True,
                "verify_aud": True,
                "verify_iat": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iss": True,
            },
        )
    except jwt.ExpiredSignatureError as e:
        raise TokenSecurityError("Token has expired.") from e
    except JWTError as e:
        raise TokenSecurityError(f"Token validation failed: {e}") from e

    token_type = payload.get("token_type")
    if token_type != expected_token_type:
        raise TokenSecurityError(
            f"Invalid token type: expected '{expected_token_type}', got '{token_type}'"
        )

    sub = payload.get("sub")
    if not sub:
        raise TokenSecurityError("Token missing subject claim ('sub').")

    return payload
