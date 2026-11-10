"""WealthOS Financial Planning & Forecasting Repository."""

import uuid
from typing import Sequence

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.planning.models import (
    FinancialGoal,
    FinancialScenario,
    ForecastRun,
    GoalContribution,
    RetirementProfile,
)


class PlanningRepository:
    """Data access repository for goals, retirement, forecasting and scenarios."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # -------------------------------------------------------------------------
    # Goals
    # -------------------------------------------------------------------------
    async def create_goal(self, goal: FinancialGoal) -> FinancialGoal:
        self.session.add(goal)
        await self.session.flush()
        return goal

    async def get_goal(self, tenant_id: uuid.UUID, goal_id: uuid.UUID) -> FinancialGoal | None:
        stmt = (
            select(FinancialGoal)
            .options(selectinload(FinancialGoal.contributions))
            .where(FinancialGoal.tenant_id == tenant_id, FinancialGoal.id == goal_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_goals(
        self, tenant_id: uuid.UUID, status: str | None = None
    ) -> Sequence[FinancialGoal]:
        stmt = select(FinancialGoal).where(FinancialGoal.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(FinancialGoal.status == status)
        stmt = stmt.order_by(FinancialGoal.target_date.asc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_goal(self, goal: FinancialGoal) -> None:
        await self.session.delete(goal)
        await self.session.flush()

    # -------------------------------------------------------------------------
    # Contributions
    # -------------------------------------------------------------------------
    async def add_contribution(self, contribution: GoalContribution) -> GoalContribution:
        self.session.add(contribution)
        await self.session.flush()
        return contribution

    async def list_contributions(
        self, tenant_id: uuid.UUID, goal_id: uuid.UUID
    ) -> Sequence[GoalContribution]:
        stmt = (
            select(GoalContribution)
            .where(
                GoalContribution.tenant_id == tenant_id,
                GoalContribution.goal_id == goal_id,
            )
            .order_by(desc(GoalContribution.contribution_date))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    # -------------------------------------------------------------------------
    # Retirement Profiles
    # -------------------------------------------------------------------------
    async def get_retirement_profile(self, tenant_id: uuid.UUID) -> RetirementProfile | None:
        stmt = select(RetirementProfile).where(RetirementProfile.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_retirement_profile(self, profile: RetirementProfile) -> RetirementProfile:
        self.session.add(profile)
        await self.session.flush()
        return profile

    # -------------------------------------------------------------------------
    # Forecast Runs & Scenarios
    # -------------------------------------------------------------------------
    async def create_forecast_run(self, run: ForecastRun) -> ForecastRun:
        self.session.add(run)
        await self.session.flush()
        return run

    async def list_forecast_runs(self, tenant_id: uuid.UUID) -> Sequence[ForecastRun]:
        stmt = (
            select(ForecastRun)
            .where(ForecastRun.tenant_id == tenant_id)
            .order_by(desc(ForecastRun.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_scenario(self, scenario: FinancialScenario) -> FinancialScenario:
        self.session.add(scenario)
        await self.session.flush()
        return scenario

    async def get_scenario(
        self, tenant_id: uuid.UUID, scenario_id: uuid.UUID
    ) -> FinancialScenario | None:
        stmt = select(FinancialScenario).where(
            FinancialScenario.tenant_id == tenant_id,
            FinancialScenario.id == scenario_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_scenarios(self, tenant_id: uuid.UUID) -> Sequence[FinancialScenario]:
        stmt = (
            select(FinancialScenario)
            .where(FinancialScenario.tenant_id == tenant_id)
            .order_by(desc(FinancialScenario.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
