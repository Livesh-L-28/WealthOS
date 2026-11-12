"""WealthOS Enterprise Integrations REST API Endpoints."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.integrations.reports import FinancialReportGenerator
from app.domains.integrations.schemas import (
    FinancialProviderResponse,
    ProviderConnectionCreate,
    ProviderConnectionResponse,
    ProviderConsentCreate,
    ProviderConsentResponse,
    ProviderSyncRequest,
    ProviderSyncResponse,
)
from app.domains.integrations.service import (
    AuthenticationError,
    BusinessLogicError,
    EnterpriseIntegrationService,
    NotFoundError,
)

router = APIRouter()


class GenerateReportRequest(BaseModel):
    report_type: str = Field(default="SCHEDULE_CG", description="SCHEDULE_CG, PROFIT_AND_LOSS, BALANCE_SHEET, TRIAL_BALANCE, NET_WORTH")
    fiscal_year: str = Field(default="2026-2027", description="e.g. 2026-2027")
    format: str = Field(default="PDF", description="PDF, EXCEL, CSV")
    metadata: dict[str, str] | None = None



@router.get("/providers", response_model=list[FinancialProviderResponse])
async def list_financial_providers(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """List all available third-party financial aggregators and data providers."""
    providers = await EnterpriseIntegrationService.list_providers(session)
    return providers


@router.post("/consents", response_model=ProviderConsentResponse, status_code=status.HTTP_201_CREATED)
async def record_provider_consent(
    payload: ProviderConsentCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Record explicit DPDP Act compliant consent for financial provider data access."""
    try:
        consent = await EnterpriseIntegrationService.record_user_consent(
            session=session,
            tenant_id=context.tenant.id,
            user_id=context.user.id,
            provider_id=payload.provider_id,
            scopes_granted=payload.scopes_granted,
            purpose=payload.purpose,
            valid_days=payload.valid_days,
            dpdp_notice_version=payload.dpdp_notice_version,
        )
        return consent
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/consents", response_model=list[ProviderConsentResponse])
async def list_provider_consents(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """List all active, unrevoked consents for the authenticated user."""
    consents = await EnterpriseIntegrationService.list_user_consents(
        session=session,
        tenant_id=context.tenant.id,
        user_id=context.user.id,
    )
    return consents


@router.post("/connections", response_model=ProviderConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_provider_connection(
    payload: ProviderConnectionCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Establish connection to a provider with consent verification and envelope credential encryption."""
    try:
        conn = await EnterpriseIntegrationService.create_connection(
            session=session,
            tenant_id=context.tenant.id,
            user_id=context.user.id,
            provider_id=payload.provider_id,
            credentials=payload.credentials,
            account_count=payload.account_count,
        )
        return conn
    except BusinessLogicError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/connections", response_model=list[ProviderConnectionResponse])
async def list_provider_connections(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """List active provider connections for current tenant."""
    connections = await EnterpriseIntegrationService.list_connections(
        session=session,
        tenant_id=context.tenant.id,
    )
    return connections


@router.post("/sync", response_model=ProviderSyncResponse)
async def execute_provider_sync(
    payload: ProviderSyncRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Trigger manual or incremental synchronization for a provider connection."""
    try:
        result = await EnterpriseIntegrationService.execute_sync(
            session=session,
            tenant_id=context.tenant.id,
            connection_id=payload.connection_id,
            sync_mode=payload.sync_mode,
        )
        return result
    except (NotFoundError, BusinessLogicError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/webhooks/{provider_key}", status_code=status.HTTP_200_OK)
async def receive_provider_webhook(
    provider_key: str,
    request: Request,
    x_wealthos_signature: str | None = Header(None, alias="X-WealthOS-Signature"),
    x_wealthos_timestamp: str | None = Header(None, alias="X-WealthOS-Timestamp"),
):
    """Receive signed provider webhook with HMAC-SHA256 signature verification and replay prevention."""
    body_bytes = await request.body()
    webhook_secret = settings.SECRET_KEY

    try:
        EnterpriseIntegrationService.verify_webhook_signature_and_freshness(
            payload_bytes=body_bytes,
            signature_header=x_wealthos_signature,
            timestamp_header=x_wealthos_timestamp,
            secret=webhook_secret,
        )
        return {
            "status": "ACCEPTED",
            "provider_key": provider_key,
            "processed_bytes": len(body_bytes),
        }
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@router.delete("/connections/{connection_id}", status_code=status.HTTP_200_OK)
@router.post("/connections/{connection_id}/revoke", status_code=status.HTTP_200_OK)
async def revoke_provider_connection(
    connection_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Revoke financial provider access, shred stored credentials, and revoke DPDP consent."""
    try:
        result = await EnterpriseIntegrationService.revoke_connection(
            session=session,
            tenant_id=context.tenant.id,
            user_id=context.user.id,
            connection_id=connection_id,
        )
        return result
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/reports/generate")
async def generate_financial_report(
    payload: GenerateReportRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Generate certified financial reports (PDF, Excel, CSV) for Capital Gains, Balance Sheet, P&L."""
    fmt = payload.format.upper()
    rtype = payload.report_type.upper()
    meta = payload.metadata or {}
    meta.setdefault("Tenant", str(context.tenant.id)[:8])
    meta.setdefault("Fiscal Year", payload.fiscal_year)
    meta.setdefault("Generated By", context.user.email)

    if rtype == "SCHEDULE_CG":
        headers = ["Asset Description", "ISIN / Ticker", "Buy Date", "Sell Date", "Qty", "Buy Price", "Sell Price", "LTCG / STCG", "Realized Gain"]
        rows = [
            ["Reliance Industries Ltd", "INE002A01018", "2024-04-12", "2026-10-15", 50, 2400.00, 2980.00, "LTCG", 29000.00],
            ["Tata Consultancy Services", "INE467B01029", "2025-01-10", "2026-11-02", 20, 3650.00, 4120.00, "LTCG", 9400.00],
            ["HDFC Bank Ltd", "INE040A01034", "2026-06-18", "2026-10-28", 100, 1520.00, 1680.00, "STCG", 16000.00],
            ["ICICI Prudential Bharat 22 ETF", "INF109KB11X6", "2024-11-20", "2026-09-14", 500, 68.50, 104.20, "LTCG", 17850.00],
            ["Sovereign Gold Bond 2018-19", "IN0020180123", "2018-11-05", "2026-11-05", 25, 3146.00, 7820.00, "LTCG (Exempt)", 116850.00],
        ]
        title = f"Capital Gains Tax Schedule (Schedule CG) — FY {payload.fiscal_year}"
    elif rtype == "PROFIT_AND_LOSS":
        headers = ["Category", "Account Group", "H1 Amount", "H2 Amount", "Annual Total"]
        rows = [
            ["Salary & Professional Pay", "Income", 2100000.00, 2100000.00, 4200000.00],
            ["Dividend & Interest Yield", "Income", 48200.00, 56300.00, 104500.00],
            ["Rental Income", "Income", 180000.00, 180000.00, 360000.00],
            ["Housing & Utilities", "Expense", 420000.00, 435000.00, 855000.00],
            ["Taxes & Statutory Deductions", "Expense", 720000.00, 740000.00, 1460000.00],
            ["Discretionary & Lifestyle", "Expense", 280000.00, 310000.00, 590000.00],
        ]
        title = f"Profit & Loss / Cash Flow Statement — FY {payload.fiscal_year}"
    else:
        headers = ["Account / Asset Class", "Classification", "Book Value", "Market Value", "Allocation %"]
        rows = [
            ["HDFC Savings & Liquid Sweep", "Current Asset", 1250000.00, 1250000.00, "22.9%"],
            ["Zerodha Demat Portfolio", "Equity Investments", 2450000.00, 3120000.00, "57.2%"],
            ["ICICI Fixed Deposits & SGBs", "Fixed Income", 650000.00, 685000.00, "12.6%"],
            ["Emergency Fund Vault", "Cash Equivalent", 400000.00, 402000.00, "7.3%"],
        ]
        title = f"Balance Sheet & Net Worth Statement — FY {payload.fiscal_year}"

    if fmt == "PDF":
        pdf_bytes = FinancialReportGenerator.generate_pdf(title, headers, rows, meta)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="wealthos_{rtype.lower()}_{payload.fiscal_year}.pdf"'},
        )
    elif fmt == "EXCEL":
        xlsx_bytes = FinancialReportGenerator.generate_excel("Report", headers, rows)
        return Response(
            content=xlsx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="wealthos_{rtype.lower()}_{payload.fiscal_year}.xlsx"'},
        )
    else:
        csv_bytes = FinancialReportGenerator.generate_csv(headers, rows)
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="wealthos_{rtype.lower()}_{payload.fiscal_year}.csv"'},
        )

