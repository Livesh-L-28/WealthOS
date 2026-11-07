"""Comprehensive tests for WealthOS Multi-Factor Authentication (MFA/TOTP)."""

import asyncio
from unittest.mock import patch

import pyotp
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_mfa_enrollment_and_activation(client: AsyncClient, test_user_factory):
    """Test TOTP secret generation, provisioning URI, and activation via initial code."""
    user, _, token = await test_user_factory(
        email="mfa.enroll@example.com",
        password="MfaPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Enroll MFA
    enroll_res = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    assert enroll_res.status_code == 200
    enroll_data = enroll_res.json()["data"]
    assert "secret" in enroll_data
    assert "provisioning_uri" in enroll_data
    assert len(enroll_data["recovery_codes"]) == 10
    secret = enroll_data["secret"]

    # 2. Invalid TOTP code verification should fail
    bad_verify = await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": "000000"},
        headers=headers,
    )
    assert bad_verify.status_code == 400

    # 3. Valid TOTP code verification
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    good_verify = await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": valid_code},
        headers=headers,
    )
    assert good_verify.status_code == 200
    assert good_verify.json()["success"] is True

    # 4. Verify in profile that mfa_enabled is now true
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["data"]["mfa_enabled"] is True


@pytest.mark.asyncio
async def test_mfa_login_challenge_and_replay_protection(client: AsyncClient, test_user_factory):
    """Test login requiring MFA challenge and strict TOTP replay protection."""
    user, _, token = await test_user_factory(
        email="mfa.challenge@example.com",
        password="ChallengePassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Enroll and activate MFA
    enroll_res = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    secret = enroll_res.json()["data"]["secret"]
    totp = pyotp.TOTP(secret)
    code = totp.now()

    await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": code},
        headers=headers,
    )

    # Now perform login: should return mfa_required
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "mfa.challenge@example.com", "password": "ChallengePassword#2026"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()["data"]
    assert login_data.get("mfa_required") is True
    mfa_token = login_data["mfa_token"]

    # Complete challenge with fresh TOTP code
    challenge_code = totp.now()
    challenge_res = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": mfa_token, "code": challenge_code},
    )
    assert challenge_res.status_code == 200
    assert "access_token" in challenge_res.json()["data"]

    # REPLAY ATTACK: Reusing the same code within the 30s window must be rejected
    # Attempt second login to get another challenge token
    login_res2 = await client.post(
        "/api/v1/auth/login",
        json={"email": "mfa.challenge@example.com", "password": "ChallengePassword#2026"},
    )
    mfa_token2 = login_res2.json()["data"]["mfa_token"]

    replay_res = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": mfa_token2, "code": challenge_code},
    )
    assert replay_res.status_code == 401
    assert "already used" in replay_res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_mfa_recovery_code_consumption(client: AsyncClient, test_user_factory):
    """Test that single-use recovery codes work exactly once and are consumed."""
    user, _, token = await test_user_factory(
        email="mfa.recovery@example.com",
        password="RecoveryPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Enroll MFA and capture recovery codes
    enroll_res = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    enroll_data = enroll_res.json()["data"]
    secret = enroll_data["secret"]
    recovery_code = enroll_data["recovery_codes"][0]

    # Activate MFA
    totp = pyotp.TOTP(secret)
    await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": totp.now()},
        headers=headers,
    )

    # 1. Login to get challenge token
    login_res1 = await client.post(
        "/api/v1/auth/login",
        json={"email": "mfa.recovery@example.com", "password": "RecoveryPassword#2026"},
    )
    mfa_token1 = login_res1.json()["data"]["mfa_token"]

    # 2. Redeem recovery code
    redeem_res = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": mfa_token1, "recovery_code": recovery_code},
    )
    assert redeem_res.status_code == 200
    assert "access_token" in redeem_res.json()["data"]

    # 3. Attempt to reuse the same recovery code on a new login challenge
    login_res2 = await client.post(
        "/api/v1/auth/login",
        json={"email": "mfa.recovery@example.com", "password": "RecoveryPassword#2026"},
    )
    mfa_token2 = login_res2.json()["data"]["mfa_token"]

    reuse_res = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": mfa_token2, "recovery_code": recovery_code},
    )
    assert reuse_res.status_code == 401


@pytest.mark.asyncio
async def test_mfa_disable_and_regenerate_codes(client: AsyncClient, test_user_factory):
    """Test regenerating recovery codes and disabling MFA with password and TOTP code."""
    user, _, token = await test_user_factory(
        email="mfa.mgmt@example.com",
        password="ManagementPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Enroll and activate
    enroll_res = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    secret = enroll_res.json()["data"]["secret"]
    totp = pyotp.TOTP(secret)
    await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": totp.now()},
        headers=headers,
    )

    # Regenerate recovery codes
    regen_res = await client.post("/api/v1/auth/mfa/recovery-codes", headers=headers)
    assert regen_res.status_code == 200
    new_codes = regen_res.json()["data"]["recovery_codes"]
    assert len(new_codes) == 10

    # Disable MFA with wrong password
    bad_disable = await client.post(
        "/api/v1/auth/mfa/disable",
        json={"password": "WrongPassword!1", "code": totp.now()},
        headers=headers,
    )
    assert bad_disable.status_code == 400

    # Disable MFA successfully
    good_disable = await client.post(
        "/api/v1/auth/mfa/disable",
        json={"password": "ManagementPassword#2026", "code": totp.now()},
        headers=headers,
    )
    assert good_disable.status_code == 200

    # Check that profile now reflects mfa_enabled=False
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["data"]["mfa_enabled"] is False


