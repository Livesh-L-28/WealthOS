"""WealthOS Chart of Accounts Model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domains.accounting.models.journal_line import JournalLine


class Account(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Chart of Accounts entity representing an asset, liability, equity, income, or expense account."""

    __tablename__ = "accounts"
    __table_args__ = (UniqueConstraint("tenant_id", "account_code", name="uq_tenant_account_code"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Owning tenant workspace identifier",
    )
    account_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="Unique account code within tenant (e.g., 1020)",
    )
    account_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Human-readable account name",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Optional account description or usage notes",
    )
    account_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="ASSET, LIABILITY, EQUITY, INCOME, or EXPENSE",
    )
    normal_balance: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        doc="DEBIT or CREDIT",
    )
    parent_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        doc="Parent account for hierarchical rollup",
    )
    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        doc="ISO 4217 denomination currency",
    )
    is_system_account: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Flag indicating system-generated account protected from deletion",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether account accepts new postings",
    )
    is_control_account: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether account is a control account updated only by system sub-ledgers",
    )

    # Relationships
    parent_account: Mapped["Account | None"] = relationship(
        "Account",
        remote_side="Account.id",
        backref="sub_accounts",
    )
    journal_lines: Mapped[list["JournalLine"]] = relationship(
        "JournalLine",
        back_populates="account",
        lazy="selectin",
    )
