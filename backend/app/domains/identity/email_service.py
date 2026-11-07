"""WealthOS Email Delivery Service & Local Development Adapter.

Provides an interface for transactional notifications and a local development adapter
that safely records messages for local inspection and automated testing.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Protocol

from app.core.logging import get_logger

logger = get_logger("wealthos.email")


@dataclass
class EmailMessage:
    """Represents a transactional email dispatched by the system."""

    to_email: str
    subject: str
    token: str
    message_type: str  # email_verification, password_reset, invitation
    sent_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    body_text: str = ""


class EmailService(Protocol):
    """Protocol defining the transactional email delivery interface."""

    async def send_email_verification(self, to_email: str, token: str) -> None:
        """Dispatch email verification link with token."""
        ...

    async def send_password_reset(self, to_email: str, token: str) -> None:
        """Dispatch password reset link with token."""
        ...

    async def send_tenant_invitation(
        self, to_email: str, tenant_name: str, token: str, inviter_name: str
    ) -> None:
        """Dispatch workspace invitation link with token."""
        ...


class LocalMemoryEmailAdapter:
    """Thread-safe in-memory email adapter for local development and test automation."""

    def __init__(self) -> None:
        self._outbox: list[EmailMessage] = []

    async def send_email_verification(self, to_email: str, token: str) -> None:
        msg = EmailMessage(
            to_email=to_email,
            subject="Verify your WealthOS Account",
            token=token,
            message_type="email_verification",
            body_text=f"Please verify your account using token: {token}",
        )
        self._outbox.append(msg)
        logger.info(
            f"[DEV EMAIL] Dispatched email_verification to {to_email}, token={token[:8]}..."
        )

    async def send_password_reset(self, to_email: str, token: str) -> None:
        msg = EmailMessage(
            to_email=to_email,
            subject="Reset your WealthOS Password",
            token=token,
            message_type="password_reset",
            body_text=f"Reset your password using token: {token}",
        )
        self._outbox.append(msg)
        logger.info(f"[DEV EMAIL] Dispatched password_reset to {to_email}, token={token[:8]}...")

    async def send_tenant_invitation(
        self, to_email: str, tenant_name: str, token: str, inviter_name: str
    ) -> None:
        msg = EmailMessage(
            to_email=to_email,
            subject=f"Invitation to join {tenant_name} on WealthOS",
            token=token,
            message_type="invitation",
            body_text=f"{inviter_name} invited you to {tenant_name}. Token: {token}",
        )
        self._outbox.append(msg)
        logger.info(f"[DEV EMAIL] Dispatched tenant_invitation to {to_email}, token={token[:8]}...")

    def get_sent_messages(self, to_email: str | None = None) -> list[EmailMessage]:
        """Retrieve sent emails, optionally filtered by recipient."""
        if to_email:
            return [m for m in self._outbox if m.to_email == to_email]
        return list(self._outbox)

    def get_latest_token_for(self, to_email: str, message_type: str) -> str | None:
        """Retrieve the most recent token dispatched to an email for a specific message type."""
        for msg in reversed(self._outbox):
            if msg.to_email == to_email and msg.message_type == message_type:
                return msg.token
        return None

    def get_outbox(self) -> list[dict]:
        """Convenience method returning outbox as dictionary list for assertions."""
        return [{"to": m.to_email, "token": m.token, "type": m.message_type} for m in self._outbox]

    def clear(self) -> None:
        """Clear outbox history."""
        self._outbox.clear()


# Default singleton adapter instance
email_adapter = LocalMemoryEmailAdapter()


def get_email_service() -> EmailService:
    """Dependency provider returning active EmailService implementation."""
    return email_adapter