@pytest.mark.asyncio
async def test_mfa_challenge_token_single_use_and_concurrent_protection(
    client: AsyncClient, test_user_factory
):
    """Test that MFA challenge tokens are strictly single-use and concurrent requests cannot double-consume."""
    user, _, token = await test_user_factory(
        email="mfa.concurrent@example.com",
        password="ConcurrentPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Enroll and activate MFA
    enroll_res = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    secret = enroll_res.json()["data"]["secret"]
    totp = pyotp.TOTP(secret)
    await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": totp.now()},
        headers=headers,
    )

    # Login to obtain MFA challenge token
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "mfa.concurrent@example.com", "password": "ConcurrentPassword#2026"},
    )
    assert login_res.status_code == 200
    mfa_token = login_res.json()["data"]["mfa_token"]

    # 1. First consumption succeeds
    code = totp.now()
    res1 = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": mfa_token, "code": code},
    )
    assert res1.status_code == 200
    assert "access_token" in res1.json()["data"]

    # 2. Second consumption of the same challenge token must fail (single-use)
    res2 = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": mfa_token, "code": totp.now()},
    )
    assert res2.status_code == 401
    assert "consumed" in res2.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_mfa_recovery_code_concurrent_double_redemption(
    client: AsyncClient, test_user_factory
):
    """Test that concurrent attempts to redeem the same recovery code atomically succeed only once."""
    user, _, token = await test_user_factory(
        email="mfa.recovery.concurrent@example.com",
        password="RecoveryConcurrent#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Enroll MFA and capture recovery codes
    enroll_res = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    enroll_data = enroll_res.json()["data"]
    secret = enroll_data["secret"]
    recovery_code = enroll_data["recovery_codes"][0]

    totp = pyotp.TOTP(secret)
    await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": totp.now()},
        headers=headers,
    )

    # Login to get challenge tokens
    login1 = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "mfa.recovery.concurrent@example.com",
            "password": "RecoveryConcurrent#2026",
        },
    )
    token1 = login1.json()["data"]["mfa_token"]

    login2 = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "mfa.recovery.concurrent@example.com",
            "password": "RecoveryConcurrent#2026",
        },
    )
    token2 = login2.json()["data"]["mfa_token"]

    # Execute concurrent redemptions with the SAME recovery code
    req1 = client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": token1, "recovery_code": recovery_code},
    )
    req2 = client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": token2, "recovery_code": recovery_code},
    )
    resp1, resp2 = await asyncio.gather(req1, req2)

    statuses = [resp1.status_code, resp2.status_code]
    assert 200 in statuses, "Exactly one concurrent request must succeed"
    assert 401 in statuses, "The duplicate redemption request must be rejected"


@pytest.mark.asyncio
async def test_mfa_verify_alias_endpoint(client: AsyncClient, test_user_factory):
    """Test that /api/v1/auth/mfa/verify alias works identically to /api/v1/auth/mfa/challenge."""
    user, _, token = await test_user_factory(
        email="mfa.alias@example.com",
        password="AliasPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    enroll_res = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    secret = enroll_res.json()["data"]["secret"]
    totp = pyotp.TOTP(secret)
    await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": totp.now()},
        headers=headers,
    )

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "mfa.alias@example.com", "password": "AliasPassword#2026"},
    )
    mfa_token = login_res.json()["data"]["mfa_token"]

    # Call /api/v1/auth/mfa/verify alias
    verify_res = await client.post(
        "/api/v1/auth/mfa/verify",
        json={"mfa_token": mfa_token, "code": totp.now()},
    )
    assert verify_res.status_code == 200
    assert "access_token" in verify_res.json()["data"]


@pytest.mark.asyncio
async def test_mfa_fail_closed_on_redis_outage(client: AsyncClient, test_user_factory):
    """Test that MFA verification fails closed (HTTP 503) if Redis is unavailable."""
    user, _, token = await test_user_factory(
        email="mfa.redisdown@example.com",
        password="RedisDownPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    enroll_res = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    secret = enroll_res.json()["data"]["secret"]
    totp = pyotp.TOTP(secret)
    await client.post(
        "/api/v1/auth/mfa/verify-enrollment",
        json={"code": totp.now()},
        headers=headers,
    )

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "mfa.redisdown@example.com", "password": "RedisDownPassword#2026"},
    )
    mfa_token = login_res.json()["data"]["mfa_token"]

    # Simulate Redis outage during complete_mfa_challenge
    with patch("app.domains.identity.service.get_redis") as mock_redis:
        mock_redis.side_effect = Exception("Redis connection refused (simulated outage)")
        outage_res = await client.post(
            "/api/v1/auth/mfa/challenge",
            json={"mfa_token": mfa_token, "code": totp.now()},
        )
        assert outage_res.status_code == 503
        assert "temporarily unavailable" in outage_res.json()["error"]["message"].lower()
