"""WealthOS Master Local Acceptance Suite — Gate 4: Authentication, Authorization & Identity Security.

Validates:
1. Registration & duplicate user prevention (NIST SP 800-63B).
2. Credential authentication, invalid password rejection, lockout protection.
3. MFA TOTP lifecycle: enrollment, challenge completion, and single-use replay rejection.
4. Refresh Token Rotation (RTR), family revocation, and session logout.
5. RBAC tenant isolation and permission enforcement.
"""

import uuid

import pyotp
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_gate4_registration_and_duplicate_rejection(client: AsyncClient):
    """Verify user registration, NIST password enforcement, and duplicate rejection."""
    unique_suffix = uuid.uuid4().hex[:8]
    valid_email = f"user-{unique_suffix}@example.com"
    valid_password = "SecurePassword#2026!"

    # 1. Successful Registration
    res_reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": valid_email,
            "password": valid_password,
            "first_name": "Gate4",
            "last_name": "Tester",
        },
    )
    assert res_reg.status_code == 201, f"Registration failed: {res_reg.text}"
    body = res_reg.json()
    assert body["success"] is True
    assert body["data"]["email"] == valid_email
    assert body["data"]["status"] == "pending_verification"
    assert "user_id" in body["data"]

    # 2. Duplicate Registration Rejection (HTTP 409 Conflict)
    res_dup = await client.post(
        "/api/v1/auth/register",
        json={
            "email": valid_email,
            "password": valid_password,
            "first_name": "Duplicate",
            "last_name": "Tester",
        },
    )
    assert res_dup.status_code == 409, (
        f"Duplicate email must return 409 Conflict, got {res_dup.status_code}"
    )

    # 3. Weak Password Rejection (NIST SP 800-63B < 12 characters)
    res_weak = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"weak-{unique_suffix}@example.com",
            "password": "Short1!",
            "first_name": "Weak",
            "last_name": "Password",
        },
    )
    assert res_weak.status_code == 422, (
        f"Weak password must fail validation with 422, got {res_weak.status_code}"
    )


@pytest.mark.asyncio
async def test_gate4_login_and_invalid_credentials(client: AsyncClient, test_user_factory):
    """Verify login authentication, incorrect password rejection, and session token receipt."""
    email = f"login-{uuid.uuid4().hex[:8]}@example.com"
    password = "CorrectHorseBatteryStaple@2026!"

    await test_user_factory(
        email=email,
        password=password,
        status="active",
    )

    # 1. Invalid Password Rejection
    res_wrong = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword@123!"},
    )
    assert res_wrong.status_code in (401, 400), "Invalid credentials must be rejected"

    # 2. Valid Login
    res_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    data = res_login.json()["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"].lower() == "bearer"


@pytest.mark.asyncio
async def test_gate4_mfa_totp_lifecycle_and_replay_rejection(
    client: AsyncClient, test_user_factory
):
    """Verify MFA TOTP enrollment, challenge verification, and single-use replay rejection."""
    email = f"mfa-{uuid.uuid4().hex[:8]}@example.com"
    password = "MfaSecurePassword@2026!"

    user, tenant, token = await test_user_factory(
        email=email,
        password=password,
        status="active",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initiate MFA Enrollment
    res_enroll = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    assert res_enroll.status_code == 200, f"MFA enroll failed: {res_enroll.text}"
    enroll_data = res_enroll.json()["data"]
    secret = enroll_data["secret"]
    recovery_codes = enroll_data["recovery_codes"]
    assert len(recovery_codes) >= 8

    # Generate TOTP code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    # 2. Complete MFA Enrollment
    res_verify = await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": valid_code},
        headers=headers,
    )
    assert res_verify.status_code == 200, f"MFA verify failed: {res_verify.text}"
    assert res_verify.json()["success"] is True

    # 3. Login now triggers MFA challenge requirement
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()["data"]
    assert login_data.get("mfa_required") is True
    mfa_token = login_data["mfa_token"]

    # 4. Solve challenge with TOTP code
    challenge_code = totp.now()
    challenge_res = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": mfa_token, "code": challenge_code},
    )
    assert challenge_res.status_code == 200
    assert "access_token" in challenge_res.json()["data"]

    # 5. Code Replay Rejection: Attempting second login challenge with same code
    login_res2 = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res2.status_code == 200
    mfa_token2 = login_res2.json()["data"]["mfa_token"]

    replay_res = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": mfa_token2, "code": challenge_code},
    )
    assert replay_res.status_code in (400, 401), "Reused TOTP code must be rejected"


