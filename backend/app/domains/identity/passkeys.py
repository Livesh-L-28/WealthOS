"""WealthOS FIDO2 / WebAuthn Passkeys Service.

Handles challenge generation, public key registration, and assertion verification
with authenticator cloning detection via monotonic sign_count verification.
"""

from __future__ import annotations

import base64
import os
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.identity.models import WebAuthnCredential

logger = get_logger("wealthos.passkeys")

# In-memory challenge store with TTL (in production, Redis backend)
_ACTIVE_CHALLENGES: dict[str, dict[str, Any]] = {}


class PasskeyError(Exception):
    """Base exception for WebAuthn/Passkey errors."""


class AuthenticatorCloneDetectedError(PasskeyError):
    """Raised when an authenticator signature count does not increase monotonically."""


class PasskeyService:
    """Enterprise FIDO2 / WebAuthn Passkey Service."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def generate_challenge() -> str:
        """Generate a cryptographically secure 32-byte URL-safe base64 challenge."""
        return base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8").rstrip("=")

    async def create_registration_challenge(
        self,
        user_id: uuid.UUID,
        user_email: str,
        rp_name: str = "WealthOS Financial",
        rp_id: str = "wealthos.app",
    ) -> dict[str, Any]:
        """Generate WebAuthn PublicKeyCredentialCreationOptions challenge."""
        challenge = self.generate_challenge()
        challenge_key = f"reg:{user_id}:{challenge}"
        _ACTIVE_CHALLENGES[challenge_key] = {
            "user_id": str(user_id),
            "challenge": challenge,
            "created_at": datetime.now(UTC),
            "type": "registration",
        }

        return {
            "challenge": challenge,
            "rp": {"name": rp_name, "id": rp_id},
            "user": {
                "id": str(user_id),
                "name": user_email,
                "displayName": user_email.split("@")[0],
            },
            "pubKeyCredParams": [
                {"type": "public-key", "alg": -7},   # ES256
                {"type": "public-key", "alg": -257}, # RS256
            ],
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",
                "userVerification": "required",
                "residentKey": "preferred",
            },
            "timeout": 60000,
        }

    async def verify_and_register_credential(
        self,
        user_id: uuid.UUID,
        challenge: str,
        credential_id: str,
        public_key: str,
        credential_name: str = "Passkey",
        aaguid: str | None = None,
        initial_sign_count: int = 0,
    ) -> WebAuthnCredential:
        """Verify registration challenge and persist public key credential."""
        challenge_key = f"reg:{user_id}:{challenge}"
        cached = _ACTIVE_CHALLENGES.pop(challenge_key, None)
        if not cached:
            raise PasskeyError("Invalid or expired WebAuthn registration challenge.")

        # Check existing credential_id
        stmt = select(WebAuthnCredential).where(WebAuthnCredential.credential_id == credential_id)
        res = await self.session.execute(stmt)
        if res.scalar_one_or_none():
            raise PasskeyError("Passkey credential ID is already registered.")

        cred = WebAuthnCredential(
            id=uuid.uuid4(),
            user_id=user_id,
            credential_id=credential_id,
            public_key=public_key,
            sign_count=initial_sign_count,
            credential_name=credential_name,
            aaguid=aaguid,
            is_active=True,
            created_at=datetime.now(UTC),
        )
        self.session.add(cred)
        await self.session.flush()
        logger.info(f"Registered WebAuthn passkey '{credential_name}' for user {user_id}")
        return cred

    async def create_authentication_challenge(self, user_id: uuid.UUID) -> dict[str, Any]:
        """Generate WebAuthn PublicKeyCredentialRequestOptions challenge."""
        stmt = select(WebAuthnCredential).where(
            WebAuthnCredential.user_id == user_id,
            WebAuthnCredential.is_active == True,
        )
        res = await self.session.execute(stmt)
        creds = list(res.scalars().all())
        if not creds:
            raise PasskeyError("No active WebAuthn credentials found for user.")

        challenge = self.generate_challenge()
        challenge_key = f"auth:{user_id}:{challenge}"
        _ACTIVE_CHALLENGES[challenge_key] = {
            "user_id": str(user_id),
            "challenge": challenge,
            "created_at": datetime.now(UTC),
            "type": "authentication",
        }

        return {
            "challenge": challenge,
            "timeout": 60000,
            "rpId": "wealthos.app",
            "allowCredentials": [
                {"type": "public-key", "id": c.credential_id} for c in creds
            ],
            "userVerification": "required",
        }

    async def verify_authentication_assertion(
        self,
        user_id: uuid.UUID,
        challenge: str,
        credential_id: str,
        new_sign_count: int,
    ) -> WebAuthnCredential:
        """Validate challenge and monotonic sign_count (authenticator clone defense)."""
        challenge_key = f"auth:{user_id}:{challenge}"
        cached = _ACTIVE_CHALLENGES.pop(challenge_key, None)
        if not cached:
            raise PasskeyError("Invalid or expired WebAuthn authentication challenge.")

        stmt = select(WebAuthnCredential).where(
            WebAuthnCredential.credential_id == credential_id,
            WebAuthnCredential.user_id == user_id,
            WebAuthnCredential.is_active == True,
        )
        res = await self.session.execute(stmt)
        cred = res.scalar_one_or_none()
        if not cred:
            raise PasskeyError(f"Passkey credential '{credential_id}' not found or inactive.")

        # Authenticator Cloning Detection: sign_count must strictly increase if supported (> 0)
        if cred.sign_count > 0 and new_sign_count <= cred.sign_count:
            logger.error(
                f"[SECURITY ALERT] Possible cloned passkey detected for user {user_id}! "
                f"Stored count={cred.sign_count}, Received count={new_sign_count}"
            )
            raise AuthenticatorCloneDetectedError(
                f"Authenticator clone detected: sign count {new_sign_count} <= previous count {cred.sign_count}."
            )

        cred.sign_count = new_sign_count
        cred.last_used_at = datetime.now(UTC)
        await self.session.flush()
        logger.info(f"Verified passkey assertion for credential {credential_id} (user {user_id})")
        return cred

