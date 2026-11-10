"""WealthOS Household Wealth Management Repository."""

import hashlib
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import delete, desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.household.models import (
    Household,
    HouseholdContribution,
    HouseholdGoal,
    HouseholdInvitation,
    HouseholdMembership,
    HouseholdSettlement,
    HouseholdSharedResource,
)


class HouseholdRepository:
    """Repository handling persistence and queries for household multi-user entities."""

    @staticmethod
    async def create_household(session: AsyncSession, household: Household) -> Household:
        session.add(household)
        await session.flush()
        return household

    @staticmethod
    async def get_household(
        session: AsyncSession, tenant_id: uuid.UUID, household_id: uuid.UUID
    ) -> Household | None:
        stmt = (
            select(Household)
            .options(
                selectinload(Household.memberships),
                selectinload(Household.shared_resources),
                selectinload(Household.goals),
            )
            .where(Household.id == household_id, Household.tenant_id == tenant_id)
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_user_households(
        session: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[Household]:
        stmt = (
            select(Household)
            .join(HouseholdMembership, HouseholdMembership.household_id == Household.id)
            .options(selectinload(Household.memberships))
            .where(
                Household.tenant_id == tenant_id,
                HouseholdMembership.user_id == user_id,
                HouseholdMembership.status == "ACTIVE",
            )
            .order_by(Household.created_at.desc())
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_membership(
        session: AsyncSession, household_id: uuid.UUID, user_id: uuid.UUID
    ) -> HouseholdMembership | None:
        stmt = select(HouseholdMembership).where(
            HouseholdMembership.household_id == household_id,
            HouseholdMembership.user_id == user_id,
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def add_membership(
        session: AsyncSession, membership: HouseholdMembership
    ) -> HouseholdMembership:
        session.add(membership)
        await session.flush()
        return membership

    @staticmethod
    async def create_invitation(
        session: AsyncSession, invitation: HouseholdInvitation
    ) -> HouseholdInvitation:
        session.add(invitation)
        await session.flush()
        return invitation

    @staticmethod
    async def get_invitation_by_token(
        session: AsyncSession, token: str
    ) -> HouseholdInvitation | None:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        stmt = select(HouseholdInvitation).where(
            HouseholdInvitation.token_hash == token_hash,
            HouseholdInvitation.status == "PENDING",
            HouseholdInvitation.expires_at > datetime.now(UTC),
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def share_resource(
        session: AsyncSession, resource: HouseholdSharedResource
    ) -> HouseholdSharedResource:
        # Check if already shared, if so update visibility/allocation
        stmt = select(HouseholdSharedResource).where(
            HouseholdSharedResource.household_id == resource.household_id,
            HouseholdSharedResource.resource_type == resource.resource_type,
            HouseholdSharedResource.resource_id == resource.resource_id,
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.visibility = resource.visibility
            existing.allocation_percentage = resource.allocation_percentage
            await session.flush()
            return existing

        session.add(resource)
        await session.flush()
        return resource

    @staticmethod
    async def list_shared_resources(
        session: AsyncSession, household_id: uuid.UUID
    ) -> list[HouseholdSharedResource]:
        stmt = (
            select(HouseholdSharedResource)
            .where(
                HouseholdSharedResource.household_id == household_id,
                HouseholdSharedResource.visibility.in_(["HOUSEHOLD_SHARED", "LIMITED_SHARED"]),
            )
            .order_by(HouseholdSharedResource.created_at.desc())
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def create_goal(session: AsyncSession, goal: HouseholdGoal) -> HouseholdGoal:
        session.add(goal)
        await session.flush()
        return goal

    @staticmethod
    async def get_goal(
        session: AsyncSession, household_id: uuid.UUID, goal_id: uuid.UUID
    ) -> HouseholdGoal | None:
        stmt = (
            select(HouseholdGoal)
            .options(selectinload(HouseholdGoal.contributions))
            .where(HouseholdGoal.id == goal_id, HouseholdGoal.household_id == household_id)
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def add_contribution(
        session: AsyncSession, contribution: HouseholdContribution
    ) -> HouseholdContribution:
        session.add(contribution)
        # Update goal current_amount
        goal_stmt = select(HouseholdGoal).where(HouseholdGoal.id == contribution.goal_id)
        goal = (await session.execute(goal_stmt)).scalar_one()
        goal.current_amount += contribution.amount
        if goal.current_amount >= goal.target_amount:
            goal.status = "COMPLETED"
        await session.flush()
        return contribution

    @staticmethod
    async def record_settlement(
        session: AsyncSession, settlement: HouseholdSettlement
    ) -> HouseholdSettlement:
        session.add(settlement)
        await session.flush()
        return settlement

    @staticmethod
    async def list_settlements(
        session: AsyncSession, household_id: uuid.UUID
    ) -> list[HouseholdSettlement]:
        stmt = (
            select(HouseholdSettlement)
            .where(HouseholdSettlement.household_id == household_id)
            .order_by(desc(HouseholdSettlement.settlement_date))
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())
