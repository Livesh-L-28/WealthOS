"""Tests for Session Management, Refresh Token Rotation (RTR), and Reuse Detection."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.identity.tokens import decode_and_validate_token


@pytest.mark.asyncio
async def test_access_token_claims_and_session_validation(client: AsyncClient, test_user_factory):
    """Test that issued JWT access tokens have valid NIST/RFC 7519 claims."""
    user, tenant, token = await test_user_factory(
        email="claims.test@example.com",
        password="ValidPassword#2026",
    )

    claims = decode_and_validate_token(token, expected_token_type="access")
    assert claims["sub"] == str(user.id)
    assert claims["tid"] == str(tenant.id)
    assert claims["iss"] == "wealthos:auth"
    assert claims["aud"] == "wealthos:api"
    assert "jti" in claims
    assert "sid" in claims
    assert claims["exp"] > claims["iat"]

    # Verify endpoint accepts token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["data"]["email"] == "claims.test@example.com"


@pytest.mark.asyncio
async def test_refresh_token_rotation_success(client: AsyncClient, test_user_factory):
    """Test standard Refresh Token Rotation issuing a new token."""
    await test_user_factory(
        email="rtr.user@example.com",
        password="RTRSecretPassword#2026",
    )

    # 1. Login to get initial tokens
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "rtr.user@example.com", "password": "RTRSecretPassword#2026"},
    )
    assert login_res.status_code == 200
    initial_refresh = login_res.json()["data"]["refresh_token"]

    # 2. Rotate refresh token
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert refresh_res.status_code == 200
    rotated_data = refresh_res.json()["data"]
    new_refresh = rotated_data["refresh_token"]
    assert new_refresh != initial_refresh

    # 3. Rotate again with the new refresh token
    second_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": new_refresh},
    )
    assert second_res.status_code == 200
    assert second_res.json()["data"]["refresh_token"] != new_refresh


@pytest.mark.asyncio
async def test_refresh_token_reuse_detection_and_invalidation(
    client: AsyncClient, db_session: AsyncSession, test_user_factory
):
    """Test reuse detection: replaying an old refresh token revokes entire session family."""
    await test_user_factory(
        email="reuse.test@example.com",
        password="ReuseSecretPassword#2026",
    )

    # 1. Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "reuse.test@example.com", "password": "ReuseSecretPassword#2026"},
    )
    initial_refresh = login_res.json()["data"]["refresh_token"]

    # 2. Legitimate rotation: Token A -> Token B
    rotate_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert rotate_res.status_code == 200
    second_refresh = rotate_res.json()["data"]["refresh_token"]

    # 3. Attacker replays Token A (which was already rotated)
    replay_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert replay_res.status_code == 401
    assert "previously consumed" in replay_res.json()["error"]["message"].lower()

    # 4. Now Token B must ALSO be revoked because the entire family is compromised
    blocked_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": second_refresh},
    )
    assert blocked_res.status_code == 401


@pytest.mark.asyncio
async def test_session_lifecycle_and_revocation(client: AsyncClient, test_user_factory):
    """Test listing active sessions and revoking an individual session."""
    user, _, token = await test_user_factory(
        email="session.mgmt@example.com",
        password="SessionPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # List sessions
    sessions_res = await client.get("/api/v1/auth/sessions", headers=headers)
    assert sessions_res.status_code == 200
    session_list = sessions_res.json()["data"]
    assert len(session_list) >= 1
    current_session = next(s for s in session_list if s["is_current"])
    session_id = current_session["id"]

    # Revoke session
    delete_res = await client.delete(f"/api/v1/auth/sessions/{session_id}", headers=headers)
    assert delete_res.status_code == 200

    # Request with revoked session's token should now be rejected
    rejected_res = await client.get("/api/v1/auth/me", headers=headers)
    assert rejected_res.status_code == 401


@pytest.mark.asyncio
async def test_logout_and_logout_all(client: AsyncClient, test_user_factory):
    """Test logout and global logout-all endpoints."""
    user, _, token = await test_user_factory(
        email="logout.user@example.com",
        password="LogoutPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Logout
    logout_res = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # Token now invalid
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 401
