"""WealthOS Identity & Authentication Application Service.

Comprehensive business logic for user registration, Argon2id authentication,
session management, refresh-token rotation, multi-factor authentication, and password lifecycle.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, desc, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import get_logger
from app.domains.audit.service import record_security_event
from app.domains.identity.crypto import (
    generate_recovery_codes,
    generate_secure_token,
    hash_token,
)
from app.domains.identity.email_service import get_email_service
from app.domains.identity.mfa_service import (
    MFASecurityError,
    hash_recovery_code,
    initiate_totp_enrollment,
    verify_totp_code,
)
from app.domains.identity.models import (
    EmailVerificationToken,
    MFACredential,
    MFARecoveryCode,
    PasswordResetToken,
    RefreshToken,
    User,
    UserCredential,
    UserSession,
)
from app.domains.identity.passwords import (
    hash_password,
    validate_password_policy,
    verify_dummy_password,
    verify_password,
)
from app.domains.identity.tokens import (
    TokenSecurityError,
    create_access_token,
    create_mfa_challenge_token,
    decode_and_validate_token,
)
from app.domains.tenants.service import (
    create_personal_tenant,
    list_user_tenants,
)
from app.infrastructure.redis import get_redis

logger = get_logger("wealthos.identity")


class AuthenticationServiceError(ValueError):
    """Raised when authentication or security checks fail."""


async def register_user(
    session: AsyncSession,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> tuple[User, uuid.UUID]:
    """Register a new user account, provision personal workspace, and dispatch verification."""
    clean_email = email.strip().lower()

    # Validate password against NIST SP 800-63B policy
    validate_password_policy(
        password,
        user_email=clean_email,
        user_name=f"{first_name} {last_name}",
    )

    # Check for email uniqueness
    stmt = select(User).where(User.email == clean_email)
    existing_user = (await session.execute(stmt)).scalar_one_or_none()
    if existing_user:
        logger.warning(f"Registration attempted with existing email: {clean_email}")
        raise AuthenticationServiceError("An account with this email address already exists.")

    user = User(
        id=uuid.uuid4(),
        email=clean_email,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        status="pending_verification",
        is_superuser=False,
    )
    session.add(user)
    await session.flush()

    # Create credentials with Argon2id hash
    pwd_hash = hash_password(password)
    cred = UserCredential(
        id=uuid.uuid4(),
        user_id=user.id,
        password_hash=pwd_hash,
    )
    session.add(cred)
    await session.flush()

    # Provision default personal workspace
    personal_tenant = await create_personal_tenant(session, user)

    # Generate and store email verification token
    raw_token = generate_secure_token(32)
    token_digest = hash_token(raw_token)
    expires_at = datetime.now(UTC) + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)

    verif_token = EmailVerificationToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=token_digest,
        expires_at=expires_at,
    )
    session.add(verif_token)
    await session.flush()

    # Dispatch verification link via email service
    email_service = get_email_service()
    await email_service.send_email_verification(to_email=clean_email, token=raw_token)

    # Record security audit event
    await record_security_event(
        session,
        event_type="user_registered",
        status="success",
        user_id=user.id,
        tenant_id=personal_tenant.id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
        details={"email": clean_email},
    )

    logger.info(f"Successfully registered user {user.id} ({clean_email})")
    return user, personal_tenant.id


async def authenticate_user(
    session: AsyncSession,
    email: str,
    password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> dict:
    """Authenticate user with email and password.

    Returns:
        dict containing either:
        - {"mfa_required": True, "mfa_token": "..."}
        - {"access_token": "...", "refresh_token": "...", ...}
    """
    clean_email = email.strip().lower()

    stmt = (
        select(User)
        .options(
            selectinload(User.credential),
            selectinload(User.mfa_credential),
        )
        .where(User.email == clean_email, User.is_deleted == False)  # noqa: E712
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.credential:
        # Constant-time dummy verification to eliminate user enumeration timing oracle
        verify_dummy_password(password)
        await record_security_event(
            session,
            event_type="login_failed",
            status="failure",
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
            details={"email": clean_email, "reason": "user_not_found"},
        )
        await session.commit()
        raise AuthenticationServiceError("Invalid email or password.")

    # Check account temporary lockout
    now = datetime.now(UTC)
    if user.credential.locked_until and user.credential.locked_until > now:
        await record_security_event(
            session,
            event_type="login_blocked_locked",
            status="failure",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
        )
        await session.commit()
        raise AuthenticationServiceError(
            "Account is temporarily locked due to multiple failed login attempts. Please try again later."
        )

    # Check password with Argon2id
    valid_password = verify_password(password, user.credential.password_hash)
    if not valid_password:
        user.credential.failed_login_attempts += 1
        if user.credential.failed_login_attempts >= settings.LOGIN_MAX_FAILED_ATTEMPTS:
            user.credential.locked_until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
            logger.warning(
                f"User {user.id} locked out for {settings.LOGIN_LOCKOUT_MINUTES} minutes"
            )

        await record_security_event(
            session,
            event_type="login_failed",
            status="failure",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
            details={"failed_attempts": user.credential.failed_login_attempts},
        )
        await session.commit()
        raise AuthenticationServiceError("Invalid email or password.")

    # Check account status
    if user.status in ("suspended", "deactivated"):
        await record_security_event(
            session,
            event_type="login_blocked_status",
            status="failure",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
            details={"status": user.status},
        )
        raise AuthenticationServiceError(f"Account is {user.status}. Please contact support.")

    # Password verified: reset failure counter
    user.credential.failed_login_attempts = 0
    user.credential.locked_until = None
    user.last_login_at = now

    # Check if MFA challenge is required
    if user.mfa_credential and user.mfa_credential.is_enabled:
        temp_session_id = uuid.uuid4()
        mfa_challenge_token = create_mfa_challenge_token(user.id, temp_session_id)
        logger.info(f"MFA challenge issued for user {user.id}")
        return {
            "mfa_required": True,
            "mfa_token": mfa_challenge_token,
            "mfa_type": "totp",
        }

    # Standard login: issue session and tokens
    return await _create_authenticated_session(
        session,
        user=user,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
    )


async def _create_authenticated_session(
    session: AsyncSession,
    user: User,
    tenant_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> dict:
    """Create a persistent user session and issue access/refresh token pair."""
    now = datetime.now(UTC)
    session_expiry = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    user_session = UserSession(
        id=uuid.uuid4(),
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,
        is_active=True,
        last_active_at=now,
        expires_at=session_expiry,
    )
    session.add(user_session)
    await session.flush()

    # Apply transaction-local user context for RLS
    await session.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(user.id)},
    )

    # Determine active tenant
    tenants = await list_user_tenants(session, user.id)
    active_tenant_data = None
    resolved_tenant_id = None

    if tenant_id:
        active_tenant_data = next((t for t in tenants if t["id"] == tenant_id), None)

    if not active_tenant_data and tenants:
        active_tenant_data = tenants[0]

    if active_tenant_data:
        resolved_tenant_id = active_tenant_data["id"]

    # Generate Refresh Token (RTR)
    raw_refresh_token = generate_secure_token(32)
    token_digest = hash_token(raw_refresh_token)
    family_id = uuid.uuid4()

    refresh_token_entry = RefreshToken(
        id=uuid.uuid4(),
        session_id=user_session.id,
        user_id=user.id,
        token_hash=token_digest,
        family_id=family_id,
        is_revoked=False,
        expires_at=session_expiry,
    )
    session.add(refresh_token_entry)
    await session.flush()

    # Generate Access JWT
    access_token = create_access_token(
        user_id=user.id,
        session_id=user_session.id,
        tenant_id=resolved_tenant_id,
    )

    await record_security_event(
        session,
        event_type="login_success",
        status="success",
        user_id=user.id,
        tenant_id=resolved_tenant_id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
        details={"session_id": str(user_session.id)},
    )

    return {
        "mfa_required": False,
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "Bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.full_name,
            "mfa_enabled": bool(user.mfa_credential and user.mfa_credential.is_enabled),
        },
        "active_tenant": active_tenant_data,
    }


async def complete_mfa_challenge(
    session: AsyncSession,
    mfa_token: str,
    code: str | None = None,
    recovery_code: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> dict:
    """Validate MFA code and complete authenticated login."""
    try:
        payload = decode_and_validate_token(mfa_token, expected_token_type="mfa_challenge")
    except TokenSecurityError as e:
        raise AuthenticationServiceError("MFA challenge token has expired or is invalid.") from e

    # Atomically enforce single-use consumption of MFA challenge token via Redis
    jti = payload.get("jti")
    if not jti:
        raise AuthenticationServiceError("MFA challenge token missing unique identifier claim.")

    try:
        redis_client = await get_redis()
        challenge_key = f"mfa:challenge:consumed:{jti}"
        # Set with 5 min TTL matching challenge window, NX=True for atomic single-use
        consumed = await redis_client.set(challenge_key, "1", ex=300, nx=True)
        if not consumed:
            logger.warning(
                f"Replay attempt of MFA challenge token jti={jti} for user {payload.get('sub')}"
            )
            raise AuthenticationServiceError(
                "This MFA challenge token has already been consumed. Please sign in again."
            )
    except AuthenticationServiceError:
        raise
    except Exception as exc:
        logger.error(f"Redis challenge verification failure: {exc}")
        raise AuthenticationServiceError(
            "MFA verification service is temporarily unavailable. Please retry."
        ) from exc

    user_id = uuid.UUID(payload["sub"])
    user = await session.get(
        User,
        user_id,
        options=[
            selectinload(User.credential),
            selectinload(User.mfa_credential),
        ],
    )
    if not user or user.is_deleted or user.status in ("suspended", "deactivated"):
        raise AuthenticationServiceError("User account invalid or inactive.")

    # Retrieve MFA credentials
    stmt = select(MFACredential).where(MFACredential.user_id == user_id)
    mfa_cred = (await session.execute(stmt)).scalar_one_or_none()
    if not mfa_cred or not mfa_cred.is_enabled:
        raise AuthenticationServiceError("MFA is not enabled for this user.")

    # Validate TOTP code
    if code:
        try:
            is_valid = await verify_totp_code(
                user_id=user.id,
                encrypted_secret=mfa_cred.secret_key_encrypted,
                submitted_code=code,
                check_replay=True,
            )
        except MFASecurityError as e:
            raise AuthenticationServiceError(str(e)) from e

        if not is_valid:
            await record_security_event(
                session,
                event_type="mfa_challenge_failed",
                status="failure",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                correlation_id=correlation_id,
            )
            raise AuthenticationServiceError("Invalid 6-digit authentication code.")

        mfa_cred.last_used_at = datetime.now(UTC)

    elif recovery_code:
        # Atomically validate and redeem backup recovery code using conditional UPDATE RETURNING
        code_digest = hash_recovery_code(recovery_code)
        now = datetime.now(UTC)
        consume_rec_stmt = (
            update(MFARecoveryCode)
            .where(
                MFARecoveryCode.user_id == user_id,
                MFARecoveryCode.code_hash == code_digest,
                MFARecoveryCode.is_used == False,  # noqa: E712
            )
            .values(is_used=True, used_at=now)
            .returning(MFARecoveryCode.id)
        )
        rec_res = await session.execute(consume_rec_stmt)
        redeemed_id = rec_res.scalar_one_or_none()
        if not redeemed_id:
            await record_security_event(
                session,
                event_type="mfa_recovery_code_failed",
                status="failure",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                correlation_id=correlation_id,
            )
            raise AuthenticationServiceError("Invalid or already-used recovery code.")

        logger.info(f"User {user.id} atomically redeemed emergency recovery code {redeemed_id}")
    else:
        raise AuthenticationServiceError("Must provide either a 6-digit code or recovery code.")

    # Complete session setup
    return await _create_authenticated_session(
        session,
        user=user,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
    )


async def rotate_refresh_token(
    session: AsyncSession,
    raw_refresh_token: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> dict:
    """Rotate an existing refresh token and issue a new pair.

    Implements automated Reuse Detection & Token Family Revocation.
    """
    token_digest = hash_token(raw_refresh_token.strip())

    stmt = (
        select(RefreshToken)
        .options(
            selectinload(RefreshToken.session),
        )
        .where(RefreshToken.token_hash == token_digest)
    )
    result = await session.execute(stmt)
    token_entry = result.scalar_one_or_none()

    if not token_entry:
        raise AuthenticationServiceError("Invalid refresh token.")

    now = datetime.now(UTC)

    # REUSE DETECTION: Token was already revoked!
    if token_entry.is_revoked:
        logger.warning(
            f"REFRESH TOKEN REUSE DETECTED: family_id={token_entry.family_id}, user={token_entry.user_id}"
        )
        # Invalidate entire token family immediately
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == token_entry.family_id)
            .values(is_revoked=True, revoked_at=now, revoked_reason="reuse_detected")
        )
        # Invalidate the active session
        if token_entry.session:
            token_entry.session.is_active = False
            token_entry.session.revoked_at = now

        await record_security_event(
            session,
            event_type="suspicious_refresh_token_reuse",
            status="failure",
            user_id=token_entry.user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
            details={"family_id": str(token_entry.family_id)},
        )
        await session.commit()
        raise AuthenticationServiceError(
            "Security anomaly detected: this refresh token was previously consumed. Active session terminated."
        )

    # Check token expiration
    if now > token_entry.expires_at:
        token_entry.is_revoked = True
        token_entry.revoked_at = now
        token_entry.revoked_reason = "expired"
        raise AuthenticationServiceError("Refresh token has expired. Please log in again.")

    # Check session active status and session expiration
    user_session = token_entry.session
    if (
        not user_session
        or not user_session.is_active
        or user_session.revoked_at is not None
        or user_session.expires_at <= now
    ):
        if user_session and user_session.is_active:
            user_session.is_active = False
            user_session.revoked_at = now
        token_entry.is_revoked = True
        token_entry.revoked_at = now
        token_entry.revoked_reason = "session_expired"
        raise AuthenticationServiceError("Session is no longer active or has expired.")

    # Revoke current token
    token_entry.is_revoked = True
    token_entry.revoked_at = now
    token_entry.revoked_reason = "rotated"

    # Issue new refresh token within same lineage family
    new_raw_refresh = generate_secure_token(32)
    new_token_digest = hash_token(new_raw_refresh)
    new_expiry = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    new_refresh_entry = RefreshToken(
        id=uuid.uuid4(),
        session_id=user_session.id,
        user_id=token_entry.user_id,
        token_hash=new_token_digest,
        family_id=token_entry.family_id,
        is_revoked=False,
        expires_at=new_expiry,
    )
    session.add(new_refresh_entry)

    # Update session activity
    user_session.last_active_at = now

    # Retrieve user's active tenant
    tenants = await list_user_tenants(session, token_entry.user_id)
    active_tenant_id = tenants[0]["id"] if tenants else None

    # Issue new Access JWT
    new_access_token = create_access_token(
        user_id=token_entry.user_id,
        session_id=user_session.id,
        tenant_id=active_tenant_id,
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_raw_refresh,
        "token_type": "Bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


async def logout_session(
    session: AsyncSession,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> None:
    """Terminate specific user session and revoke associated refresh tokens."""
    now = datetime.now(UTC)
    user_session = await session.get(UserSession, session_id)
    if user_session and user_session.user_id == user_id:
        user_session.is_active = False
        user_session.revoked_at = now

        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.session_id == session_id)
            .values(is_revoked=True, revoked_at=now, revoked_reason="user_logout")
        )

        await record_security_event(
            session,
            event_type="logout",
            status="success",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
            details={"session_id": str(session_id)},
        )
        logger.info(f"User {user_id} logged out session {session_id}")


async def logout_all_sessions(
    session: AsyncSession,
    user_id: uuid.UUID,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> None:
    """Terminate all active sessions and refresh tokens for user."""
    now = datetime.now(UTC)
    await session.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.is_active == True)  # noqa: E712
        .values(is_active=False, revoked_at=now)
    )

    await session.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)  # noqa: E712
        .values(is_revoked=True, revoked_at=now, revoked_reason="logout_all")
    )

    await record_security_event(
        session,
        event_type="logout_all",
        status="success",
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
    )
    logger.info(f"User {user_id} terminated all active sessions")


async def list_user_sessions(
    session: AsyncSession,
    user_id: uuid.UUID,
    current_session_id: uuid.UUID | None = None,
) -> list[dict]:
    """Retrieve all active sessions for device management."""
    stmt = (
        select(UserSession)
        .where(UserSession.user_id == user_id, UserSession.is_active == True)  # noqa: E712
        .order_by(desc(UserSession.last_active_at))
    )
    result = await session.execute(stmt)
    sessions = result.scalars().all()

    return [
        {
            "id": s.id,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "device_fingerprint": s.device_fingerprint,
            "is_current": s.id == current_session_id,
            "last_active_at": s.last_active_at,
            "created_at": s.created_at,
        }
        for s in sessions
    ]


async def verify_email_token(
    session: AsyncSession,
    raw_token: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> User:
    """Validate email verification token and activate user account."""
    token_digest = hash_token(raw_token.strip())

    stmt = select(EmailVerificationToken).where(
        EmailVerificationToken.token_hash == token_digest,
        EmailVerificationToken.consumed_at.is_(None),
    )
    verif_token = (await session.execute(stmt)).scalar_one_or_none()
    if not verif_token:
        raise AuthenticationServiceError("Invalid or already-consumed verification token.")

    now = datetime.now(UTC)
    if now > verif_token.expires_at:
        raise AuthenticationServiceError(
            "Verification token has expired. Please request a new link."
        )

    user = await session.get(User, verif_token.user_id)
    if not user:
        raise AuthenticationServiceError("User account not found.")

    verif_token.consumed_at = now
    user.email_verified_at = now
    if user.status == "pending_verification":
        user.status = "active"

    await record_security_event(
        session,
        event_type="email_verified",
        status="success",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
    )
    logger.info(f"Verified email for user {user.id}")
    return user


async def resend_verification_email(
    session: AsyncSession,
    email: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> None:
    """Generate and dispatch a new email verification token if user is unverified.

    Always executes cleanly without disclosing whether the account exists (timing & enumeration defense).
    """
    clean_email = email.strip().lower()
    stmt = select(User).where(User.email == clean_email, User.is_deleted == False)  # noqa: E712
    user = (await session.execute(stmt)).scalar_one_or_none()

    if user and user.status == "pending_verification":
        now = datetime.now(UTC)
        # Invalidate prior unconsumed tokens
        await session.execute(
            update(EmailVerificationToken)
            .where(
                EmailVerificationToken.user_id == user.id,
                EmailVerificationToken.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )

        raw_token = generate_secure_token(32)
        token_digest = hash_token(raw_token)
        expires_at = now + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)

        verif_token = EmailVerificationToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=token_digest,
            expires_at=expires_at,
        )
        session.add(verif_token)
        await session.flush()

        email_service = get_email_service()
        await email_service.send_email_verification(to_email=clean_email, token=raw_token)

        await record_security_event(
            session,
            event_type="email_verification_resent",
            status="success",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
        )

    logger.info(f"Verification resend processed for {clean_email}")


async def request_password_reset(
    session: AsyncSession,
    email: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> None:
    """Generate and dispatch password reset token. Always returns generic success."""
    clean_email = email.strip().lower()

    stmt = select(User).where(User.email == clean_email, User.is_deleted == False)  # noqa: E712
    user = (await session.execute(stmt)).scalar_one_or_none()

    if user:
        raw_token = generate_secure_token(32)
        token_digest = hash_token(raw_token)
        expires_at = datetime.now(UTC) + timedelta(
            minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        )

        reset_token = PasswordResetToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=token_digest,
            expires_at=expires_at,
        )
        session.add(reset_token)
        await session.flush()

        email_service = get_email_service()
        await email_service.send_password_reset(to_email=clean_email, token=raw_token)

        await record_security_event(
            session,
            event_type="password_reset_requested",
            status="success",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
        )

    logger.info(f"Password reset request processed for {clean_email}")


async def reset_password_with_token(
    session: AsyncSession,
    raw_token: str,
    new_password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> None:
    """Consume password reset token and update user password."""
    token_digest = hash_token(raw_token.strip())

    stmt = select(PasswordResetToken).where(
        PasswordResetToken.token_hash == token_digest,
        PasswordResetToken.consumed_at.is_(None),
    )
    reset_entry = (await session.execute(stmt)).scalar_one_or_none()
    if not reset_entry:
        raise AuthenticationServiceError("Invalid or already-consumed password reset token.")

    now = datetime.now(UTC)
    if now > reset_entry.expires_at:
        raise AuthenticationServiceError("Password reset token has expired.")

    user = await session.get(User, reset_entry.user_id)
    if not user:
        raise AuthenticationServiceError("User account not found.")

    # Validate new password policy
    validate_password_policy(
        new_password,
        user_email=user.email,
        user_name=user.full_name,
    )

    # Update credentials
    stmt_cred = select(UserCredential).where(UserCredential.user_id == user.id)
    cred = (await session.execute(stmt_cred)).scalar_one_or_none()
    if not cred:
        raise AuthenticationServiceError("User credential record missing.")

    cred.password_hash = hash_password(new_password)
    cred.password_changed_at = now
    cred.failed_login_attempts = 0
    cred.locked_until = None
    reset_entry.consumed_at = now

    # Invalidate all active sessions
    await logout_all_sessions(session, user.id, ip_address, user_agent, correlation_id)

    await record_security_event(
        session,
        event_type="password_reset_completed",
        status="success",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
    )
    logger.info(f"User {user.id} successfully reset password via token")


async def change_password(
    session: AsyncSession,
    user: User,
    current_password: str,
    new_password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> None:
    """Authenticated password update with current password verification."""
    stmt = select(UserCredential).where(UserCredential.user_id == user.id)
    cred = (await session.execute(stmt)).scalar_one_or_none()
    if not cred:
        raise AuthenticationServiceError("User credential not found.")

    if not verify_password(current_password, cred.password_hash):
        await record_security_event(
            session,
            event_type="password_change_failed",
            status="failure",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
        )
        raise AuthenticationServiceError("Current password is incorrect.")

    # Validate new password
    validate_password_policy(
        new_password,
        user_email=user.email,
        user_name=user.full_name,
    )

    now = datetime.now(UTC)
    cred.password_hash = hash_password(new_password)
    cred.password_changed_at = now
    cred.failed_login_attempts = 0
    cred.locked_until = None

    # Invalidate all existing sessions
    await logout_all_sessions(session, user.id, ip_address, user_agent, correlation_id)

    await record_security_event(
        session,
        event_type="password_change_success",
        status="success",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
    )
    logger.info(f"User {user.id} changed password")


async def enroll_mfa(
    session: AsyncSession,
    user: User,
) -> tuple[str, str, list[str]]:
    """Initiate TOTP enrollment and generate encrypted secret and recovery codes."""
    details = initiate_totp_enrollment(user.email)

    # Upsert MFA credential record (unverified until first successful code)
    stmt = select(MFACredential).where(MFACredential.user_id == user.id)
    mfa_cred = (await session.execute(stmt)).scalar_one_or_none()
    if not mfa_cred:
        mfa_cred = MFACredential(
            id=uuid.uuid4(),
            user_id=user.id,
            mfa_type="totp",
            secret_key_encrypted=details.secret_key_encrypted,
            is_enabled=False,
        )
        session.add(mfa_cred)
    else:
        mfa_cred.secret_key_encrypted = details.secret_key_encrypted
        mfa_cred.is_enabled = False
        mfa_cred.enabled_at = None

    # Remove prior recovery codes and add new hashed codes
    await session.execute(delete(MFARecoveryCode).where(MFARecoveryCode.user_id == user.id))
    for raw_code in details.recovery_codes:
        session.add(
            MFARecoveryCode(
                id=uuid.uuid4(),
                user_id=user.id,
                code_hash=hash_recovery_code(raw_code),
                is_used=False,
            )
        )

    await session.flush()
    logger.info(f"Initiated MFA enrollment for user {user.id}")
    return details.secret_key_plain, details.provisioning_uri, details.recovery_codes


async def verify_and_activate_mfa(
    session: AsyncSession,
    user: User,
    code: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> None:
    """Verify first TOTP code and activate MFA for user."""
    stmt = select(MFACredential).where(MFACredential.user_id == user.id)
    mfa_cred = (await session.execute(stmt)).scalar_one_or_none()
    if not mfa_cred:
        raise AuthenticationServiceError(
            "No MFA enrollment found. Please initiate enrollment first."
        )

    is_valid = await verify_totp_code(
        user_id=user.id,
        encrypted_secret=mfa_cred.secret_key_encrypted,
        submitted_code=code,
        check_replay=False,
    )
    if not is_valid:
        raise AuthenticationServiceError(
            "Invalid 6-digit verification code. Please check your authenticator app."
        )

    now = datetime.now(UTC)
    mfa_cred.is_enabled = True
    mfa_cred.enabled_at = now
    mfa_cred.last_used_at = now

    await record_security_event(
        session,
        event_type="mfa_enabled",
        status="success",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
    )
    logger.info(f"User {user.id} activated MFA")


async def disable_mfa(
    session: AsyncSession,
    user: User,
    password: str,
    code: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
) -> None:
    """Deactivate MFA requiring password and valid TOTP code."""
    stmt = select(UserCredential).where(UserCredential.user_id == user.id)
    cred = (await session.execute(stmt)).scalar_one_or_none()
    if not cred or not verify_password(password, cred.password_hash):
        raise AuthenticationServiceError("Invalid password.")

    stmt_mfa = select(MFACredential).where(MFACredential.user_id == user.id)
    mfa_cred = (await session.execute(stmt_mfa)).scalar_one_or_none()
    if not mfa_cred or not mfa_cred.is_enabled:
        raise AuthenticationServiceError("MFA is not currently enabled.")

    is_valid = await verify_totp_code(
        user_id=user.id,
        encrypted_secret=mfa_cred.secret_key_encrypted,
        submitted_code=code,
        check_replay=False,
    )
    if not is_valid:
        raise AuthenticationServiceError("Invalid 6-digit authentication code.")

    mfa_cred.is_enabled = False
    mfa_cred.enabled_at = None

    # Delete recovery codes
    await session.execute(delete(MFARecoveryCode).where(MFARecoveryCode.user_id == user.id))

    await record_security_event(
        session,
        event_type="mfa_disabled",
        status="success",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
    )
    logger.info(f"User {user.id} disabled MFA")


async def regenerate_recovery_codes(
    session: AsyncSession,
    user: User,
) -> list[str]:
    """Generate fresh set of single-use recovery codes."""
    stmt_mfa = select(MFACredential).where(MFACredential.user_id == user.id)
    mfa_cred = (await session.execute(stmt_mfa)).scalar_one_or_none()
    if not mfa_cred or not mfa_cred.is_enabled:
        raise AuthenticationServiceError("MFA must be active to generate recovery codes.")

    raw_codes = generate_recovery_codes(count=10)
    await session.execute(delete(MFARecoveryCode).where(MFARecoveryCode.user_id == user.id))
    for raw_code in raw_codes:
        session.add(
            MFARecoveryCode(
                id=uuid.uuid4(),
                user_id=user.id,
                code_hash=hash_recovery_code(raw_code),
                is_used=False,
            )
        )
    await session.flush()
    logger.info(f"Regenerated recovery codes for user {user.id}")
    return raw_codes
