"""WealthOS Financial Risk Intelligence REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.risk.schemas import (
    AlertStatusUpdate,
    FinancialHealthScoreResponse,
    RiskAlertResponse,
    RiskAssessmentResponse,
)
from app.domains.risk.service import RiskService

logger = get_logger("wealthos.risk")

router = APIRouter()


@router.post(
    "/assess",
    response_model=RiskAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger on-demand financial risk assessment",
)
async def run_risk_assessment(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> RiskAssessmentResponse:
    """Evaluate financial risks across liquidity, debt, concentration, and generate evidence-backed alerts."""
    service = RiskService(session)
    return await service.run_assessment(context.tenant.id)


@router.get(
    "/assessments/latest",
    response_model=RiskAssessmentResponse,
    summary="Get latest financial risk assessment snapshot",
)
async def get_latest_assessment(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> RiskAssessmentResponse:
    """Retrieve the most recent risk scan and signal analysis."""
    service = RiskService(session)
    latest = await service.repo.get_latest_assessment(context.tenant.id)
    if not latest:
        return await service.run_assessment(context.tenant.id)
    return RiskAssessmentResponse(
        id=latest.id,
        tenant_id=latest.tenant_id,
        assessment_date=latest.assessment_date,
        health_score=latest.health_score,
        liquidity_ratio=latest.liquidity_ratio,
        debt_service_ratio=latest.debt_service_ratio,
        emergency_coverage_months=latest.emergency_coverage_months,
        portfolio_concentration_score=latest.portfolio_concentration_score,
        data_quality_score=latest.data_quality_score,
        risk_signals=latest.risk_signals,
        created_at=latest.created_at,
    )


@router.get(
    "/health-score",
    response_model=FinancialHealthScoreResponse,
    summary="Get transparent Financial Health Score breakdown",
)
async def get_financial_health_score(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> FinancialHealthScoreResponse:
    """Retrieve composite health score (0-100) with disclosed 5-pillar weights and remediation advice."""
    service = RiskService(session)
    return await service.get_health_score(context.tenant.id)


@router.get(
    "/alerts",
    response_model=list[RiskAlertResponse],
    summary="List risk warnings and evidence-backed alerts",
)
async def list_risk_alerts(
    status: str | None = Query(None, description="Filter by status: ACTIVE, ACKNOWLEDGED, RESOLVED, SNOOZED"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[RiskAlertResponse]:
    """Retrieve workspace risk alerts with attached numerical evidence."""
    service = RiskService(session)
    return await service.list_alerts(context.tenant.id, status=status)


@router.put(
    "/alerts/{alert_id}/status",
    response_model=RiskAlertResponse,
    summary="Update alert status (acknowledge, resolve, snooze)",
)
async def update_risk_alert_status(
    alert_id: uuid.UUID,
    payload: AlertStatusUpdate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> RiskAlertResponse:
    """Transition alert state to ACKNOWLEDGED, RESOLVED, or SNOOZED with user notes."""
    service = RiskService(session)
    updated = await service.update_alert_status(context.tenant.id, alert_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Risk alert '{alert_id}' not found.",
        )
    return updated
