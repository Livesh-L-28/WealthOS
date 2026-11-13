"""WealthOS Identity & Authentication REST API Endpoints.

Implements registration, authentication, token rotation, sessions, MFA,
and password management following NIST SP 800-63B and OWASP ASVS v4.0.3 L3 standards.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.core.logging import correlation_id_ctx, get_logger
from app.core.security import RateLimiter, get_current_user
from app.domains.identity.mfa_service import MFASecurityError
from app.domains.identity.models import User
from app.domains.identity.passwords import PasswordPolicyError
from app.domains.identity.schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MFAChallengeRequest,
    MFADisableRequest,
    MFAEnrollResponse,
    MFAVerifyEnrollmentRequest,
    OTPSendRequest,
    OTPSendResponse,
    OTPVerifyRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionResponse,
    TenantSummary,
    UserProfileResponse,
    VerifyEmailRequest,
)
from app.domains.identity.service import (
    AuthenticationServiceError,
    authenticate_user,
    change_password,
    complete_mfa_challenge,
    delete_user_account,
    disable_mfa,
    enroll_mfa,
    list_user_sessions,
    logout_all_sessions,
    logout_session,
    regenerate_recovery_codes,
    register_user,
    request_password_reset,
    resend_verification_email,
    reset_password_with_token,
    rotate_refresh_token,
    send_otp,
    verify_and_activate_mfa,
    verify_email_token,
    verify_otp,
)
from app.domains.tenants.service import list_user_tenants

logger = get_logger("wealthos.api.auth")

router = APIRouter()

# Rate limiting dependencies (production strictly enforces 5 requests/min; dev/test allows 100 requests/min for automated testing)
_auth_max = 5 if settings.is_production else 100
_general_max = 20 if settings.is_production else 300
auth_limiter = RateLimiter(max_requests=_auth_max, window_seconds=60, prefix="auth_sensitive")
general_limiter = RateLimiter(max_requests=_general_max, window_seconds=60, prefix="auth_general")


def _get_client_meta(request: Request) -> tuple[str | None, str | None, str | None]:
    """Extract client IP, User-Agent, and correlation ID for audit and forensics."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip_address = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else (request.client.host if request.client else None)
    )
    user_agent = request.headers.get("User-Agent")
    correlation_id = correlation_id_ctx.get()
    return ip_address, user_agent, correlation_id


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Attach the refresh token in an HttpOnly, SameSite, Secure cookie."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/api/v1/auth",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def _set_access_cookie(response: Response, access_token: str) -> None:
    """Attach the access token in an HttpOnly, SameSite, Secure cookie."""
    response.set_cookie(
        key="wealthos_access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie."""
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
    )


def _clear_auth_cookies(response: Response) -> None:
    """Clear all authentication cookies (access and refresh)."""
    _clear_refresh_cookie(response)
    response.delete_cookie(key="wealthos_access_token", path="/")
    response.delete_cookie(key="access_token", path="/")


# --------------------------------------------------------------------------
# Authentication & Lifecycle Endpoints
# --------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_limiter)],
    summary="Register a new user account",
)
async def register(
    payload: RegisterRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Register a new user, automatically provision a personal workspace, and dispatch email verification."""
    ip, ua, cid = _get_client_meta(request)

    try:
        user, tenant_id = await register_user(
            session=session,
            email=payload.email,
            password=payload.password,
            first_name=payload.first_name,
            last_name=payload.last_name,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        return {
            "success": True,
            "data": RegisterResponse(
                user_id=user.id,
                email=user.email,
                status=user.status,
                personal_tenant_id=tenant_id,
                message=(
                    "Registration successful. Please verify your email address before logging in."
                    if settings.is_production
                    else "Registration successful. Your account is active."
                ),
            ).model_dump(mode="json"),
        }
    except PasswordPolicyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except AuthenticationServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.post(
    "/login",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Authenticate user credentials",
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Authenticate email and password using Argon2id.

    Returns JWT tokens or requires MFA challenge completion.
    """
    ip, ua, cid = _get_client_meta(request)

    try:
        result = await authenticate_user(
            session=session,
            email=payload.email,
            password=payload.password,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )

        if result.get("mfa_required"):
            return {
                "success": True,
                "data": {
                    "mfa_required": True,
                    "mfa_token": result["mfa_token"],
                    "mfa_type": result.get("mfa_type", "totp"),
                },
            }

        # Successful complete login
        _set_refresh_cookie(response, result["refresh_token"])
        _set_access_cookie(response, result["access_token"])
        return {
            "success": True,
            "data": result,
        }
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["temporarily locked", "too many failed"])
            else status.HTTP_401_UNAUTHORIZED
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


