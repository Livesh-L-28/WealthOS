"""WealthOS Multi-Factor Authentication (MFA / 2FA) Service.

RFC 6238 TOTP enrollment, AES-256-GCM envelope encryption, Redis replay protection,
and single-use recovery code redemption.
"""

import uuid
from dataclasses import dataclass

import pyotp

from app.core.config import settings
from app.core.logging import get_logger
from app.domains.identity.crypto import (
    decrypt_secret,
    encrypt_secret,
    generate_recovery_codes,
    hash_token,
)
from app.infrastructure.redis import get_redis

logger = get_logger("wealthos.mfa")


class MFASecurityError(ValueError):
    """Raised when an MFA operation fails or violates replay policy."""


@dataclass
class MFAEnrollmentDetails:
    """Artifacts generated during TOTP enrollment."""

    secret_key_plain: str
    secret_key_encrypted: str
    provisioning_uri: str
    recovery_codes: list[str]


def initiate_totp_enrollment(user_email: str) -> MFAEnrollmentDetails:
    """Generate a new unverified TOTP secret and recovery codes."""
    raw_secret = pyotp.random_base32()
    encrypted_secret = encrypt_secret(raw_secret)

    totp = pyotp.TOTP(raw_secret)
    provisioning_uri = totp.provisioning_uri(
        name=user_email,
        issuer_name=settings.MFA_TOTP_ISSUER,
    )
    raw_recovery_codes = generate_recovery_codes(count=10)

    return MFAEnrollmentDetails(
        secret_key_plain=raw_secret,
        secret_key_encrypted=encrypted_secret,
        provisioning_uri=provisioning_uri,
        recovery_codes=raw_recovery_codes,
    )


async def verify_totp_code(
    user_id: uuid.UUID,
    encrypted_secret: str,
    submitted_code: str,
    check_replay: bool = True,
) -> bool:
    """Decrypt TOTP secret, verify 6-digit code, and enforce replay prevention."""
    clean_code = submitted_code.strip().replace(" ", "")
    if len(clean_code) != 6 or not clean_code.isdigit():
        return False

    try:
        raw_secret = decrypt_secret(encrypted_secret)
        totp = pyotp.TOTP(raw_secret)
        # valid_window=1 allows 1 time step (30s) drift backward/forward
        is_valid = totp.verify(clean_code, valid_window=1)
        if not is_valid:
            return False
    except Exception as exc:
        logger.warning(f"Error during TOTP verification for user {user_id}: {exc}")
        return False

    if check_replay:
        # Atomic Redis replay prevention
        try:
            redis_client = await get_redis()
            lock_key = f"totp:used:{user_id}:{clean_code}"
            # NX=True sets key only if not present; ex=60 expires after 1 minute
            acquired = await redis_client.set(lock_key, "1", ex=60, nx=True)
            if not acquired:
                logger.warning(f"TOTP replay attempt detected for user {user_id}, code rejected")
                raise MFASecurityError(
                    "This authentication code was already used. Please wait for the next code."
                )
        except MFASecurityError:
            raise
        except Exception as exc:
            logger.warning(f"Redis replay check unavailable: {exc}")
            # Fail safe: proceed if Redis is temporarily unreachable

    return True


def hash_recovery_code(code: str) -> str:
    """Normalize and hash single-use recovery code."""
    normalized = code.strip().upper().replace(" ", "")
    return hash_token(normalized)
