"""WealthOS Household Wealth Management Service Layer.

Implements multi-user collaboration, RBAC, invitations, resource sharing scopes,
transfer-neutral internal settlements, and consolidated household net worth.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.household.models import (
    Household,
    HouseholdContribution,
    HouseholdGoal,
    HouseholdInvitation,
    HouseholdMembership,
    HouseholdSettlement,
    HouseholdSharedResource,
)
from app.domains.household.repository import HouseholdRepository
from app.domains.household.schemas import (
    HouseholdContributionCreate,
    HouseholdCreate,
    HouseholdGoalCreate,
    HouseholdInvitationCreate,
    HouseholdResourceShareRequest,
    HouseholdSettlementCreate,
)

logger = get_logger("wealthos.household.service")


class HouseholdPermissionDeniedError(PermissionError):
    """Raised when user lacks required household role or ownership."""

    pass


class HouseholdService:
    """Service handling multi-user household wealth operations."""

    @staticmethod
    async def create_household(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: HouseholdCreate,
    ) -> Household:
        """Create a new household and assign creator as OWNER."""
        hh = Household(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=payload.name,
            currency=payload.currency.upper(),
            timezone=payload.timezone,
            owner_user_id=user_id,
        )
        await HouseholdRepository.create_household(session, hh)

        # Creator is OWNER membership
        membership = HouseholdMembership(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            household_id=hh.id,
            user_id=user_id,
            role="OWNER",
            status="ACTIVE",
        )
        await HouseholdRepository.add_membership(session, membership)

        return hh

    @staticmethod
    async def verify_member_role(
        session: AsyncSession,
        household_id: uuid.UUID,
        user_id: uuid.UUID,
        allowed_roles: set[str],
    ) -> HouseholdMembership:
        """Verify that user is an active member with an authorized role."""
        membership = await HouseholdRepository.get_membership(session, household_id, user_id)
        if not membership or membership.status != "ACTIVE":
            raise HouseholdPermissionDeniedError("User is not an active member of this household.")
        if membership.role not in allowed_roles:
            raise HouseholdPermissionDeniedError(
                f"Action requires one of roles: {allowed_roles}, but user has role '{membership.role}'."
            )
        return membership

    @staticmethod
    async def invite_member(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        current_user_id: uuid.UUID,
        household_id: uuid.UUID,
        payload: HouseholdInvitationCreate,
    ) -> tuple[HouseholdInvitation, str]:
        """Generate a secure cryptographic invitation token (OWNER / ADMIN only)."""
        await HouseholdService.verify_member_role(
            session, household_id, current_user_id, {"OWNER", "ADMIN"}
        )

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(UTC) + timedelta(days=7)

        invitation = HouseholdInvitation(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            household_id=household_id,
            email=payload.email.lower(),
            token_hash=token_hash,
            role=payload.role,
            expires_at=expires_at,
            status="PENDING",
        )
        saved = await HouseholdRepository.create_invitation(session, invitation)
        return saved, raw_token

    @staticmethod
    async def accept_invitation(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        token: str,
    ) -> HouseholdMembership:
        """Accept an invitation using raw token and establish membership."""
        inv = await HouseholdRepository.get_invitation_by_token(session, token)
        if not inv:
            raise ValueError("Invalid, expired, or already used invitation token.")

        # Check existing membership
        existing = await HouseholdRepository.get_membership(session, inv.household_id, user_id)
        if existing:
            inv.status = "ACCEPTED"
            await session.flush()
            return existing

        membership = HouseholdMembership(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            household_id=inv.household_id,
            user_id=user_id,
            role=inv.role,
            status="ACTIVE",
        )
        saved_membership = await HouseholdRepository.add_membership(session, membership)
        inv.status = "ACCEPTED"
        await session.flush()

        return saved_membership

    @staticmethod
    async def share_resource(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        current_user_id: uuid.UUID,
        household_id: uuid.UUID,
        payload: HouseholdResourceShareRequest,
    ) -> HouseholdSharedResource:
        """Register a financial resource with explicit visibility scope and allocation %."""
        await HouseholdService.verify_member_role(
            session, household_id, current_user_id, {"OWNER", "ADMIN", "MEMBER"}
        )

        resource = HouseholdSharedResource(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            household_id=household_id,
            owner_user_id=current_user_id,
            resource_type=payload.resource_type,
            resource_id=payload.resource_id,
            visibility=payload.visibility,
            allocation_percentage=payload.allocation_percentage,
        )
        return await HouseholdRepository.share_resource(session, resource)

    @staticmethod
    async def calculate_consolidated_net_worth(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        household_id: uuid.UUID,
    ) -> dict[str, Any]:
        """Deduplicated consolidated net worth calculation across all shared resources."""
        hh = await HouseholdRepository.get_household(session, tenant_id, household_id)
        if not hh:
            raise ValueError(f"Household {household_id} not found.")

        shared_resources = await HouseholdRepository.list_shared_resources(session, household_id)

        total_assets = Decimal("0.0000")
        total_liabilities = Decimal("0.0000")
        member_breakdowns: dict[uuid.UUID, dict[str, Any]] = {}

        # Initialize breakdown per member
        for m in hh.memberships:
            member_breakdowns[m.user_id] = {
                "user_id": str(m.user_id),
                "role": m.role,
                "shared_assets": Decimal("0.0000"),
                "shared_liabilities": Decimal("0.0000"),
                "net_contribution": Decimal("0.0000"),
            }

        for res in shared_resources:
            alloc_pct = res.allocation_percentage / Decimal("100.00")

            if res.resource_type in ("ACCOUNT", "ASSET"):
                val = Decimal("0.0000")
                if res.resource_type == "ACCOUNT":
                    q = text("SELECT current_balance FROM financial_accounts WHERE id = :id AND tenant_id = :tid")
                    row = (await session.execute(q, {"id": res.resource_id, "tid": tenant_id})).fetchone()
                    if row:
                        val = Decimal(str(row[0]))
                elif res.resource_type == "ASSET":
                    q = text("SELECT current_valuation FROM assets WHERE id = :id AND tenant_id = :tid AND is_active = TRUE")
                    row = (await session.execute(q, {"id": res.resource_id, "tid": tenant_id})).fetchone()
                    if row:
                        val = Decimal(str(row[0]))

                weighted_val = (val * alloc_pct).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
                total_assets += weighted_val
                if res.owner_user_id in member_breakdowns:
                    member_breakdowns[res.owner_user_id]["shared_assets"] += weighted_val

            elif res.resource_type == "LIABILITY":
                q = text("SELECT current_principal FROM liabilities WHERE id = :id AND tenant_id = :tid AND is_active = TRUE")
                row = (await session.execute(q, {"id": res.resource_id, "tid": tenant_id})).fetchone()
                val = Decimal(str(row[0])) if row else Decimal("0.0000")

                weighted_val = (val * alloc_pct).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
                total_liabilities += weighted_val
                if res.owner_user_id in member_breakdowns:
                    member_breakdowns[res.owner_user_id]["shared_liabilities"] += weighted_val

        consolidated_net_worth = total_assets - total_liabilities

        # Finalize member breakdown strings
        breakdown_list = []
        for m_id, b in member_breakdowns.items():
            net_contrib = b["shared_assets"] - b["shared_liabilities"]
            breakdown_list.append(
                {
                    "user_id": b["user_id"],
                    "role": b["role"],
                    "shared_assets": str(b["shared_assets"]),
                    "shared_liabilities": str(b["shared_liabilities"]),
                    "net_contribution": str(net_contrib),
                }
            )

        return {
            "household_id": hh.id,
            "household_name": hh.name,
            "currency": hh.currency,
            "total_household_net_worth": consolidated_net_worth,
            "total_shared_assets": total_assets,
            "total_shared_liabilities": total_liabilities,
            "member_count": len(hh.memberships),
            "shared_resources_count": len(shared_resources),
            "breakdown_by_member": breakdown_list,
        }

    @staticmethod
    async def create_shared_goal(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        current_user_id: uuid.UUID,
        household_id: uuid.UUID,
        payload: HouseholdGoalCreate,
    ) -> HouseholdGoal:
        """Create a shared milestone for the household."""
        await HouseholdService.verify_member_role(
            session, household_id, current_user_id, {"OWNER", "ADMIN", "MEMBER"}
        )
        goal = HouseholdGoal(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            household_id=household_id,
            name=payload.name,
            target_amount=payload.target_amount,
            current_amount=Decimal("0.0000"),
            currency=payload.currency.upper(),
            target_date=payload.target_date,
            status="ACTIVE",
        )
        return await HouseholdRepository.create_goal(session, goal)

    @staticmethod
    async def contribute_to_goal(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        current_user_id: uuid.UUID,
        household_id: uuid.UUID,
        goal_id: uuid.UUID,
        payload: HouseholdContributionCreate,
    ) -> HouseholdContribution:
        """Contribute funds toward a shared household goal."""
        await HouseholdService.verify_member_role(
            session, household_id, current_user_id, {"OWNER", "ADMIN", "MEMBER"}
        )
        contribution = HouseholdContribution(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            goal_id=goal_id,
            user_id=current_user_id,
            amount=payload.amount,
            currency="INR",
            note=payload.note,
        )
        return await HouseholdRepository.add_contribution(session, contribution)

    @staticmethod
    async def record_settlement(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        current_user_id: uuid.UUID,
        household_id: uuid.UUID,
        payload: HouseholdSettlementCreate,
    ) -> HouseholdSettlement:
        """Record transfer-neutral internal reimbursement between members."""
        await HouseholdService.verify_member_role(
            session, household_id, current_user_id, {"OWNER", "ADMIN", "MEMBER"}
        )
        if current_user_id == payload.payee_user_id:
            raise ValueError("Payer and payee must be distinct household members.")

        settlement = HouseholdSettlement(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            household_id=household_id,
            payer_user_id=current_user_id,
            payee_user_id=payload.payee_user_id,
            amount=payload.amount,
            currency=payload.currency.upper(),
            description=payload.description,
            status="COMPLETED",
        )
        return await HouseholdRepository.record_settlement(session, settlement)
