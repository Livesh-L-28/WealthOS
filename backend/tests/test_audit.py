"""Tests for Immutable Security Audit Logging, Event Dispatch, and Secret Scrubbing."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.audit.models import SecurityAuditLog
from app.domains.audit.service import scrub_sensitive_data


@pytest.mark.asyncio
async def test_secret_scrubbing_logic():
    """Verify that credentials, tokens, and passwords are never logged in audit metadata."""
    dirty_data = {
        "email": "user@example.com",
        "password": "SuperSecretPassword#2026",
        "current_password": "OldPassword#2026",
        "token": "secret_crypto_token_abcdef123456",
        "secret": "JBSWY3DPEHPK3PXP",
        "nested": {
            "recovery_codes": ["code1", "code2"],
            "safe_metadata": "allowed_value",
        },
    }

    cleaned = scrub_sensitive_data(dirty_data)
    assert cleaned["email"] == "user@example.com"
    assert cleaned["password"] == "[REDACTED]"
    assert cleaned["current_password"] == "[REDACTED]"
    assert cleaned["token"] == "[REDACTED]"
    assert cleaned["secret"] == "[REDACTED]"
    assert cleaned["nested"]["recovery_codes"] == "[REDACTED]"
    assert cleaned["nested"]["safe_metadata"] == "allowed_value"


@pytest.mark.asyncio
async def test_security_audit_logs_emitted_during_auth_events(
    client: AsyncClient, db_session: AsyncSession
):
    """Test that auth and tenant actions record immutable audit events."""
    # 1. Register
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "bob.dylan@example.com",
            "password": "SubterraneanSecret#2026",
            "first_name": "Bob",
            "last_name": "Dylan",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()["data"]
    user_id = uuid.UUID(reg_data["user_id"])
    personal_tenant_id = uuid.UUID(reg_data["personal_tenant_id"])
    await set_db_tenant_context(db_session, personal_tenant_id, user_id)

    # Verify registration audit entry
    reg_audit = (
        await db_session.execute(
            select(SecurityAuditLog).where(SecurityAuditLog.event_type == "user_registered")
        )
    ).scalar_one_or_none()
    assert reg_audit is not None
    assert reg_audit.status == "success"
    assert "password" not in reg_audit.details

    # 2. Failed login
    fail_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "bob.dylan@example.com", "password": "WrongPassword!1"},
    )
    assert fail_res.status_code == 401

    # Verify login failure audit entry
    fail_audit = (
        await db_session.execute(
            select(SecurityAuditLog).where(SecurityAuditLog.event_type == "login_failed")
        )
    ).scalar_one_or_none()
    assert fail_audit is not None
    assert fail_audit.status == "failure"


@pytest.mark.asyncio
async def test_tenant_audit_log_inspection_endpoint(client: AsyncClient, test_user_factory):
    """Test retrieving audit logs via tenant-scoped API."""
    user, tenant, token = await test_user_factory(
        email="audit.api@example.com",
        password="AuditApiPassword#2026",
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    # Create workspace to trigger an audit event
    create_res = await client.post(
        "/api/v1/tenants",
        json={"name": "Audited Workspace", "tenant_type": "household"},
        headers=headers,
    )
    assert create_res.status_code == 201
    new_tenant_id = create_res.json()["data"]["id"]

    # Read audit logs for new workspace
    new_headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": new_tenant_id,
    }
    audit_res = await client.get(
        f"/api/v1/tenants/{new_tenant_id}/audit-logs",
        headers=new_headers,
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()["data"]
    assert len(logs) >= 1
    event_types = [log_entry["event_type"] for log_entry in logs]
    assert "workspace_created" in event_types


@pytest.mark.asyncio
async def test_audit_log_database_level_immutability(db_session: AsyncSession, test_user_factory):
    """MANDATORY SECURITY RELEASE GATE: Verify that UPDATE and DELETE on audit logs are rejected by PostgreSQL."""
    user, tenant, _ = await test_user_factory(
        email="immutability@example.com",
        password="Immutability#2026",
    )
    await set_db_tenant_context(db_session, tenant.id, user.id)

    # Insert a valid audit log entry
    from app.domains.audit.models import SecurityAuditLog

    audit_id = uuid.uuid4()
    log_entry = SecurityAuditLog(
        id=audit_id,
        tenant_id=tenant.id,
        user_id=user.id,
        event_type="security_test_event",
        status="success",
        details={"info": "immutable record"},
    )
    db_session.add(log_entry)
    await db_session.commit()

    # 1. Attempt UPDATE via application role wealthos_app -> MUST FAIL
    with pytest.raises((ProgrammingError, DBAPIError)) as exc_update:
        await db_session.execute(
            text("UPDATE security_audit_logs SET status = 'tampered' WHERE id = :id;"),
            {"id": str(audit_id)},
        )
        await db_session.commit()

    assert any(
        phrase in str(exc_update.value).lower()
        for phrase in ["permission denied", "immutable", "row-level security"]
    )
    await db_session.rollback()

    # 2. Attempt DELETE via application role wealthos_app -> MUST FAIL
    with pytest.raises((ProgrammingError, DBAPIError)) as exc_delete:
        await db_session.execute(
            text("DELETE FROM security_audit_logs WHERE id = :id;"),
            {"id": str(audit_id)},
        )
        await db_session.commit()

    assert any(
        phrase in str(exc_delete.value).lower()
        for phrase in ["permission denied", "immutable", "row-level security"]
    )
    await db_session.rollback()


@pytest.mark.asyncio
async def test_recursive_secret_scrubbing_complex_nested_structures():
    """Verify recursive scrubbing against nested dicts, lists, sets, and tuples containing sensitive tokens."""
    nested_dirty_payload = {
        "request_id": "req-987654321",
        "user_meta": {
            "username": "fintech_user",
            "password": "UltraSecretPassword#2026",
            "api_key": "sk_live_998877665544332211",
            "token": "bearer_sample_token_value",
            "access_token": "jwt_access_token_value",
            "refresh_token": "opaque_refresh_token_value",
            "mfa_secret": "JBSWY3DPEHPK3PXP",
            "client_secret": "oauth_client_secret_xyz",
            "private_key": "-----BEGIN RSA PRIVATE KEY-----...",
        },
        "batch_operations": [
            {
                "item_id": 1,
                "recovery_codes": ["code-aaa-111", "code-bbb-222"],
                "public_note": "safe description",
            },
            {
                "item_id": 2,
                "nested_credentials": {
                    "current_password": "OldPassword#2026",
                    "new_password": "NewPassword#2026",
                    "status": "updated",
                },
            },
        ],
        "metadata_tuple": ("regular_value", "secret_token_in_tuple"),
        "audit_safe": True,
    }

    scrubbed = scrub_sensitive_data(nested_dirty_payload)

    # Verify non-sensitive values are preserved
    assert scrubbed["request_id"] == "req-987654321"
    assert scrubbed["user_meta"]["username"] == "fintech_user"
    assert scrubbed["batch_operations"][0]["item_id"] == 1
    assert scrubbed["batch_operations"][0]["public_note"] == "safe description"
    assert scrubbed["batch_operations"][1]["nested_credentials"]["status"] == "updated"
    assert scrubbed["audit_safe"] is True

    # Verify sensitive fields are strictly redacted
    assert scrubbed["user_meta"]["password"] == "[REDACTED]"
    assert scrubbed["user_meta"]["api_key"] == "[REDACTED]"
    assert scrubbed["user_meta"]["token"] == "[REDACTED]"
    assert scrubbed["user_meta"]["access_token"] == "[REDACTED]"
    assert scrubbed["user_meta"]["refresh_token"] == "[REDACTED]"
    assert scrubbed["user_meta"]["mfa_secret"] == "[REDACTED]"
    assert scrubbed["user_meta"]["client_secret"] == "[REDACTED]"
    assert scrubbed["user_meta"]["private_key"] == "[REDACTED]"
    assert scrubbed["batch_operations"][0]["recovery_codes"] == "[REDACTED]"
    assert scrubbed["batch_operations"][1]["nested_credentials"]["current_password"] == "[REDACTED]"
    assert scrubbed["batch_operations"][1]["nested_credentials"]["new_password"] == "[REDACTED]"
