"""WealthOS Enterprise Integrations Service Layer.

Provides:
- Webhook signature verification (HMAC-SHA256)
- Replay attack defense (time window <= 300s)
- Provider sync orchestration
- Consent validation before data access
"""

import hashlib
import hmac
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.domains.integrations.adapters import (
    get_provider_adapter,
    list_registered_adapters,
)
from app.domains.integrations.models import (
    FinancialProvider,
    ProviderConnection,
    ProviderConsent,
    ProviderSyncCursor,
)
from app.domains.integrations.providers import FinancialProviderService

logger = get_logger("wealthos.integrations.service")

# Replay protection threshold: 300 seconds (5 minutes)
MAX_WEBHOOK_AGE_SECONDS = 300


class IntegrationError(Exception):
    """Base error for enterprise integrations."""
    pass


class AuthenticationError(IntegrationError):
    """Authentication or webhook signature failure."""
    pass


class NotFoundError(IntegrationError):
    """Requested provider or resource not found."""
    pass


class BusinessLogicError(IntegrationError):
    """Business logic or missing consent constraint violation."""
    pass
from app.domains.integrations.adapters import (
    get_provider_adapter,
    list_registered_adapters,
)
from app.domains.integrations.models import (
    FinancialProvider,
    ProviderConnection,
    ProviderConsent,
    ProviderSyncCursor,
)
from app.domains.integrations.providers import FinancialProviderService

logger = get_logger("wealthos.integrations.service")

# Replay protection threshold: 300 seconds (5 minutes)
MAX_WEBHOOK_AGE_SECONDS = 300


