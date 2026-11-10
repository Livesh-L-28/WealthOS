"""WealthOS Password Security & Argon2id Hashing.

Adheres strictly to NIST SP 800-63B guidelines and OWASP ASVS v4.0.3 standards.
"""

import re
from typing import Final

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# OWASP & NIST recommended parameters for Argon2id
# 64 MiB memory, 3 iterations, 4 parallel threads, 32-byte hash
_hasher: Final[PasswordHasher] = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

# Precomputed dummy hash for constant-time failure when email is not found
_DUMMY_ARGON2_HASH: Final[str] = _hasher.hash("DummyPasswordForTimingMitigation12345!")

# Common breached passwords blocklist (top NIST blocklist sample)
_BANNED_PASSWORDS: Final[set[str]] = {
    "password1234",
    "password12345",
    "123456789012",
    "1234567890123",
    "qwertyuiop12",
    "correcthorsebatterystaple",
    "wealthos12345",
    "adminadmin12",
    "administrator1",
    "letmein12345",
    "welcome12345",
    "iloveyou12345",
    "changeme12345",
}


class PasswordPolicyError(ValueError):
    """Raised when a password violates NIST SP 800-63B criteria."""


def validate_password_policy(
    password: str,
    user_email: str | None = None,
    user_name: str | None = None,
) -> None:
    """Validate password against NIST SP 800-63B requirements.

    Requirements:
    1. Minimum 12 characters in length.
    2. Maximum 128 characters (prevent DoS).
    3. Not on known compromised / banned passwords list.
    4. Does not contain the user's email username or full name.
    """
    if len(password) < 12:
        raise PasswordPolicyError("Password must be at least 12 characters long.")
    if len(password) > 128:
        raise PasswordPolicyError("Password must not exceed 128 characters.")

    normalized = password.lower().strip()
    if normalized in _BANNED_PASSWORDS:
        raise PasswordPolicyError(
            "This password is known to be commonly breached. Please choose a more secure password."
        )

    # Check for basic repetitive patterns e.g. "aaaaaaaaaaaa"
    if len(set(normalized)) < 4:
        raise PasswordPolicyError("Password contains excessive character repetition.")

    if user_email:
        username_part = user_email.split("@")[0].lower()
        if len(username_part) >= 4 and username_part in normalized:
            raise PasswordPolicyError("Password must not contain parts of your email address.")

    if user_name:
        for part in re.split(r"\s+", user_name.lower()):
            if len(part) >= 4 and part in normalized:
                raise PasswordPolicyError("Password must not contain parts of your name.")


def hash_password(password: str) -> str:
    """Compute Argon2id hash of a plaintext password."""
    return _hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash in constant time."""
    try:
        return _hasher.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def verify_dummy_password(plain_password: str) -> None:
    """Execute constant-time Argon2id verification on a dummy hash.

    Used when a user account does not exist to eliminate timing side-channels.
    """
    try:
        _hasher.verify(_DUMMY_ARGON2_HASH, plain_password)
    except Exception:
        pass


def check_needs_rehash(hashed_password: str) -> bool:
    """Check if password hash requires upgrading to newer parameters."""
    return _hasher.check_needs_rehash(hashed_password)
