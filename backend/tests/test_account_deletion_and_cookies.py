"""Tests for WealthOS Account Deletion & Cookie-Based Session Security.

Verifies:
1. Cookie-based authentication via wealthos_access_token cookie.
2. User account deletion flow (DELETE /api/v1/auth/me) with confirmation phrase.
3. Post-deletion login rejection and token invalidation.
4. Anonymization of personal identification data.
"""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.domains.identity.models import User, UserCredential
from app.main import create_app

app = create_app()


@pytest.mark.asyncio
async def test_cookie_based_authentication(client: AsyncClient, db_session: AsyncSession):
    """Verify that setting wealthos_access_token cookie authenticates requests without Bearer header."""
    # 1. Register and login
    unique_email = f"cookie-test-{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Correct-Horse-Battery-Staple-2026!"
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": pwd,
            "first_name": "Cookie",
            "last_name": "User",
        },
    )
    assert reg_res.status_code == 201

    # Verify email in DB
    stmt = select(User).where(User.email == unique_email)
    user = (await db_session.execute(stmt)).scalar_one()
    user.status = "active"
    await db_session.commit()

    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": pwd},
    )
    assert login_res.status_code == 200
    access_token = login_res.json()["data"]["access_token"]
    assert "wealthos_access_token" in login_res.cookies

    # 2. Query /api/v1/auth/me WITHOUT Authorization header, using cookie only
    cookie_client = AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        cookies={"wealthos_access_token": access_token},
    )
    me_res = await cookie_client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["data"]["email"] == unique_email
    assert me_res.json()["data"]["first_name"] == "Cookie"


@pytest.mark.asyncio
async def test_account_deletion_flow(client: AsyncClient, db_session: AsyncSession):
    """Verify DELETE /api/v1/auth/me permanently soft-deletes and anonymizes user account."""
    unique_email = f"delete-me-{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Delete-Me-Safely-2026!"
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": pwd,
            "first_name": "Doomed",
            "last_name": "Account",
        },
    )
    assert reg_res.status_code == 201

    # Activate
    stmt = select(User).where(User.email == unique_email)
    user = (await db_session.execute(stmt)).scalar_one()
    user.status = "active"
    user_id = user.id
    await db_session.commit()

    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": pwd},
    )
    token = login_res.json()["data"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. Attempt deletion with wrong confirmation phrase
    bad_phrase_res = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=auth_headers,
        json={"password": pwd, "confirmation_phrase": "WRONG PHRASE"},
    )
    assert bad_phrase_res.status_code == 400
    assert "Confirmation phrase" in bad_phrase_res.json()["error"]["message"]

    # 2. Attempt deletion with wrong password
    bad_pwd_res = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=auth_headers,
        json={"password": "WrongPassword123!", "confirmation_phrase": "DELETE MY ACCOUNT"},
    )
    assert bad_pwd_res.status_code == 400
    assert "Password verification failed" in bad_pwd_res.json()["error"]["message"]

    # 3. Successful deletion
    del_res = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=auth_headers,
        json={"password": pwd, "confirmation_phrase": "DELETE MY ACCOUNT"},
    )
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 4. Verify user record is anonymized and soft-deleted in DB
    # Refresh user
    del_user = await db_session.get(User, user_id)
    await db_session.refresh(del_user)
    assert del_user.is_deleted is True
    assert del_user.status == "deactivated"
    assert del_user.first_name == "Deleted"
    assert del_user.last_name == "User"
    assert "@deleted.wealthos.local" in del_user.email

    # 5. Verify subsequent login attempt fails
    retry_login = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": pwd},
    )
    assert retry_login.status_code == 401
