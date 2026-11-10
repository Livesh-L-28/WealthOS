"""WealthOS India Tax Readiness REST API Endpoints."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.tax.schemas import (
    CapitalGainsSummary,
    HeadOfIncomeBreakdown,
    RegimeComparisonResponse,
    TaxComputationResponse,
    TaxProfileResponse,
    TaxProfileUpdate,
    TaxReadinessReportResponse,
)
from app.domains.tax.service import TaxService

logger = get_logger("wealthos.tax")

router = APIRouter()


@router.get(
    "/profile",
    response_model=TaxProfileResponse,
    summary="Get taxpayer profile for financial year",
)
async def get_tax_profile(
    financial_year: str | None = Query(None, description="e.g. '2026-27'"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> TaxProfileResponse:
    """Retrieve or initialize taxpayer profile and assessment year."""
    service = TaxService(session)
    return await service.get_or_create_profile(context.tenant.id, financial_year)


@router.put(
    "/profile",
    response_model=TaxProfileResponse,
    summary="Update taxpayer profile parameters",
)
async def update_tax_profile(
    payload: TaxProfileUpdate,
    financial_year: str | None = Query(None, description="e.g. '2026-27'"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> TaxProfileResponse:
    """Update tax regime selection, taxpayer category, or residential status."""
    service = TaxService(session)
    fy = financial_year or service.get_current_fy()
    return await service.update_profile(context.tenant.id, fy, payload)


@router.get(
    "/income-breakdown",
    response_model=HeadOfIncomeBreakdown,
    summary="Get aggregated heads of income and excluded transfers",
)
async def get_income_breakdown(
    financial_year: str | None = Query(None, description="e.g. '2026-27'"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> HeadOfIncomeBreakdown:
    """Classify income under statutory heads and isolate non-income transfer credits."""
    service = TaxService(session)
    fy = financial_year or service.get_current_fy()
    breakdown, _ = await service.aggregate_income_breakdown(context.tenant.id, fy)
    return breakdown


@router.get(
    "/capital-gains",
    response_model=CapitalGainsSummary,
    summary="Get capital gains summary from realized FIFO lots",
)
async def get_capital_gains(
    financial_year: str | None = Query(None, description="e.g. '2026-27'"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> CapitalGainsSummary:
    """Retrieve realized STCG and LTCG segmented by holding periods and Section 112A exemption."""
    service = TaxService(session)
    fy = financial_year or service.get_current_fy()
    _, cap_summary = await service.aggregate_income_breakdown(context.tenant.id, fy)
    return cap_summary


@router.get(
    "/compare-regimes",
    response_model=RegimeComparisonResponse,
    summary="Compare New Regime vs Old Regime tax liabilities",
)
async def compare_tax_regimes(
    financial_year: str | None = Query(None, description="e.g. '2026-27'"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> RegimeComparisonResponse:
    """Compare Section 115BAC New Concessional Regime with Old Regime deductions."""
    service = TaxService(session)
    fy = financial_year or service.get_current_fy()
    _, comparison, _, _, _ = await service.compute_and_compare_regimes(context.tenant.id, fy)
    return comparison


@router.post(
    "/compute",
    response_model=TaxComputationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Run tax computation snapshot",
)
async def compute_tax(
    financial_year: str | None = Query(None, description="e.g. '2026-27'"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> TaxComputationResponse:
    """Calculate and persist provisional tax computation snapshot."""
    service = TaxService(session)
    fy = financial_year or service.get_current_fy()
    comp_resp, _, _, _, _ = await service.compute_and_compare_regimes(context.tenant.id, fy)
    return comp_resp


@router.get(
    "/readiness-report",
    response_model=TaxReadinessReportResponse,
    summary="Generate comprehensive tax readiness report",
)
async def get_tax_readiness_report(
    financial_year: str | None = Query(None, description="e.g. '2026-27'"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> TaxReadinessReportResponse:
    """Generate structured, evidence-backed tax readiness report with regulatory disclaimers."""
    service = TaxService(session)
    fy = financial_year or service.get_current_fy()
    return await service.generate_tax_readiness_report(context.tenant.id, fy)
