"""WealthOS Phase 19 Workstream 4: Advanced Identity, Passkeys & Account Protection Tests.

Validates FIDO2 WebAuthn lifecycle, authenticator cloning detection,
device fingerprint trust and revocation, suspicious login heuristics, and scoped API keys.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.identity.api_keys import (
    ApiKeyService,
    InsufficientScopeError,
    InvalidApiKeyError,
)
from app.domains.identity.devices import DeviceRegistryService
from app.domains.identity.models import User
from app.domains.identity.passkeys import (
    AuthenticatorCloneDetectedError,
    PasskeyService,
)
from app.domains.identity.suspicious_login import SuspiciousLoginService
from app.domains.tenants.models import Tenant


@pytest.fixture
async def identity_test_context(db_session: AsyncSession):
    """Seed test tenant and user for identity tests."""
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Identity Trust Co",
        slug=f"id-trust-{uuid.uuid4().hex[:6]}",
        status="ACTIVE",
    )
    db_session.add(tenant)

    user = User(
        id=uuid.uuid4(),
        email=f"user-{uuid.uuid4().hex[:6]}@wealthos.security",
        first_name="Ada",
        last_name="Lovelace",
        status="active",
        email_verified_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()

    await db_session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, false);"),
        {"tid": str(tenant.id)},
    )

    return {"tenant_id": tenant.id, "user_id": user.id, "email": user.email}


@pytest.mark.asyncio
async def test_passkey_lifecycle_and_clone_detection(
    db_session: AsyncSession,
    identity_test_context: dict,
):
    """Verify Passkey challenge creation, registration, and clone detection."""
    user_id = identity_test_context["user_id"]
    email = identity_test_context["email"]
    passkey_svc = PasskeyService(db_session)

    # 1. Registration Challenge
    reg_challenge = await passkey_svc.create_registration_challenge(user_id, email)
    assert "challenge" in reg_challenge
    assert reg_challenge["user"]["id"] == str(user_id)

    # 2. Complete Registration
    cred_id = f"cred_{uuid.uuid4().hex}"
    cred = await passkey_svc.verify_and_register_credential(
        user_id=user_id,
        challenge=reg_challenge["challenge"],
        credential_id=cred_id,
        public_key="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0...",
        credential_name="MacBook TouchID",
        initial_sign_count=10,
    )
    assert cred.credential_id == cred_id
    assert cred.sign_count == 10

    # 3. Authentication Challenge
    auth_challenge = await passkey_svc.create_authentication_challenge(user_id)
    assert "challenge" in auth_challenge

    # 4. Successful Assertion with incremented sign count (11 > 10)
    verified_cred = await passkey_svc.verify_authentication_assertion(
        user_id=user_id,
        challenge=auth_challenge["challenge"],
        credential_id=cred_id,
        new_sign_count=11,
    )
    assert verified_cred.sign_count == 11

    # 5. Cloned Authenticator Detection: Replay or decrement sign count
    auth_challenge_2 = await passkey_svc.create_authentication_challenge(user_id)
    with pytest.raises(AuthenticatorCloneDetectedError):
        await passkey_svc.verify_authentication_assertion(
            user_id=user_id,
            challenge=auth_challenge_2["challenge"],
            credential_id=cred_id,
            new_sign_count=11,  # Duplicate / non-increasing counter!
        )


@pytest.mark.asyncio
async def test_device_registry_and_revocation(
    db_session: AsyncSession,
    identity_test_context: dict,
):
    """Verify hardware fingerprint hashing, registration, and revocation."""
    user_id = identity_test_context["user_id"]
    device_svc = DeviceRegistryService(db_session)

    fp = device_svc.compute_fingerprint(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        client_ip="192.168.1.100",
        screen_resolution="2560x1440",
    )
    assert len(fp) == 64

    # 1. Register device
    dev, is_new = await device_svc.register_or_update_device(
        user_id=user_id,
        device_fingerprint=fp,
        device_name="MacBook Pro Workstation",
        device_type="DESKTOP",
        client_ip="192.168.1.100",
    )
    assert is_new is True
    assert dev.is_trusted is True

    # 2. Update existing device
    dev_updated, is_new_2 = await device_svc.register_or_update_device(
        user_id=user_id,
        device_fingerprint=fp,
        device_name="MacBook Pro Workstation",
    )
    assert is_new_2 is False

    # 3. Verify Trust
    trusted = await device_svc.is_device_trusted(user_id, fp)
    assert trusted is True

    # 4. Revoke Trust
    revoked = await device_svc.revoke_device(user_id, dev.id)
    assert revoked is True

    trusted_after = await device_svc.is_device_trusted(user_id, fp)
    assert trusted_after is False


@pytest.mark.asyncio
async def test_suspicious_login_evaluation(
    db_session: AsyncSession,
    identity_test_context: dict,
):
    """Verify suspicious login risk scoring and step-up authentication triggers."""
    user_id = identity_test_context["user_id"]
    device_svc = DeviceRegistryService(db_session)
    login_svc = SuspiciousLoginService(db_session)

    # 1. Register a trusted device first
    known_fp = "known_trusted_fingerprint_hash_12345"
    await device_svc.register_or_update_device(
        user_id=user_id,
        device_fingerprint=known_fp,
        device_name="Primary Laptop",
        auto_trust=True,
    )

    # Case A: Low risk login from trusted device with 0 failed attempts
    eval_low = await login_svc.evaluate_login_risk(
        user_id=user_id,
        device_fingerprint=known_fp,
        failed_attempts_last_hour=0,
    )
    assert eval_low.requires_step_up is False
    assert eval_low.risk_level == "LOW"

    # Case B: High risk login from unfamiliar device with 5 failed attempts + proxy
    eval_high = await login_svc.evaluate_login_risk(
        user_id=user_id,
        device_fingerprint="unknown_suspicious_device_999",
        failed_attempts_last_hour=5,
        is_known_proxy=True,
    )
    assert eval_high.requires_step_up is True
    assert eval_high.risk_level in ("HIGH", "CRITICAL")
    assert "NEW_OR_UNTRUSTED_DEVICE" in eval_high.risk_factors
    assert "HIGH_FAILED_LOGIN_FREQUENCY" in eval_high.risk_factors


@pytest.mark.asyncio
async def test_scoped_api_key_lifecycle_and_enforcement(
    db_session: AsyncSession,
    identity_test_context: dict,
):
    """Verify API key generation, hashing, scope enforcement, and revocation."""
    tenant_id = identity_test_context["tenant_id"]
    user_id = identity_test_context["user_id"]
    api_key_svc = ApiKeyService(db_session)

    # 1. Create Key
    key_record, plaintext = await api_key_svc.create_api_key(
        tenant_id=tenant_id,
        user_id=user_id,
        key_name="Reporting Automation Bot",
        scopes=["ledger:read", "analytics:read"],
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    assert plaintext.startswith("wos_")
    assert key_record.key_hash != plaintext  # Stored hash is segregated from secret

    # 2. Authenticate with valid scope
    authed = await api_key_svc.authenticate_api_key(plaintext, required_scope="ledger:read")
    assert authed.id == key_record.id

    # 3. Authenticate with missing scope -> InsufficientScopeError
    with pytest.raises(InsufficientScopeError):
        await api_key_svc.authenticate_api_key(plaintext, required_scope="funds:transfer")

    # 4. Revocation
    revoked = await api_key_svc.revoke_api_key(tenant_id, key_record.id)
    assert revoked is True

    with pytest.raises(InvalidApiKeyError):
        await api_key_svc.authenticate_api_key(plaintext)
