"""WealthOS Scoped Developer API Keys Service.

Issues, authenticates, and enforces permissions on programmatic API keys:
Format: `wos_live_<8-character prefix>_<32-character secret>`
Storage: SHA-256 hash only. Raw secret displayed only upon creation.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.identity.models import UserApiKey

logger = get_logger("wealthos.api_keys")

KEY_PREFIX_IDENTIFIER = "wos_"


class ApiKeyError(Exception):
    """Base exception for API key management and validation errors."""


class InvalidApiKeyError(ApiKeyError):
    """Raised when an API key is malformed, not found, or has an invalid secret."""


class ExpiredApiKeyError(ApiKeyError):
    """Raised when an API key has passed its expires_at timestamp."""


class InsufficientScopeError(ApiKeyError):
    """Raised when an API key lacks required authorization scopes."""


class ApiKeyService:
    """Manages creation, hashing, and authorization verification of API keys."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def hash_secret(secret: str) -> str:
        """Compute SHA-256 digest of secret token."""
        return hashlib.sha256(secret.encode("utf-8")).hexdigest()

    async def create_api_key(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        key_name: str,
        scopes: list[str] | None = None,
        expires_at: datetime | None = None,
    ) -> tuple[UserApiKey, str]:
        """Generate a new scoped API key and store its hash.
        
        Returns tuple of (UserApiKey database record, plaintext key token).
        """
        prefix_part = secrets.token_hex(4)  # 8 hex chars -> prefix is "wos_" + 8 chars = 12 chars
        secret_part = secrets.token_urlsafe(24)  # ~32 chars
        raw_key = f"{KEY_PREFIX_IDENTIFIER}{prefix_part}_{secret_part}"

        key_hash = self.hash_secret(raw_key)
        valid_scopes = scopes or ["read"]

        api_key = UserApiKey(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            key_name=key_name,
            key_prefix=f"{KEY_PREFIX_IDENTIFIER}{prefix_part}",
            key_hash=key_hash,
            scopes=valid_scopes,
            is_active=True,
            expires_at=expires_at,
            created_at=datetime.now(UTC),
        )
        self.session.add(api_key)
        await self.session.flush()

        logger.info(f"Generated API key '{key_name}' (prefix={api_key.key_prefix}) for user {user_id}")
        return api_key, raw_key

    async def authenticate_api_key(
        self,
        raw_token: str,
        required_scope: str | None = None,
    ) -> UserApiKey:
        """Verify API key authenticity, expiration, and scope authorization."""
        if not raw_token or not raw_token.startswith(KEY_PREFIX_IDENTIFIER):
            raise InvalidApiKeyError("Malformed API key: missing 'wos_' header prefix.")

        parts = raw_token.split("_")
        if len(parts) < 3:
            raise InvalidApiKeyError("Malformed API key format.")

        prefix = f"{parts[0]}_{parts[1]}"  # wos_<8_hex_chars>
        key_hash = self.hash_secret(raw_token)

        stmt = select(UserApiKey).where(
            UserApiKey.key_prefix == prefix,
            UserApiKey.key_hash == key_hash,
            UserApiKey.is_active == True,
        )
        res = await self.session.execute(stmt)
        key_record = res.scalar_one_or_none()

        if not key_record:
            raise InvalidApiKeyError("Invalid or revoked API key.")

        # Expiration Check
        if key_record.expires_at and key_record.expires_at < datetime.now(UTC):
            raise ExpiredApiKeyError("API key has expired.")

        # Scope Enforcement
        if required_scope and required_scope not in key_record.scopes and "*" not in key_record.scopes:
            raise InsufficientScopeError(
                f"API key lacks required scope '{required_scope}'. Granted: {key_record.scopes}"
            )

        # Update last used
        key_record.last_used_at = datetime.now(UTC)
        await self.session.flush()
        return key_record

    async def revoke_api_key(self, tenant_id: uuid.UUID, key_id: uuid.UUID) -> bool:
        """Revoke and deactivate an API key."""
        stmt = select(UserApiKey).where(
            UserApiKey.id == key_id,
            UserApiKey.tenant_id == tenant_id,
        )
        res = await self.session.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            return False

        record.is_active = False
        await self.session.flush()
        logger.info(f"Revoked API key {key_id} for tenant {tenant_id}")
        return True
