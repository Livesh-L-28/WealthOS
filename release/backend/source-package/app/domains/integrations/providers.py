"""WealthOS Financial Provider Integrations Service.

Manages DPDP Act consents, AES-256-GCM envelope-encrypted credentials,
and cursor-based incremental sync feeds.
"""

import base64
import json
import os
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.identity.crypto import _derive_master_key
from app.domains.integrations.models import (
    FinancialProvider,
    ProviderConnection,
    ProviderConsent,
    ProviderCredential,
    ProviderSyncCursor,
)

logger = get_logger("wealthos.integrations.providers")


class FinancialProviderService:
    """Service orchestrating third-party financial aggregators and provider feeds."""

    @staticmethod
    async def get_or_create_provider(
        session: AsyncSession,
        provider_key: str,
        name: str,
        category: str,
        supported_products: list[str] | None = None,
        auth_type: str = "OAUTH2",
        capabilities: dict[str, Any] | None = None,
    ) -> FinancialProvider:
        """Fetch existing provider or register new financial provider."""
        stmt = select(FinancialProvider).where(FinancialProvider.provider_key == provider_key)
        res = await session.execute(stmt)
        provider = res.scalar_one_or_none()
        if not provider:
            provider = FinancialProvider(
                id=uuid.uuid4(),
                provider_key=provider_key,
                name=name,
                category=category,
                supported_products=supported_products or ["BANK_ACCOUNTS", "TRANSACTIONS"],
                auth_type=auth_type,
                capabilities=capabilities or {},
            )
            session.add(provider)
            await session.flush()
        return provider

    @staticmethod
    async def record_dpdp_consent(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        provider_id: uuid.UUID,
        scopes_granted: list[str],
        purpose: str,
        valid_days: int = 365,
        dpdp_notice_version: str = "1.0.0",
    ) -> ProviderConsent:
        """Record explicit, audit-compliant user consent under India DPDP Act 2023."""
        valid_until = datetime.now(UTC) + timedelta(days=valid_days)
        consent = ProviderConsent(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            provider_id=provider_id,
            scopes_granted=scopes_granted,
            purpose=purpose,
            valid_until=valid_until,
            dpdp_notice_version=dpdp_notice_version,
        )
        session.add(consent)
        await session.flush()
        return consent

    @staticmethod
    async def store_provider_credentials(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        provider_id: uuid.UUID,
        credentials_dict: dict[str, Any],
        expires_at: datetime | None = None,
    ) -> ProviderCredential:
        """Encrypt provider credentials using AES-256-GCM envelope encryption."""
        key = _derive_master_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)  # 96-bit IV
        raw_json = json.dumps(credentials_dict).encode("utf-8")
        # In cryptography.hazmat, AESGCM encrypt returns ciphertext + 16-byte tag
        encrypted_full = aesgcm.encrypt(nonce, raw_json, None)
        ciphertext = encrypted_full[:-16]
        tag = encrypted_full[-16:]

        cred = ProviderCredential(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            provider_id=provider_id,
            encrypted_data=base64.b64encode(ciphertext).decode("ascii"),
            iv=base64.b64encode(nonce).decode("ascii"),
            auth_tag=base64.b64encode(tag).decode("ascii"),
            key_version=1,
            expires_at=expires_at,
        )
        session.add(cred)
        await session.flush()
        return cred

    @staticmethod
    async def decrypt_provider_credentials(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        provider_id: uuid.UUID,
    ) -> dict[str, Any] | None:
        """Decrypt AES-256-GCM credentials and verify authentication tag."""
        stmt = (
            select(ProviderCredential)
            .where(
                ProviderCredential.tenant_id == tenant_id,
                ProviderCredential.provider_id == provider_id,
            )
            .order_by(ProviderCredential.created_at.desc())
        )
        res = await session.execute(stmt)
        cred = res.scalar_one_or_none()
        if not cred:
            return None

        key = _derive_master_key()
        aesgcm = AESGCM(key)
        nonce = base64.b64decode(cred.iv.encode("ascii"))
        ciphertext = base64.b64decode(cred.encrypted_data.encode("ascii"))
        tag = base64.b64decode(cred.auth_tag.encode("ascii"))

        # Recombine ciphertext + tag for AESGCM decryption
        combined = ciphertext + tag
        decrypted_bytes = aesgcm.decrypt(nonce, combined, None)
        return json.loads(decrypted_bytes.decode("utf-8"))

    @staticmethod
    async def create_connection(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        provider_id: uuid.UUID,
        account_count: int = 1,
    ) -> ProviderConnection:
        """Initialize connection between tenant and provider."""
        conn = ProviderConnection(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            provider_id=provider_id,
            status="CONNECTED",
            account_count=account_count,
            last_successful_sync_at=datetime.now(UTC),
        )
        session.add(conn)
        await session.flush()
        return conn

    @staticmethod
    async def advance_sync_cursor(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        connection_id: uuid.UUID,
        new_cursor_token: str,
    ) -> ProviderSyncCursor:
        """Update or create pagination cursor token for connection."""
        stmt = select(ProviderSyncCursor).where(
            ProviderSyncCursor.connection_id == connection_id,
            ProviderSyncCursor.tenant_id == tenant_id,
        )
        res = await session.execute(stmt)
        cursor = res.scalar_one_or_none()

        now = datetime.now(UTC)
        if cursor:
            cursor.cursor_token = new_cursor_token
            cursor.last_sync_timestamp = now
            cursor.updated_at = now
        else:
            cursor = ProviderSyncCursor(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                connection_id=connection_id,
                cursor_token=new_cursor_token,
                last_sync_timestamp=now,
            )
            session.add(cursor)

        # Update connection last sync time
        conn_stmt = select(ProviderConnection).where(
            ProviderConnection.id == connection_id,
            ProviderConnection.tenant_id == tenant_id,
        )
        conn_res = await session.execute(conn_stmt)
        conn = conn_res.scalar_one_or_none()
        if conn:
            conn.last_successful_sync_at = now
            conn.status = "CONNECTED"

        await session.flush()
        return cursor
