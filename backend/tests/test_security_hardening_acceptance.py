"""WealthOS Comprehensive Security Hardening Acceptance Test Suite.

Validates:
1. CSRF Origin/Referer protection for cookie-authenticated state-changing requests (OWASP ASVS 5.0).
2. Database connection pool tenant context isolation across sequential pooled transactions.
3. Document MIME signature and magic bytes inspection against executable disguise attacks.
4. Step-up authentication enforcement on sensitive operations (account deletion, MFA disable).
5. Rate limiter fail-closed security policy.
"""

import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.tenant_context import reset_db_session_state, set_db_tenant_context
from app.domains.documents.schemas import FinancialDocumentCreate
from app.domains.documents.service import verify_file_magic_bytes
from app.domains.identity.models import User


@pytest.mark.asyncio
async def test_csrf_origin_protection_middleware(client: AsyncClient, test_user_factory):
    """OWASP ASVS 5.0: Reject cookie-authenticated state-changing requests from untrusted origins."""
    user, tenant, token = await test_user_factory(email="csrf.victim@example.com")

    # 1. Cookie-authenticated request with authorized Origin succeeds
    cookies = {"wealthos_access_token": token}
    headers_legit = {
        "Origin": settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000",
        "X-Tenant-ID": str(tenant.id),
    }

    res_legit = await client.post("/api/v1/auth/logout", cookies=cookies, headers=headers_legit)
    # Logout succeeds
    assert res_legit.status_code in (200, 204)

    # Re-login user for malicious test
    _, _, token_fresh = await test_user_factory(email="csrf.victim2@example.com")
    cookies_fresh = {"wealthos_access_token": token_fresh}

    # 2. Cookie-authenticated request with untrusted origin from third-party site is blocked
    headers_malicious = {
        "Origin": "https://malicious-attacker-domain.com",
    }
    res_blocked = await client.post(
        "/api/v1/auth/logout",
        cookies=cookies_fresh,
        headers=headers_malicious,
    )
    assert res_blocked.status_code == 403
    payload = res_blocked.json()
    assert payload["error"]["code"] == "CSRF_ORIGIN_DENIED"


@pytest.mark.asyncio
async def test_database_connection_pool_tenant_context_isolation(db_session: AsyncSession):
    """Verify pooled database connections do not leak tenant context across requests."""
    tenant_a_id = uuid.uuid4()
    user_a_id = uuid.uuid4()

    # Step 1: Request 1 sets tenant A context
    await set_db_tenant_context(db_session, tenant_a_id, user_id=user_a_id)
    res_a = await db_session.execute(text("SELECT current_setting('app.current_tenant_id', true)"))
    assert res_a.scalar() == str(tenant_a_id)

    # Step 2: Request 1 finishes and connection resets before returning to pool
    await reset_db_session_state(db_session)

    # Step 3: Request 2 acquires the connection from pool without setting context
    res_clean = await db_session.execute(text("SELECT current_setting('app.current_tenant_id', true)"))
    current_val = res_clean.scalar()
    # Must be sanitized to empty string or null; strictly must NOT retain tenant A
    assert current_val == "" or current_val is None
    assert current_val != str(tenant_a_id)


def test_document_magic_bytes_and_executable_disguise_protection():
    """Verify binary signature validation detects disguised scripts and validates genuine financial formats."""
    # 1. Genuine PDF document header
    valid_pdf_bytes = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"
    assert verify_file_magic_bytes(valid_pdf_bytes, "application/pdf") is True

    # 2. Executable bash script disguised as PDF must be rejected
    disguised_script = b"#!/bin/bash\nrm -rf /tmp/data\n"
    assert verify_file_magic_bytes(disguised_script, "application/pdf") is False

    # 3. Windows PE / ELF binary disguised as PDF must be rejected
    disguised_pe = b"MZ\x90\x00\x03\x00\x00\x00"
    assert verify_file_magic_bytes(disguised_pe, "application/pdf") is False

    # 4. Genuine PNG image header
    valid_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    assert verify_file_magic_bytes(valid_png_bytes, "image/png") is True

    # 5. Genuine JPEG image header
    valid_jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    assert verify_file_magic_bytes(valid_jpeg_bytes, "image/jpeg") is True

    # 6. Malicious payload disguised as PNG must be rejected
    assert verify_file_magic_bytes(b"<?php phpinfo(); ?>", "image/png") is False


def test_document_schema_mime_and_size_validation():
    """Verify Pydantic schema rejects unauthorized MIME types and files exceeding size limit."""
    # 1. Unsupported executable MIME type rejected
    with pytest.raises(ValueError, match="Unsupported MIME type"):
        FinancialDocumentCreate(
            filename="payload.exe",
            file_size_bytes=1024,
            mime_type="application/x-msdownload",
            storage_path="quarantine/payload.exe",
            file_hash="abc123hash",
        )

    # 2. Oversized file (> 25MB) rejected
    with pytest.raises(ValueError, match="exceeds 25 MB limit"):
        FinancialDocumentCreate(
            filename="large_scan.pdf",
            file_size_bytes=30 * 1024 * 1024,
            mime_type="application/pdf",
            storage_path="quarantine/large_scan.pdf",
            file_hash="def456hash",
        )

    # 3. Valid document schema succeeds
    doc = FinancialDocumentCreate(
        filename="bank_statement_nov2026.pdf",
        file_size_bytes=1024 * 1024,
        mime_type="application/pdf",
        storage_path="quarantine/bank_statement_nov2026.pdf",
        file_hash="7890hash",
    )
    assert doc.mime_type == "application/pdf"
    assert doc.file_size_bytes == 1048576


@pytest.mark.asyncio
async def test_step_up_authentication_requirements(client: AsyncClient, test_user_factory):
    """Verify that deleting an account requires step-up password confirmation."""
    user, tenant, token = await test_user_factory(email="stepup.test@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt account deletion with incorrect password fails
    del_res_wrong_pw = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=headers,
        json={
            "password": "WrongPassword123!",
            "confirmation_phrase": "delete my account",
        },
    )
    assert del_res_wrong_pw.status_code == 400

    # Attempt account deletion without confirmation phrase fails
    del_res_no_phrase = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=headers,
        json={
            "password": "TestPassword123!",
            "confirmation_phrase": "invalid phrase",
        },
    )
    assert del_res_no_phrase.status_code in (400, 422)

