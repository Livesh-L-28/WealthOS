"""WealthOS Budget & Expense Intelligence REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.budget.schemas import (
    BudgetAllocationCreate,
    BudgetAllocationResponse,
    BudgetAlertResponse,
    BudgetCreate,
    BudgetPerformanceResponse,
    BudgetResponse,
    BudgetRolloverRequest,
    BudgetRolloverResponse,
    BudgetUpdate,
    ExpenseTrendsResponse,
    TransactionCategoryCreate,
    TransactionCategoryResponse,
)
from app.domains.budget.service import BudgetService

logger = get_logger("wealthos.budget")

router = APIRouter()


@router.get(
    "/categories",
    response_model=list[TransactionCategoryResponse],
    summary="List transaction categories",
)
async def list_categories(
    category_type: str | None = Query(None, description="INCOME, EXPENSE, TRANSFER, INVESTMENT"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[TransactionCategoryResponse]:
    """Retrieve expense and income classification categories."""
    service = BudgetService(session)
    cats = await service.repo.list_categories(context.tenant.id, category_type=category_type)
    return [TransactionCategoryResponse.model_validate(c) for c in cats]


@router.post(
    "/categories/seed",
    response_model=list[TransactionCategoryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Seed standard expense categories",
)
async def seed_standard_categories(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[TransactionCategoryResponse]:
    """Provision standard categories (Housing, Food, Healthcare, Utilities, etc.)."""
    service = BudgetService(session)
    cats = await service.seed_standard_categories(context.tenant.id)
    await session.commit()
    return [TransactionCategoryResponse.model_validate(c) for c in cats]


@router.post(
    "/categories",
    response_model=TransactionCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create custom transaction category",
)
async def create_category(
    payload: TransactionCategoryCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> TransactionCategoryResponse:
    """Register custom expense or income category."""
    service = BudgetService(session)
    cat = await service.create_category(context.tenant.id, payload)
    await session.commit()
    return TransactionCategoryResponse.model_validate(cat)


@router.get(
    "",
    response_model=list[BudgetResponse],
    summary="List active budget envelopes",
)
async def list_budgets(
    is_active: bool | None = Query(None),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[BudgetResponse]:
    """Retrieve all budget envelopes for tenant."""
    service = BudgetService(session)
    budgets = await service.repo.list_budgets(context.tenant.id, is_active=is_active)
    results = []
    for b in budgets:
        resp = await service.get_budget_response(context.tenant.id, b.id)
        results.append(resp)
    return results


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new budget envelope",
)
async def create_budget(
    payload: BudgetCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> BudgetResponse:
    """Establish a spending budget with category allocations."""
    service = BudgetService(session)
    try:
        resp = await service.create_budget(context.tenant.id, payload)
        await session.commit()
        return resp
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/alerts",
    response_model=list[BudgetAlertResponse],
    summary="List triggered budget threshold alerts",
)
async def list_budget_alerts(
    budget_id: uuid.UUID | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[BudgetAlertResponse]:
    """Retrieve triggered spending alerts."""
    service = BudgetService(session)
    alerts = await service.repo.list_alerts(context.tenant.id, budget_id=budget_id, limit=limit)
    return [BudgetAlertResponse.model_validate(a) for a in alerts]


@router.get(
    "/analytics/trends",
    response_model=ExpenseTrendsResponse,
    summary="Get multi-month expense trends and analytics",
)
async def get_expense_trends(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> ExpenseTrendsResponse:
    """Retrieve historical category and merchant expense trends."""
    service = BudgetService(session)
    return await service.get_expense_trends(context.tenant.id)


@router.get(
    "/{budget_id}",
    response_model=BudgetResponse,
    summary="Get budget details by ID",
)
async def get_budget(
    budget_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> BudgetResponse:
    """Retrieve single budget plan with its allocations."""
    service = BudgetService(session)
    try:
        return await service.get_budget_response(context.tenant.id, budget_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put(
    "/{budget_id}",
    response_model=BudgetResponse,
    summary="Revise budget limit and details",
)
async def update_budget(
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> BudgetResponse:
    """Revise total budget amount, automatically logging an audit revision."""
    service = BudgetService(session)
    try:
        resp = await service.update_budget(context.tenant.id, budget_id, payload)
        await session.commit()
        return resp
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{budget_id}/allocations",
    response_model=BudgetAllocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update category allocation",
)
async def add_or_update_allocation(
    budget_id: uuid.UUID,
    payload: BudgetAllocationCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> BudgetAllocationResponse:
    """Add or adjust a category spending envelope."""
    service = BudgetService(session)
    try:
        resp = await service.add_or_update_allocation(context.tenant.id, budget_id, payload)
        await session.commit()
        return resp
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/{budget_id}/performance",
    response_model=BudgetPerformanceResponse,
    summary="Compute budget versus actual variance and alerts",
)
async def get_budget_performance(
    budget_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> BudgetPerformanceResponse:
    """Evaluate deterministic budget performance: planned vs actual, variances, and threshold triggers."""
    service = BudgetService(session)
    try:
        resp = await service.calculate_budget_performance(context.tenant.id, budget_id)
        await session.commit()
        return resp
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/rollover",
    response_model=BudgetRolloverResponse,
    summary="Execute budget rollover to next period",
)
async def execute_rollover(
    payload: BudgetRolloverRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> BudgetRolloverResponse:
    """Carry over unspent surplus or deficit into target period allocations."""
    service = BudgetService(session)
    try:
        resp = await service.apply_rollover(context.tenant.id, payload)
        await session.commit()
        return resp
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
