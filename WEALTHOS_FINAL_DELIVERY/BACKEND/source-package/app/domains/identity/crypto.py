"""WealthOS Cryptographic Utilities.

Envelope encryption (AES-256-GCM), cryptographically secure random token generation,
and constant-time hashing.
"""

import base64
import hashlib
import os
import secrets
from typing import Final

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

# 32-byte key required for AES-256
_KEY_SIZE: Final[int] = 32
_NONCE_SIZE: Final[int] = 12  # Standard 96-bit nonce for AES-GCM


def _derive_master_key() -> bytes:
    """Derive a fixed 32-byte key from the configured ENCRYPTION_MASTER_KEY."""
    raw_key = settings.ENCRYPTION_MASTER_KEY.encode("utf-8")
    if len(raw_key) == _KEY_SIZE:
        return raw_key
    # Deterministic SHA-256 hash ensures exactly 32 bytes
    return hashlib.sha256(raw_key).digest()


def encrypt_secret(plaintext: str) -> str:
    """Encrypt sensitive string using AES-256-GCM with a random nonce.

    Returns:
        Base64-encoded string: nonce + ciphertext + tag
    """
    key = _derive_master_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(_NONCE_SIZE)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    # Combine nonce and ciphertext
    payload = nonce + ciphertext
    return base64.b64encode(payload).decode("ascii")


def decrypt_secret(encrypted_token: str) -> str:
    """Decrypt AES-256-GCM ciphertext using the master key.

    Args:
        encrypted_token: Base64-encoded nonce + ciphertext + tag

    Returns:
        Decrypted plaintext string
    """
    key = _derive_master_key()
    aesgcm = AESGCM(key)
    payload = base64.b64decode(encrypted_token.encode("ascii"))
    if len(payload) < _NONCE_SIZE:
        raise ValueError("Invalid encrypted payload length")
    nonce = payload[:_NONCE_SIZE]
    ciphertext = payload[_NONCE_SIZE:]
    decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
    return decrypted_bytes.decode("utf-8")


def generate_secure_token(length_bytes: int = 32) -> str:
    """Generate a high-entropy URL-safe cryptographic token."""
    return secrets.token_urlsafe(length_bytes)


def hash_token(raw_token: str) -> str:
    """Compute constant SHA-256 hex digest for token storage and lookup."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_recovery_codes(count: int = 10, length: int = 10) -> list[str]:
    """Generate single-use alphanumeric recovery codes for account recovery."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # Unambiguous characters
    codes: list[str] = []
    for _ in range(count):
        code = "".join(secrets.choice(alphabet) for _ in range(length))
        # Format as XXXXX-XXXXX
        formatted = f"{code[:5]}-{code[5:]}"
        codes.append(formatted)
    return codes
