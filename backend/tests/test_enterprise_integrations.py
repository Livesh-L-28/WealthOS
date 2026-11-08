"""WealthOS Enterprise Integrations & Webhook Hardening Test Suite.

Validates:
1. Financial Provider Catalog Seeding & Discovery.
2. DPDP Act 2023 Explicit Consent Management (scopes, purpose, validity).
3. AES-256-GCM Envelope Encryption for provider credentials.
4. Normalized Adapter Sync Execution (RBI Account Aggregator, Market Data).
5. HMAC-SHA256 Webhook Signature Verification and Replay Attack Protection (300s window).
"""

import hashlib
import hmac
import time
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.tenant_context import set_db_tenant_context
from app.domains.integrations.adapters import (
    AccountAggregatorAdapter,
    MarketDataAdapter,
    get_provider_adapter,
)
from app.domains.integrations.models import FinancialProvider
from app.domains.integrations.service import (
    MAX_WEBHOOK_AGE_SECONDS,
    AuthenticationError,
    BusinessLogicError,
    EnterpriseIntegrationService,
)


@pytest.mark.asyncio
async def test_provider_catalog_seeding_and_retrieval(db_session: AsyncSession, test_user_factory):
    """Verify provider catalog seeds all default adapters and lists them correctly."""
    user, tenant, _ = await test_user_factory(email="integrations.catalog@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    providers = await EnterpriseIntegrationService.list_providers(db_session)
    assert len(providers) >= 3

    keys = {p.provider_key for p in providers}
    assert "rbi_account_aggregator" in keys
    assert "nse_bse_market_feed" in keys
    assert "cas_broker_adapter" in keys

    # Verify adapter lookup
    aa_adapter = get_provider_adapter("rbi_account_aggregator")
    assert aa_adapter is not None
    assert aa_adapter.category == "ACCOUNT_AGGREGATOR"

    market_adapter = get_provider_adapter("nse_bse_market_feed")
    assert market_adapter is not None
    assert isinstance(market_adapter, MarketDataAdapter)


@pytest.mark.asyncio
async def test_dpdp_consent_lifecycle(db_session: AsyncSession, test_user_factory):
    """Verify explicit DPDP Act 2023 user consent creation and active query filtering."""
    user, tenant, _ = await test_user_factory(email="integrations.consent@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    providers = await EnterpriseIntegrationService.list_providers(db_session)
    provider = providers[0]

    # Record consent
    consent = await EnterpriseIntegrationService.record_user_consent(
        session=db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        provider_id=provider.id,
        scopes_granted=["BANK_STATEMENTS", "TRANSACTIONS_READ"],
        purpose="Automated wealth reconciliation and cash flow budgeting",
        valid_days=180,
    )
    assert consent.tenant_id == tenant.id
    assert consent.user_id == user.id
    assert "BANK_STATEMENTS" in consent.scopes_granted
    assert consent.dpdp_notice_version == "1.0.0"

    # Query active consents
    active = await EnterpriseIntegrationService.list_user_consents(db_session, tenant.id, user.id)
    assert any(c.id == consent.id for c in active)


@pytest.mark.asyncio
async def test_provider_connection_and_envelope_encryption(db_session: AsyncSession, test_user_factory):
    """Verify connection fails without consent, and securely encrypts credentials via AES-256-GCM."""
    user, tenant, _ = await test_user_factory(email="integrations.crypto@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    providers = await EnterpriseIntegrationService.list_providers(db_session)
    provider = providers[0]

    # Attempt connection without prior consent -> must raise BusinessLogicError
    with pytest.raises(BusinessLogicError, match="Consent required"):
        await EnterpriseIntegrationService.create_connection(
            session=db_session,
            tenant_id=tenant.id,
            user_id=user.id,
            provider_id=provider.id,
            credentials={"client_id": "aa_test_id", "client_secret": "SuperSecretKey#999"},
        )

    # Now grant valid consent
    await EnterpriseIntegrationService.record_user_consent(
        session=db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        provider_id=provider.id,
        scopes_granted=["ACCOUNTS_READ"],
        purpose="Testing envelope encrypted credentials",
        valid_days=90,
    )

    # Create connection with credentials
    creds_input = {"client_id": "aa_test_id", "api_token": "token_xyz_123456789"}
    conn = await EnterpriseIntegrationService.create_connection(
        session=db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        provider_id=provider.id,
        credentials=creds_input,
        account_count=2,
    )
    assert conn.status == "CONNECTED"
    assert conn.account_count == 2

    # Verify decrypt recovers identical payload
    from app.domains.integrations.providers import FinancialProviderService

    decrypted = await FinancialProviderService.decrypt_provider_credentials(
        db_session, tenant.id, provider.id
    )
    assert decrypted == creds_input


@pytest.mark.asyncio
async def test_provider_adapter_sync_execution(db_session: AsyncSession, test_user_factory):
    """Verify execution of adapter sync advances pagination cursor and returns records."""
    user, tenant, _ = await test_user_factory(email="integrations.sync@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    providers = await EnterpriseIntegrationService.list_providers(db_session)
    aa_provider = next(p for p in providers if p.provider_key == "rbi_account_aggregator")

    # Consent and connect
    await EnterpriseIntegrationService.record_user_consent(
        session=db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        provider_id=aa_provider.id,
        scopes_granted=["TRANSACTIONS"],
        purpose="Periodic incremental sync",
    )
    conn = await EnterpriseIntegrationService.create_connection(
        session=db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        provider_id=aa_provider.id,
        credentials={"auth_token": "mock_aa_token"},
    )

    # Run sync
    sync_res = await EnterpriseIntegrationService.execute_sync(
        session=db_session,
        tenant_id=tenant.id,
        connection_id=conn.id,
    )
    assert sync_res["status"] == "SUCCESS"
    assert sync_res["records_synced"] == 2
    assert sync_res["cursor_token"].startswith("cursor_aa_")


def test_webhook_hmac_verification_and_replay_protection():
    """Verify HMAC-SHA256 signature verification and replay prevention time windows."""
    secret = "TestWebhookSecret#2026_EnterpriseKey"
    raw_body = b'{"event_id": "evt_001", "event_type": "account.synced", "data": {"status": "SUCCESS"}}'
    current_ts = int(time.time())

    # 1. Valid signature & fresh timestamp
    signed_payload = f"{current_ts}.".encode("utf-8") + raw_body
    valid_sig = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()

    verified = EnterpriseIntegrationService.verify_webhook_signature_and_freshness(
        payload_bytes=raw_body,
        signature_header=valid_sig,
        timestamp_header=str(current_ts),
        secret=secret,
    )
    assert verified is True

    # 2. Tampered body -> signature mismatch
    tampered_body = b'{"event_id": "evt_001", "event_type": "account.synced", "data": {"status": "MALICIOUS"}}'
    with pytest.raises(AuthenticationError, match="Invalid webhook HMAC-SHA256 signature"):
        EnterpriseIntegrationService.verify_webhook_signature_and_freshness(
            payload_bytes=tampered_body,
            signature_header=valid_sig,
            timestamp_header=str(current_ts),
            secret=secret,
        )

    # 3. Replay attack: expired timestamp (> 300s old)
    stale_ts = current_ts - (MAX_WEBHOOK_AGE_SECONDS + 10)
    stale_payload = f"{stale_ts}.".encode("utf-8") + raw_body
    stale_sig = hmac.new(secret.encode("utf-8"), stale_payload, hashlib.sha256).hexdigest()

    with pytest.raises(AuthenticationError, match="Webhook timestamp expired or in the future"):
        EnterpriseIntegrationService.verify_webhook_signature_and_freshness(
            payload_bytes=raw_body,
            signature_header=stale_sig,
            timestamp_header=str(stale_ts),
            secret=secret,
        )

    # 4. Future attack: timestamp > 300s in future
    future_ts = current_ts + (MAX_WEBHOOK_AGE_SECONDS + 10)
    future_payload = f"{future_ts}.".encode("utf-8") + raw_body
    future_sig = hmac.new(secret.encode("utf-8"), future_payload, hashlib.sha256).hexdigest()

    with pytest.raises(AuthenticationError, match="Webhook timestamp expired or in the future"):
        EnterpriseIntegrationService.verify_webhook_signature_and_freshness(
            payload_bytes=raw_body,
            signature_header=future_sig,
            timestamp_header=str(future_ts),
            secret=secret,
        )


@pytest.mark.asyncio
async def test_integrations_api_endpoints_and_webhook_route(
    client, db_session: AsyncSession, test_user_factory
):
    """Validate all REST endpoints under /api/v1/integrations."""
    user, tenant, token = await test_user_factory(email="integrations.api@example.com")
    auth_headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    # 1. GET /api/v1/integrations/providers
    resp = await client.get("/api/v1/integrations/providers", headers=auth_headers)
    assert resp.status_code == 200
    providers_data = resp.json()
    assert len(providers_data) >= 3
    aa_provider = next(p for p in providers_data if p["provider_key"] == "rbi_account_aggregator")

    # 2. POST /api/v1/integrations/consents
    consent_payload = {
        "provider_id": aa_provider["id"],
        "scopes_granted": ["BANK_STATEMENTS", "TRANSACTIONS_READ"],
        "purpose": "Automated ledger reconciliation via REST API",
        "valid_days": 180,
        "dpdp_notice_version": "1.0.0",
    }
    resp = await client.post(
        "/api/v1/integrations/consents", json=consent_payload, headers=auth_headers
    )
    assert resp.status_code == 201
    consent_res = resp.json()
    assert consent_res["dpdp_notice_version"] == "1.0.0"

    # 3. GET /api/v1/integrations/consents
    resp = await client.get("/api/v1/integrations/consents", headers=auth_headers)
    assert resp.status_code == 200
    consents_list = resp.json()
    assert len(consents_list) >= 1

    # 4. POST /api/v1/integrations/connections
    conn_payload = {
        "provider_id": aa_provider["id"],
        "credentials": {"client_id": "api_test_client", "client_secret": "APISecret#2026"},
        "account_count": 2,
    }
    resp = await client.post(
        "/api/v1/integrations/connections", json=conn_payload, headers=auth_headers
    )
    assert resp.status_code == 201
    conn_res = resp.json()
    assert conn_res["status"] == "CONNECTED"
    connection_id = conn_res["id"]

    # 5. GET /api/v1/integrations/connections
    resp = await client.get("/api/v1/integrations/connections", headers=auth_headers)
    assert resp.status_code == 200
    conns_list = resp.json()
    assert len(conns_list) >= 1

    # 6. POST /api/v1/integrations/sync
    sync_payload = {
        "connection_id": connection_id,
        "sync_mode": "INCREMENTAL",
    }
    resp = await client.post(
        "/api/v1/integrations/sync", json=sync_payload, headers=auth_headers
    )
    assert resp.status_code == 200
    sync_res = resp.json()
    assert sync_res["status"] == "SUCCESS"
    assert sync_res["records_synced"] == 2

    # 7. POST /api/v1/integrations/webhooks/{provider_key} with valid HMAC
    secret = settings.SECRET_KEY
    webhook_body = b'{"event_id": "wh_001", "event_type": "account.synced", "data": {"status": "SUCCESS"}}'
    current_ts = int(time.time())
    signed_payload = f"{current_ts}.".encode("utf-8") + webhook_body
    valid_sig = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()

    wh_headers = {
        "X-WealthOS-Signature": valid_sig,
        "X-WealthOS-Timestamp": str(current_ts),
        "Content-Type": "application/json",
    }
    resp = await client.post(
        "/api/v1/integrations/webhooks/rbi_account_aggregator",
        content=webhook_body,
        headers=wh_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ACCEPTED"

    # 8. Webhook with invalid signature -> 401
    bad_headers = {
        "X-WealthOS-Signature": "invalid_hex_signature_99999",
        "X-WealthOS-Timestamp": str(current_ts),
        "Content-Type": "application/json",
    }
    resp = await client.post(
        "/api/v1/integrations/webhooks/rbi_account_aggregator",
        content=webhook_body,
        headers=bad_headers,
    )
    assert resp.status_code == 401

