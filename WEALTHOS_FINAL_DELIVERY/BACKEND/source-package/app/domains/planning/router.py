"""WealthOS Financial Planning & Forecasting REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.planning.schemas import (
    CashFlowForecastRequest,
    CashFlowForecastResponse,
    EmergencyFundAnalysisResponse,
    GoalContributionCreate,
    GoalContributionResponse,
    GoalCreate,
    GoalFeasibilityResponse,
    GoalResponse,
    GoalUpdate,
    RetirementProfileCreate,
    RetirementProfileUpdate,
    RetirementProjectionResponse,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
)
from app.domains.planning.service import PlanningService

logger = get_logger("wealthos.planning")

planning_router = APIRouter()
goals_router = APIRouter()


# =============================================================================
# Goals Endpoints
# =============================================================================

@goals_router.post(
    "",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new financial goal",
)
async def create_goal(
    payload: GoalCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> GoalResponse:
    """Create a new financial goal with feasibility and progress tracking."""
    service = PlanningService(session)
    return await service.create_goal(context.tenant.id, payload)


@goals_router.get(
    "",
    response_model=list[GoalResponse],
    summary="List all financial goals",
)
async def list_goals(
    status: str | None = Query(None, description="Filter by goal status"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[GoalResponse]:
    """List financial goals with live progress and feasibility assessment."""
    service = PlanningService(session)
    return await service.list_goals(context.tenant.id, status=status)


@goals_router.get(
    "/{goal_id}",
    response_model=GoalResponse,
    summary="Get single financial goal details",
)
async def get_goal(
    goal_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> GoalResponse:
    """Retrieve financial goal details with inflation-adjusted feasibility."""
    service = PlanningService(session)
    goal = await service.get_goal(context.tenant.id, goal_id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial goal '{goal_id}' not found.",
        )
    return goal


@goals_router.put(
    "/{goal_id}",
    response_model=GoalResponse,
    summary="Update financial goal",
)
async def update_goal(
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> GoalResponse:
    """Update goal targets, monthly contributions, or status."""
    service = PlanningService(session)
    updated = await service.update_goal(context.tenant.id, goal_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial goal '{goal_id}' not found.",
        )
    return updated


@goals_router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete financial goal",
)
async def delete_goal(
    goal_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete goal and associated contributions."""
    service = PlanningService(session)
    deleted = await service.delete_goal(context.tenant.id, goal_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial goal '{goal_id}' not found.",
        )


@goals_router.post(
    "/{goal_id}/contributions",
    response_model=GoalContributionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a contribution to a goal",
)
async def add_goal_contribution(
    goal_id: uuid.UUID,
    payload: GoalContributionCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> GoalContributionResponse:
    """Add funding contribution to goal and update balance."""
    service = PlanningService(session)
    contrib = await service.add_contribution(context.tenant.id, goal_id, payload)
    if not contrib:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial goal '{goal_id}' not found.",
        )
    return contrib


@goals_router.get(
    "/{goal_id}/contributions",
    response_model=list[GoalContributionResponse],
    summary="List contributions for a goal",
)
async def list_goal_contributions(
    goal_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[GoalContributionResponse]:
    """Retrieve contribution history for goal."""
    service = PlanningService(session)
    return await service.list_contributions(context.tenant.id, goal_id)


@goals_router.get(
    "/{goal_id}/feasibility",
    response_model=GoalFeasibilityResponse,
    summary="Get detailed feasibility assessment for a goal",
)
async def get_goal_feasibility(
    goal_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> GoalFeasibilityResponse:
    """Evaluate inflation-adjusted target, required contribution, and feasibility classification."""
    service = PlanningService(session)
    goal = await service.repo.get_goal(context.tenant.id, goal_id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial goal '{goal_id}' not found.",
        )
    return service.compute_goal_feasibility(goal)


# =============================================================================
# Planning, Retirement, Emergency & Simulator Endpoints
# =============================================================================

@planning_router.get(
    "/retirement",
    response_model=RetirementProjectionResponse,
    summary="Get retirement profile and corpus projection",
)
async def get_retirement_projection(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> RetirementProjectionResponse:
    """Retrieve retirement corpus projection, drawdown requirements, and readiness."""
    service = PlanningService(session)
    profile = await service.get_or_create_retirement_profile(context.tenant.id)
    return service.compute_retirement_projection(profile)


@planning_router.put(
    "/retirement",
    response_model=RetirementProjectionResponse,
    summary="Update retirement profile parameters",
)
async def update_retirement_profile(
    payload: RetirementProfileUpdate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> RetirementProjectionResponse:
    """Update age, expense, or expected return parameters and recalculate corpus."""
    service = PlanningService(session)
    return await service.update_retirement_profile(context.tenant.id, payload)


@planning_router.get(
    "/emergency-fund",
    response_model=EmergencyFundAnalysisResponse,
    summary="Analyze emergency fund coverage against essential expenses",
)
async def get_emergency_fund_analysis(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> EmergencyFundAnalysisResponse:
    """Calculate months of emergency coverage against liquid cash assets and mandatory obligations."""
    service = PlanningService(session)
    return await service.analyze_emergency_fund(context.tenant.id)


@planning_router.post(
    "/forecast",
    response_model=CashFlowForecastResponse,
    summary="Generate multi-horizon cash flow forecast",
)
async def generate_cash_flow_forecast(
    payload: CashFlowForecastRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> CashFlowForecastResponse:
    """Deterministic multi-month projection of income, expenses, debt service, and cash closing balance."""
    service = PlanningService(session)
    return await service.forecast_cash_flow(context.tenant.id, payload)


@planning_router.post(
    "/simulate",
    response_model=ScenarioSimulationResponse,
    summary="Run non-mutating what-if scenario simulation",
)
async def simulate_what_if_scenario(
    payload: ScenarioSimulationRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> ScenarioSimulationResponse:
    """Simulate income shocks, expense changes, or debt prepayments without modifying production data."""
    service = PlanningService(session)
    return await service.simulate_scenario(context.tenant.id, payload)


@planning_router.get(
    "/scenarios",
    response_model=list[dict],
    summary="List past what-if scenarios",
)
async def list_scenarios(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    """Retrieve historical what-if simulations run for this workspace."""
    service = PlanningService(session)
    scenarios = await service.repo.list_scenarios(context.tenant.id)
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "scenario_inputs": s.scenario_inputs,
            "simulation_results": s.simulation_results,
            "created_at": s.created_at,
        }
        for s in scenarios
    ]