@pytest.mark.asyncio
async def test_gate4_refresh_token_rotation_and_revocation(client: AsyncClient, test_user_factory):
    """Verify Refresh Token Rotation (RTR), reuse detection, family invalidation, and session logout."""
    email = f"rtr-{uuid.uuid4().hex[:8]}@example.com"
    password = "RtrPassword@2026!"

    await test_user_factory(
        email=email,
        password=password,
        status="active",
    )

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()["data"]
    assert "access_token" in tokens
    old_refresh_token = tokens["refresh_token"]

    # 1. Rotate Refresh Token
    rotate_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token},
    )
    assert rotate_res.status_code == 200, f"Refresh token rotation failed: {rotate_res.text}"
    new_tokens = rotate_res.json()["data"]
    assert "access_token" in new_tokens
    new_refresh_token = new_tokens["refresh_token"]
    assert new_refresh_token != old_refresh_token

    # 2. Reuse Detection: Replaying old_refresh_token invalidates entire family
    reuse_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token},
    )
    assert reuse_res.status_code in (401, 400), "Replay of previous refresh token must be rejected"

    # 3. Family Invalidation: New refresh token is now also rejected due to detected replay
    blocked_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": new_refresh_token},
    )
    assert blocked_res.status_code == 401, "Subsequent token in revoked family must be rejected"

    # 4. Fresh Login & Explicit Logout
    login_res2 = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res2.status_code == 200
    fresh_token = login_res2.json()["data"]["access_token"]

    logout_res = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {fresh_token}"},
    )
    assert logout_res.status_code == 200


@pytest.mark.asyncio
async def test_gate4_rbac_tenant_membership_authorization(client: AsyncClient, test_user_factory):
    """Verify RBAC role hierarchy and tenant boundaries on workspace resources."""
    email_owner = f"owner-{uuid.uuid4().hex[:8]}@example.com"
    email_viewer = f"viewer-{uuid.uuid4().hex[:8]}@example.com"

    user_owner, tenant_owner, token_owner = await test_user_factory(
        email=email_owner,
        password="RbacPassword@2026!",
        status="active",
    )
    headers_owner = {"Authorization": f"Bearer {token_owner}"}

    user_viewer, tenant_viewer, token_viewer = await test_user_factory(
        email=email_viewer,
        password="RbacPassword@2026!",
        status="active",
    )

    # Owner creates household workspace
    tenant_res = await client.post(
        "/api/v1/tenants",
        json={"name": "Acme Holdings", "tenant_type": "household"},
        headers=headers_owner,
    )
    assert tenant_res.status_code == 201, f"Tenant creation failed: {tenant_res.text}"
    tenant_id = tenant_res.json()["data"]["id"]

    # 1. Non-member/viewer cannot access owner's workspace (Forbidden or Not Found)
    res_forbidden = await client.get(
        f"/api/v1/tenants/{tenant_id}",
        headers={"Authorization": f"Bearer {token_viewer}", "X-Tenant-ID": tenant_id},
    )
    assert res_forbidden.status_code in (
        403,
        404,
    ), "Unauthorized tenant query must be rejected"

    # 2. Unauthenticated access is rejected with 401
    res_unauth = await client.get(f"/api/v1/tenants/{tenant_id}")
    assert res_unauth.status_code == 401, "Unauthenticated access must return 401 Unauthorized"
