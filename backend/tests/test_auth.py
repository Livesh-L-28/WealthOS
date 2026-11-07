"""Comprehensive tests for WealthOS User Authentication and Identity Lifecycle."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.identity.models import (
    EmailVerificationToken,
    User,
    UserCredential,
)
from app.domains.tenants.models import TenantMembership


@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient, db_session: AsyncSession):
    """Test standard registration with valid NIST SP 800-63B credentials."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "sarah.connor@skynet.ai",
            "password": "CorrectHorseBatteryStaple!2026",
            "first_name": "Sarah",
            "last_name": "Connor",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "sarah.connor@skynet.ai"
    assert data["data"]["status"] == "pending_verification"
    user_id = uuid.UUID(data["data"]["user_id"])
    personal_tenant_id = uuid.UUID(data["data"]["personal_tenant_id"])

    # Verify user in database
    user = await db_session.get(User, user_id)
    assert user is not None
    assert user.email == "sarah.connor@skynet.ai"
    assert user.status == "pending_verification"

    # Verify credentials stored with Argon2id hash
    cred_stmt = select(UserCredential).where(UserCredential.user_id == user_id)
    cred = (await db_session.execute(cred_stmt)).scalar_one_or_none()
    assert cred is not None
    assert cred.password_hash.startswith("$argon2id$")

    # Verify membership in personal workspace
    await set_db_tenant_context(db_session, personal_tenant_id, user_id)
    mem_stmt = select(TenantMembership).where(
        TenantMembership.user_id == user_id,
        TenantMembership.tenant_id == personal_tenant_id,
    )
    membership = (await db_session.execute(mem_stmt)).scalar_one_or_none()
    assert membership is not None
    assert membership.is_owner is True


@pytest.mark.asyncio
async def test_register_password_policy_failures(client: AsyncClient):
    """Test NIST password policy violations are rejected."""
    # Too short (<12 characters)
    res_short = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "short@example.com",
            "password": "Short!1",
            "first_name": "Short",
            "last_name": "Password",
        },
    )
    assert res_short.status_code == 422

    # Common pattern / dictionary word
    res_common = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "common@example.com",
            "password": "password123456",
            "first_name": "Common",
            "last_name": "Word",
        },
    )
    assert res_common.status_code == 422


@pytest.mark.asyncio
async def test_register_duplicate_email_rejected(client: AsyncClient):
    """Test duplicate registration attempts are rejected with HTTP 409."""
    payload = {
        "email": "duplicate@example.com",
        "password": "SecurePassword#2026",
        "first_name": "First",
        "last_name": "User",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409


@pytest.mark.asyncio
async def test_login_success_and_cookie(client: AsyncClient, test_user_factory):
    """Test successful credential authentication and refresh cookie issuance."""
    user, tenant, _ = await test_user_factory(
        email="login.test@example.com",
        password="MySecretPassword$2026",
        status="active",
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "login.test@example.com",
            "password": "MySecretPassword$2026",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["active_tenant"]["id"] == str(tenant.id)

    # Verify HttpOnly cookie
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_password_and_lockout(
    client: AsyncClient, db_session: AsyncSession, test_user_factory
):
    """Test failed password attempts increment counter and trigger temporary lockout."""
    user, _, _ = await test_user_factory(
        email="lockout.test@example.com",
        password="RealPassword#2026",
        status="active",
    )

    # 5 consecutive failed attempts
    for _ in range(5):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "lockout.test@example.com", "password": "WrongPassword!1"},
        )
        assert res.status_code == 401

    # 6th attempt should be blocked by active lockout
    res6 = await client.post(
        "/api/v1/auth/login",
        json={"email": "lockout.test@example.com", "password": "WrongPassword!1"},
    )
    assert res6.status_code == 401
    assert "locked" in res6.json()["error"]["message"].lower()

    # Now even the correct password should be rejected while locked
    res_locked = await client.post(
        "/api/v1/auth/login",
        json={"email": "lockout.test@example.com", "password": "RealPassword#2026"},
    )
    assert res_locked.status_code == 401
    assert "locked" in res_locked.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_email_verification_flow(client: AsyncClient, db_session: AsyncSession):
    """Test email verification token consumption and account activation."""
    # Register user
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "alice.walker@example.com",
            "password": "CompliantSecret#2026",
            "first_name": "Alice",
            "last_name": "Walker",
        },
    )
    assert reg_res.status_code == 201
    user_id = uuid.UUID(reg_res.json()["data"]["user_id"])

    # Retrieve verification token from DB
    stmt = select(EmailVerificationToken).where(
        EmailVerificationToken.user_id == user_id,
        EmailVerificationToken.consumed_at.is_(None),
    )
    tok = (await db_session.execute(stmt)).scalar_one_or_none()
    assert tok is not None

    # Test invalid token
    bad_res = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": "invalid_verification_token_1234567890"},
    )
    assert bad_res.status_code == 400

    # For testing, we inspect the test email outbox
    from app.domains.identity.email_service import get_email_service

    outbox = get_email_service().get_outbox()
    verification_email = next((e for e in outbox if e["to"] == "alice.walker@example.com"), None)
    assert verification_email is not None
    raw_token = verification_email["token"]

    # Verify with captured raw token
    good_res = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": raw_token},
    )
    assert good_res.status_code == 200
    assert good_res.json()["success"] is True

    # Check user is now active
    user = await db_session.get(User, user_id)
    assert user.status == "active"
    assert user.email_verified_at is not None


@pytest.mark.asyncio
async def test_password_reset_flow(
    client: AsyncClient, db_session: AsyncSession, test_user_factory
):
    """Test requesting and completing password reset."""
    user, _, _ = await test_user_factory(
        email="reset.user@example.com",
        password="OldPassword#2026",
        status="active",
    )

    # 1. Request reset
    req_res = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset.user@example.com"},
    )
    assert req_res.status_code == 200

    # 2. Extract reset token from outbox
    from app.domains.identity.email_service import get_email_service

    outbox = get_email_service().get_outbox()
    reset_email = next(
        (e for e in outbox if e["to"] == "reset.user@example.com" and "token" in e), None
    )
    assert reset_email is not None
    raw_token = reset_email["token"]

    # 3. Submit new password
    reset_res = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": raw_token,
            "new_password": "BrandNewPassword#2026",
        },
    )
    assert reset_res.status_code == 200

    # 4. Sign in with new password
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "reset.user@example.com",
            "password": "BrandNewPassword#2026",
        },
    )
    assert login_res.status_code == 200


@pytest.mark.asyncio
async def test_change_password_authenticated(client: AsyncClient, test_user_factory):
    """Test authenticated password change."""
    user, _, token = await test_user_factory(
        email="change.password@example.com",
        password="InitialPassword#2026",
        status="active",
    )

    headers = {"Authorization": f"Bearer {token}"}

    # Wrong current password
    bad_res = await client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "WrongCurrentPassword!1",
            "new_password": "UpdatedPassword#2026",
        },
        headers=headers,
    )
    assert bad_res.status_code == 400

    # Valid change
    good_res = await client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "InitialPassword#2026",
            "new_password": "UpdatedPassword#2026",
        },
        headers=headers,
    )
    assert good_res.status_code == 200
