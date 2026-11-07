"""Tests for Immutable Security Audit Logging, Event Dispatch, and Secret Scrubbing."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
