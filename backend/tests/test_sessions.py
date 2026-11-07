"""Tests for Session Management, Refresh Token Rotation (RTR), and Reuse Detection."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.identity.models import UserSession
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


@pytest.mark.asyncio
async def test_access_token_rejected_when_db_session_expired(
    client: AsyncClient, db_session: AsyncSession, test_user_factory
):
    """Test that presenting a JWT with valid claims is rejected with HTTP 401 when user_sessions.expires_at has passed."""
    user, _, token = await test_user_factory(
        email="expired.session@example.com",
        password="ValidPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Extract session ID from JWT
    claims = decode_and_validate_token(token, expected_token_type="access")
    session_id = uuid.UUID(claims["sid"])

    # First request: active session succeeds
    me1 = await client.get("/api/v1/auth/me", headers=headers)
    assert me1.status_code == 200

    # Manually expire the session record in the database
    past_time = datetime.now(UTC) - timedelta(hours=1)
    await db_session.execute(
        update(UserSession).where(UserSession.id == session_id).values(expires_at=past_time)
    )
    await db_session.commit()

    # Second request: expired session record is rejected and revoked in DB
    me2 = await client.get("/api/v1/auth/me", headers=headers)
    assert me2.status_code == 401
    assert "session has expired" in me2.json()["error"]["message"].lower()

    # Verify session is marked inactive and revoked in DB
    updated_session = await db_session.get(UserSession, session_id)
    assert updated_session is not None
    assert updated_session.is_active is False
    assert updated_session.revoked_at is not None


@pytest.mark.asyncio
async def test_refresh_token_rotation_rejected_when_db_session_expired(
    client: AsyncClient, db_session: AsyncSession, test_user_factory
):
    """Test that refresh token rotation rejects rotation when the backing session has expired."""
    await test_user_factory(
        email="expired.refresh@example.com",
        password="ExpiredRefresh#2026",
    )

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "expired.refresh@example.com", "password": "ExpiredRefresh#2026"},
    )
    assert login_res.status_code == 200
    refresh_token = login_res.json()["data"]["refresh_token"]

    # Query database to get session ID for this refresh token
    from app.domains.identity.crypto import hash_token
    from app.domains.identity.models import RefreshToken

    digest = hash_token(refresh_token)
    rt = (
        await db_session.execute(select(RefreshToken).where(RefreshToken.token_hash == digest))
    ).scalar_one()
    session_id = rt.session_id

    # Expire session in DB
    past_time = datetime.now(UTC) - timedelta(hours=2)
    await db_session.execute(
        update(UserSession).where(UserSession.id == session_id).values(expires_at=past_time)
    )
    await db_session.commit()

    # Attempt refresh
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 401
    assert "expired" in refresh_res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_logout_invalidates_associated_refresh_token(client: AsyncClient, test_user_factory):
    """Test that logging out invalidates both access and refresh tokens for that session."""
    await test_user_factory(
        email="logout.rtr@example.com",
        password="LogoutRTRPassword#2026",
    )

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "logout.rtr@example.com", "password": "LogoutRTRPassword#2026"},
    )
    data = login_res.json()["data"]
    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    # Logout
    logout_res = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert logout_res.status_code == 200

    # Refresh should fail
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 401


@pytest.mark.asyncio
async def test_logout_all_invalidates_all_active_sessions_and_refresh_tokens(
    client: AsyncClient, test_user_factory
):
    """Test that logout-all revokes all user sessions and refresh tokens across devices."""
    await test_user_factory(
        email="logoutall.user@example.com",
        password="LogoutAllPassword#2026",
    )

    # Login device 1
    login1 = await client.post(
        "/api/v1/auth/login",
        json={"email": "logoutall.user@example.com", "password": "LogoutAllPassword#2026"},
    )
    d1 = login1.json()["data"]

    # Login device 2
    login2 = await client.post(
        "/api/v1/auth/login",
        json={"email": "logoutall.user@example.com", "password": "LogoutAllPassword#2026"},
    )
    d2 = login2.json()["data"]

    # Call logout-all using device 1's token
    logout_all_res = await client.post(
        "/api/v1/auth/logout-all",
        headers={"Authorization": f"Bearer {d1['access_token']}"},
    )
    assert logout_all_res.status_code == 200

    # Both device 1 and device 2 access tokens must now fail
    me1 = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {d1['access_token']}"}
    )
    me2 = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {d2['access_token']}"}
    )
    assert me1.status_code == 401
    assert me2.status_code == 401

    # Both refresh tokens must also fail
    r1 = await client.post("/api/v1/auth/refresh", json={"refresh_token": d1["refresh_token"]})
    r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": d2["refresh_token"]})
    assert r1.status_code == 401
    assert r2.status_code == 401
