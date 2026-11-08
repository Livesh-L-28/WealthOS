"""WealthOS Financial Control Centre & Reconciliation REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.reconciliation.schemas import (
    DataQualityItem,
    DiscrepancyActionRequest,
    FinancialControlDashboardResponse,
    LedgerIntegrityReport,
    ReconciliationRecordCreate,
    ReconciliationRecordResponse,
    ReconciliationSessionResponse,
)
from app.domains.reconciliation.service import FinancialControlService

logger = get_logger("wealthos.reconciliation")

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=FinancialControlDashboardResponse,
    summary="Get Financial Control Centre dashboard metrics",
)
async def get_financial_control_dashboard(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> FinancialControlDashboardResponse:
    """Consolidated financial health, open discrepancies, ledger integrity, and data freshness."""
    service = FinancialControlService(session)
    return await service.get_dashboard(context.tenant.id)


@router.get(
    "/discrepancies",
    response_model=list[ReconciliationRecordResponse],
    summary="List reconciliation discrepancies and exceptions",
)
async def list_discrepancies(
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = Query(None),
    resolution_status: str | None = Query(None),
    account_id: uuid.UUID | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[ReconciliationRecordResponse]:
    """Retrieve paginated, filterable discrepancy records for investigation."""
    service = FinancialControlService(session)
    records = await service.repo.list_records(
        tenant_id=context.tenant.id,
        status=status_filter,
        severity=severity,
        resolution_status=resolution_status,
        account_id=account_id,
        limit=limit,
        offset=offset,
    )
    return [ReconciliationRecordResponse.model_validate(r) for r in records]


@router.post(
    "/records",
    response_model=ReconciliationRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest external statement transaction record",
)
async def ingest_external_record(
    payload: ReconciliationRecordCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> ReconciliationRecordResponse:
    """Ingest external record and execute automated discrepancy & duplicate evaluation."""
    service = FinancialControlService(session)
    record = await service.ingest_external_record(
        tenant_id=context.tenant.id,
        source_reference=payload.source_reference,
        account_id=payload.account_id,
        expected_amount=payload.expected_amount,
        currency_code=payload.currency_code,
        posted_amount=payload.posted_amount,
        session_id=payload.session_id,
    )
    await session.commit()
    return ReconciliationRecordResponse.model_validate(record)


@router.post(
    "/discrepancies/{record_id}/action",
    response_model=ReconciliationRecordResponse,
    summary="Execute resolution action on discrepancy",
)
async def execute_discrepancy_action(
    record_id: uuid.UUID,
    payload: DiscrepancyActionRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> ReconciliationRecordResponse:
    """Review, Match, Mark Duplicate, Resolve, Reject, or Escalate a discrepancy."""
    service = FinancialControlService(session)
    try:
        updated = await service.execute_action(
            tenant_id=context.tenant.id,
            record_id=record_id,
            action=payload.action,
            actor_id=context.user.id,
            notes=payload.notes,
            journal_entry_id=payload.journal_entry_id,
            metadata=payload.metadata,
        )
        await session.commit()
        return ReconciliationRecordResponse.model_validate(updated)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get(
    "/ledger-integrity",
    response_model=LedgerIntegrityReport,
    summary="Verify General Ledger debit/credit balance",
)
async def get_ledger_integrity(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> LedgerIntegrityReport:
    """Real-time audit verifying that General Ledger debits equal credits with zero variance."""
    service = FinancialControlService(session)
    dashboard = await service.get_dashboard(context.tenant.id)
    return dashboard.ledger_integrity


@router.get(
    "/data-quality",
    response_model=list[DataQualityItem],
    summary="List data quality and freshness metrics",
)
async def list_data_quality(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[DataQualityItem]:
    """Retrieve synchronization freshness and data reliability metrics per account."""
    service = FinancialControlService(session)
    metrics = await service.repo.get_data_quality_metrics(context.tenant.id)
    return [DataQualityItem.model_validate(m) for m in metrics]


@router.get(
    "/sessions",
    response_model=list[ReconciliationSessionResponse],
    summary="List reconciliation sessions",
)
async def list_sessions(
    limit: int = Query(20, ge=1, le=100),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[ReconciliationSessionResponse]:
    """Retrieve historical reconciliation session runs."""
    service = FinancialControlService(session)
    sessions = await service.repo.list_sessions(context.tenant.id, limit=limit)
    return [ReconciliationSessionResponse.model_validate(s) for s in sessions]