class EnterpriseIntegrationService:
    """Orchestrates enterprise external provider connections, consent, and webhook security."""

    @staticmethod
    async def seed_default_providers(session: AsyncSession) -> list[FinancialProvider]:
        """Ensure all registered adapters have corresponding database catalog records."""
        adapters = list_registered_adapters()
        results: list[FinancialProvider] = []
        for adapter in adapters:
            provider = await FinancialProviderService.get_or_create_provider(
                session=session,
                provider_key=adapter.provider_key,
                name=adapter.display_name,
                category=adapter.category,
                supported_products=["BANK_ACCOUNTS", "TRANSACTIONS"]
                if adapter.category != "MARKET_DATA"
                else ["QUOTES", "NAVS"],
                auth_type="OAUTH2" if adapter.category != "MARKET_DATA" else "API_KEY",
            )
            results.append(provider)
        await session.flush()
        return results

    @staticmethod
    async def list_providers(session: AsyncSession) -> list[FinancialProvider]:
        """List all available financial providers."""
        await EnterpriseIntegrationService.seed_default_providers(session)
        stmt = select(FinancialProvider).order_by(FinancialProvider.name.asc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def record_user_consent(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        provider_id: uuid.UUID,
        scopes_granted: list[str],
        purpose: str,
        valid_days: int = 365,
        dpdp_notice_version: str = "1.0.0",
    ) -> ProviderConsent:
        """Validate provider exists and record explicit DPDP Act compliant consent."""
        stmt = select(FinancialProvider).where(FinancialProvider.id == provider_id)
        res = await session.execute(stmt)
        provider = res.scalar_one_or_none()
        if not provider:
            raise NotFoundError(f"Financial provider {provider_id} not found.")

        consent = await FinancialProviderService.record_dpdp_consent(
            session=session,
            tenant_id=tenant_id,
            user_id=user_id,
            provider_id=provider_id,
            scopes_granted=scopes_granted,
            purpose=purpose,
            valid_days=valid_days,
            dpdp_notice_version=dpdp_notice_version,
        )
        await session.flush()
        return consent

    @staticmethod
    async def list_user_consents(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> list[ProviderConsent]:
        """List all active, unrevoked consents for user."""
        stmt = (
            select(ProviderConsent)
            .where(
                ProviderConsent.tenant_id == tenant_id,
                ProviderConsent.user_id == user_id,
                ProviderConsent.revoked_at.is_(None),
                ProviderConsent.valid_until > datetime.now(UTC),
            )
            .order_by(ProviderConsent.created_at.desc())
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def create_connection(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        provider_id: uuid.UUID,
        credentials: dict[str, Any],
        account_count: int = 1,
    ) -> ProviderConnection:
        """Verify valid user consent exists before establishing provider connection."""
        # Check active consent
        consents = await EnterpriseIntegrationService.list_user_consents(
            session, tenant_id, user_id
        )
        active_consent = next((c for c in consents if c.provider_id == provider_id), None)
        if not active_consent:
            raise BusinessLogicError(
                "Consent required: Valid DPDP Act consent must be recorded before connecting to provider."
            )

        # Store encrypted credentials
        if credentials:
            await FinancialProviderService.store_provider_credentials(
                session=session,
                tenant_id=tenant_id,
                provider_id=provider_id,
                credentials_dict=credentials,
            )

        conn = await FinancialProviderService.create_connection(
            session=session,
            tenant_id=tenant_id,
            provider_id=provider_id,
            account_count=account_count,
        )
        await session.flush()
        return conn

    @staticmethod
    async def list_connections(
        session: AsyncSession,
        tenant_id: uuid.UUID,
    ) -> list[ProviderConnection]:
        """List provider connections for tenant."""
        stmt = (
            select(ProviderConnection)
            .where(ProviderConnection.tenant_id == tenant_id)
            .order_by(ProviderConnection.created_at.desc())
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def execute_sync(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        connection_id: uuid.UUID,
        sync_mode: str = "INCREMENTAL",
    ) -> dict[str, Any]:
        """Execute synchronization for a provider connection."""
        stmt = select(ProviderConnection).where(
            ProviderConnection.id == connection_id,
            ProviderConnection.tenant_id == tenant_id,
        )
        res = await session.execute(stmt)
        conn = res.scalar_one_or_none()
        if not conn:
            raise NotFoundError(f"Provider connection {connection_id} not found.")

        # Get provider
        p_stmt = select(FinancialProvider).where(FinancialProvider.id == conn.provider_id)
        p_res = await session.execute(p_stmt)
        provider = p_res.scalar_one_or_none()
        if not provider:
            raise NotFoundError("Associated financial provider not found.")

        adapter = get_provider_adapter(provider.provider_key)
        if not adapter:
            raise BusinessLogicError(f"No adapter registered for provider key: {provider.provider_key}")

        # Decrypt credentials
        credentials = await FinancialProviderService.decrypt_provider_credentials(
            session, tenant_id, conn.provider_id
        ) or {}

        # Fetch accounts & transactions
        accounts = await adapter.fetch_accounts(credentials)
        records, next_cursor = await adapter.fetch_transactions(
            credentials,
            accounts[0]["external_account_id"] if accounts else "default_acc",
        )

        # Advance cursor
        await FinancialProviderService.advance_sync_cursor(
            session=session,
            tenant_id=tenant_id,
            connection_id=conn.id,
            new_cursor_token=next_cursor,
        )
        await session.flush()

        return {
            "connection_id": conn.id,
            "status": "SUCCESS",
            "records_synced": len(records),
            "cursor_token": next_cursor,
            "synced_at": datetime.now(UTC),
        }

    @staticmethod
    async def revoke_connection(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        connection_id: uuid.UUID,
    ) -> dict[str, Any]:
        """Revoke provider connection, shred encrypted credentials, and revoke DPDP consent."""
        from sqlalchemy import delete
        from app.domains.integrations.models import ProviderCredential

        stmt = select(ProviderConnection).where(
            ProviderConnection.id == connection_id,
            ProviderConnection.tenant_id == tenant_id,
        )
        res = await session.execute(stmt)
        conn = res.scalar_one_or_none()
        if not conn:
            raise NotFoundError(f"Provider connection {connection_id} not found.")

        provider_id = conn.provider_id
        conn.status = "REVOKED"
        conn.error_summary = "Access revoked by user. Credentials shredded."

        # Shred encrypted credentials
        cred_stmt = delete(ProviderCredential).where(
            ProviderCredential.tenant_id == tenant_id,
            ProviderCredential.provider_id == provider_id,
        )
        await session.execute(cred_stmt)

        # Revoke active DPDP consents
        consent_stmt = select(ProviderConsent).where(
            ProviderConsent.tenant_id == tenant_id,
            ProviderConsent.user_id == user_id,
            ProviderConsent.provider_id == provider_id,
        )
        c_res = await session.execute(consent_stmt)
        consents = c_res.scalars().all()
        now = datetime.now(UTC)
        for c in consents:
            c.revoked_at = now

        await session.flush()
        return {
            "status": "REVOKED",
            "connection_id": connection_id,
            "provider_id": provider_id,
            "credentials_shredded": True,
            "revoked_at": now.isoformat(),
        }

    @staticmethod
    def verify_webhook_signature_and_freshness(
        payload_bytes: bytes,
        signature_header: str | None,
        timestamp_header: str | None,
        secret: str,
    ) -> bool:
        """Verify HMAC-SHA256 signature and replay prevention timestamp window.
        
        Header format expected:
        - X-WealthOS-Signature: hex string of HMAC-SHA256(secret, timestamp + "." + body)
        - X-WealthOS-Timestamp: unix timestamp string (seconds)
        """
        if not signature_header or not timestamp_header:
            raise AuthenticationError("Missing required webhook authentication headers.")

        try:
            ts = int(timestamp_header)
        except ValueError:
            raise AuthenticationError("Invalid webhook timestamp format.")

        current_ts = int(time.time())
        if abs(current_ts - ts) > MAX_WEBHOOK_AGE_SECONDS:
            raise AuthenticationError(
                f"Webhook timestamp expired or in the future: age {abs(current_ts - ts)}s exceeds {MAX_WEBHOOK_AGE_SECONDS}s."
            )

        # Compute HMAC over "{ts}.{payload}"
        signed_payload = f"{ts}.".encode("utf-8") + payload_bytes
        expected_sig = hmac.new(
            secret.encode("utf-8"), signed_payload, hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, signature_header):
            raise AuthenticationError("Invalid webhook HMAC-SHA256 signature.")

        return True