@router.post(
    "/otp/send",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Dispatch 6-digit OTP to mobile phone number or email",
)
async def request_otp(
    payload: OTPSendRequest,
) -> dict[str, Any]:
    """Generate and dispatch a cryptographically secure 6-digit OTP code to mobile phone or email."""
    try:
        res = await send_otp(payload.identifier)
        return res
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["rate limit", "temporarily locked", "please wait", "too many failed"])
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
        ) from exc
    except Exception as exc:
        logger.error(f"Failed to dispatch OTP: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate verification code. Please try again.",
        ) from exc


@router.post(
    "/otp/verify",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Verify OTP code and authenticate session",
)
async def verify_otp_endpoint(
    payload: OTPVerifyRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Verify 6-digit OTP code. Auto-provisions new user or authenticates existing user."""
    ip, ua, cid = _get_client_meta(request)

    try:
        result = await verify_otp(
            session=session,
            identifier=payload.identifier,
            otp_code=payload.otp,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )

        _set_refresh_cookie(response, result["refresh_token"])
        _set_access_cookie(response, result["access_token"])
        return {
            "success": True,
            "data": result,
        }
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["temporarily locked", "too many failed"])
            else status.HTTP_401_UNAUTHORIZED
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc



@router.post(
    "/mfa/challenge",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Complete MFA challenge during sign in",
)
@router.post(
    "/mfa/verify",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Verify MFA code during sign in",
)
async def mfa_challenge(
    payload: MFAChallengeRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Verify TOTP code or single-use recovery code and complete session establishment."""
    ip, ua, cid = _get_client_meta(request)

    try:
        result = await complete_mfa_challenge(
            session=session,
            mfa_token=payload.mfa_token,
            code=payload.code,
            recovery_code=payload.recovery_code,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        _set_refresh_cookie(response, result["refresh_token"])
        _set_access_cookie(response, result["access_token"])
        return {
            "success": True,
            "data": result,
        }
    except (AuthenticationServiceError, MFASecurityError) as exc:
        if "temporarily unavailable" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


@router.post(
    "/refresh",
    response_model=dict[str, Any],
    summary="Rotate refresh token and issue new access JWT",
)
async def refresh_tokens(
    request: Request,
    response: Response,
    payload: RefreshTokenRequest | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Execute Refresh Token Rotation (RTR). Detects token reuse attacks and invalidates lineage."""
    ip, ua, cid = _get_client_meta(request)

    # 1. Check body payload, fallback to HttpOnly cookie
    raw_refresh = None
    if payload and payload.refresh_token:
        raw_refresh = payload.refresh_token
    else:
        raw_refresh = request.cookies.get("refresh_token")

    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token must be provided via request body or cookie.",
        )

    try:
        result = await rotate_refresh_token(
            session=session,
            raw_refresh_token=raw_refresh,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        _set_refresh_cookie(response, result["refresh_token"])
        _set_access_cookie(response, result["access_token"])
        return {
            "success": True,
            "data": result,
        }
    except AuthenticationServiceError as exc:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer error='invalid_token'"},
        ) from exc


@router.post(
    "/logout",
    response_model=dict[str, Any],
    summary="Terminate current user session",
)
async def logout(
    request: Request,
    response: Response,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Revoke active session and refresh tokens, clearing credentials."""
    user, session_id = auth_data
    ip, ua, cid = _get_client_meta(request)

    await logout_session(
        session=session,
        session_id=session_id,
        user_id=user.id,
        ip_address=ip,
        user_agent=ua,
        correlation_id=cid,
    )
    _clear_auth_cookies(response)
    return {
        "success": True,
        "message": "Successfully logged out.",
    }


@router.post(
    "/logout-all",
    response_model=dict[str, Any],
    summary="Terminate all active user sessions",
)
async def logout_all(
    request: Request,
    response: Response,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Terminate all active sessions and revoke every refresh token for user account."""
    user, _ = auth_data
    ip, ua, cid = _get_client_meta(request)

    await logout_all_sessions(
        session=session,
        user_id=user.id,
        ip_address=ip,
        user_agent=ua,
        correlation_id=cid,
    )
    _clear_auth_cookies(response)
    return {
        "success": True,
        "message": "All active sessions have been terminated.",
    }


@router.get(
    "/me",
    response_model=dict[str, Any],
    summary="Retrieve current user profile and workspaces",
)
async def get_me(
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Retrieve full profile details, email verification state, MFA status, and workspaces."""
    user, _ = auth_data
    user_tenants = await list_user_tenants(session, user.id)

    # Determine active workspace
    active_tenant_header = request.headers.get("X-Tenant-ID")
    active_tenant = None

    if active_tenant_header:
        active_tenant = next(
            (t for t in user_tenants if str(t["id"]) == active_tenant_header), None
        )

    if not active_tenant and user_tenants:
        # Default to personal workspace
        active_tenant = next(
            (t for t in user_tenants if t["tenant_type"] == "personal"), user_tenants[0]
        )

    mfa_enabled = bool(user.mfa_credential and user.mfa_credential.is_enabled)

    memberships_summary = [
        TenantSummary(
            id=t["id"],
            name=t["name"],
            slug=t["slug"],
            tenant_type=t["tenant_type"],
            role=t["role"],
            is_owner=t["is_owner"],
        )
        for t in user_tenants
    ]

    active_summary = (
        TenantSummary(
            id=active_tenant["id"],
            name=active_tenant["name"],
            slug=active_tenant["slug"],
            tenant_type=active_tenant["tenant_type"],
            role=active_tenant["role"],
            is_owner=active_tenant["is_owner"],
        )
        if active_tenant
        else None
    )

    profile = UserProfileResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=user.full_name,
        status=user.status,
        is_email_verified=user.email_verified_at is not None,
        mfa_enabled=mfa_enabled,
        active_tenant=active_summary,
        memberships=memberships_summary,
    )

    return {
        "success": True,
        "data": profile.model_dump(mode="json"),
    }


@router.delete(
    "/me",
    response_model=dict[str, Any],
    summary="Delete user account and purge personal data",
)
async def delete_account(
    payload: DeleteAccountRequest,
    request: Request,
    response: Response,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Permanently delete user account, invalidate sessions, and anonymize personal information.

    Complies with Google Play User Data Deletion and GDPR/DPDP Right to be Forgotten.
    """
    user, _ = auth_data
    ip, ua, cid = _get_client_meta(request)

    try:
        result = await delete_user_account(
            session=session,
            user=user,
            password=payload.password,
            confirmation_phrase=payload.confirmation_phrase,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        _clear_auth_cookies(response)
        return {
            "success": True,
            "data": result,
        }
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["rate limit", "temporarily locked", "please wait", "too many failed"])
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
        ) from exc


# --------------------------------------------------------------------------
# Email Verification & Password Recovery Endpoints
# --------------------------------------------------------------------------


@router.post(
    "/verify-email",
    response_model=dict[str, Any],
    dependencies=[Depends(general_limiter)],
    summary="Verify user email address",
)
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Validate one-time verification token and activate account."""
    ip, ua, cid = _get_client_meta(request)

    try:
        user = await verify_email_token(
            session=session,
            raw_token=payload.token,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        return {
            "success": True,
            "message": "Email address verified successfully. You may now sign in.",
            "data": {"user_id": user.id, "email": user.email, "status": user.status},
        }
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["rate limit", "temporarily locked", "please wait", "too many failed"])
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
        ) from exc


@router.post(
    "/resend-verification",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Resend email verification link",
)
async def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Re-issue email verification link with anti-enumeration protection."""
    ip, ua, cid = _get_client_meta(request)

    await resend_verification_email(
        session=session,
        email=payload.email,
        ip_address=ip,
        user_agent=ua,
        correlation_id=cid,
    )
    return {
        "success": True,
        "message": "If the account exists and is unverified, a verification link has been sent.",
    }


@router.post(
    "/forgot-password",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Request password reset email",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Initiate password recovery. Generates cryptographic token with anti-enumeration."""
    ip, ua, cid = _get_client_meta(request)

    await request_password_reset(
        session=session,
        email=payload.email,
        ip_address=ip,
        user_agent=ua,
        correlation_id=cid,
    )
    return {
        "success": True,
        "message": "If the email is registered, a password reset link has been dispatched.",
    }


@router.post(
    "/reset-password",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Reset password using one-time token",
)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Consume one-time reset token, enforce NIST password policy, and update hash."""
    ip, ua, cid = _get_client_meta(request)

    try:
        await reset_password_with_token(
            session=session,
            raw_token=payload.token,
            new_password=payload.new_password,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        return {
            "success": True,
            "message": "Password has been successfully updated. Please sign in with your new credentials.",
        }
    except PasswordPolicyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["rate limit", "temporarily locked", "please wait", "too many failed"])
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
        ) from exc


@router.post(
    "/change-password",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Change password for authenticated user",
)
async def update_password(
    payload: ChangePasswordRequest,
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Change password, terminating all other active sessions and invalidating refresh tokens."""
    user, _ = auth_data
    ip, ua, cid = _get_client_meta(request)

    try:
        await change_password(
            session=session,
            user=user,
            current_password=payload.current_password,
            new_password=payload.new_password,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        return {
            "success": True,
            "message": "Password changed successfully. All other active sessions have been terminated.",
        }
    except PasswordPolicyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["rate limit", "temporarily locked", "please wait", "too many failed"])
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
        ) from exc


# --------------------------------------------------------------------------
# Session Management Endpoints
# --------------------------------------------------------------------------


@router.get(
    "/sessions",
    response_model=dict[str, Any],
    summary="List active sessions for authenticated user",
)
async def get_sessions(
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """List all active sessions with IP, User-Agent, and current session indicator."""
    user, session_id = auth_data
    sessions = await list_user_sessions(session, user.id, current_session_id=session_id)
    return {
        "success": True,
        "data": [SessionResponse(**s).model_dump(mode="json") for s in sessions],
    }


@router.delete(
    "/sessions/{target_session_id}",
    response_model=dict[str, Any],
    summary="Revoke specific user session",
)
async def delete_session(
    target_session_id: uuid.UUID,
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Revoke specific device session by ID."""
    user, _ = auth_data
    ip, ua, cid = _get_client_meta(request)

    await logout_session(
        session=session,
        session_id=target_session_id,
        user_id=user.id,
        ip_address=ip,
        user_agent=ua,
        correlation_id=cid,
    )
    return {
        "success": True,
        "message": f"Session {target_session_id} has been revoked.",
    }


# --------------------------------------------------------------------------
# Multi-Factor Authentication (MFA) Endpoints
# --------------------------------------------------------------------------


@router.post(
    "/mfa/enroll",
    response_model=dict[str, Any],
    summary="Initiate TOTP MFA enrollment",
)
async def mfa_enroll(
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Generate TOTP base32 secret, otpauth provisioning URI, and single-use recovery codes."""
    user, _ = auth_data

    try:
        secret, uri, recovery_codes = await enroll_mfa(session, user)
        return {
            "success": True,
            "data": MFAEnrollResponse(
                secret=secret,
                provisioning_uri=uri,
                recovery_codes=recovery_codes,
            ).model_dump(mode="json"),
        }
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["rate limit", "temporarily locked", "please wait", "too many failed"])
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
        ) from exc


@router.post(
    "/mfa/verify-enrollment",
    response_model=dict[str, Any],
    summary="Verify TOTP setup and activate MFA",
)
async def mfa_verify_enrollment(
    payload: MFAVerifyEnrollmentRequest,
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Confirm authenticator setup by validating initial 6-digit TOTP code."""
    user, _ = auth_data
    ip, ua, cid = _get_client_meta(request)

    try:
        await verify_and_activate_mfa(
            session=session,
            user=user,
            code=payload.code,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        return {
            "success": True,
            "message": "Two-factor authentication has been successfully activated.",
        }
    except (AuthenticationServiceError, MFASecurityError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/mfa/disable",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Disable two-factor authentication",
)
async def mfa_disable(
    payload: MFADisableRequest,
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Disable MFA requiring password re-authentication and active TOTP code."""
    user, _ = auth_data
    ip, ua, cid = _get_client_meta(request)

    try:
        await disable_mfa(
            session=session,
            user=user,
            password=payload.password,
            code=payload.code,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )
        return {
            "success": True,
            "message": "Two-factor authentication has been disabled.",
        }
    except (AuthenticationServiceError, MFASecurityError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/mfa/recovery-codes",
    response_model=dict[str, Any],
    dependencies=[Depends(auth_limiter)],
    summary="Regenerate single-use backup recovery codes",
)
async def mfa_regenerate_recovery_codes(
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Generate fresh set of single-use recovery codes, invalidating prior codes."""
    user, _ = auth_data

    try:
        codes = await regenerate_recovery_codes(session=session, user=user)
        return {
            "success": True,
            "data": {"recovery_codes": codes},
            "message": "Recovery codes regenerated successfully. Store them in a secure password manager.",
        }
    except AuthenticationServiceError as exc:
        msg = str(exc)
        err_status = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if any(term in msg.lower() for term in ["rate limit", "temporarily locked", "please wait", "too many failed"])
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=err_status,
            detail=msg,
        ) from exc
