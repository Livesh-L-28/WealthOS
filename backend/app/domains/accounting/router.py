"""WealthOS Accounting, Ledger, and Financial Core REST API Endpoints.

Provides strictly audited, double-entry endpoints governed by multi-tenant RBAC
and tenant-isolated Row-Level Security.
"""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import correlation_id_ctx, get_logger
from app.core.security import TenantContext, require_permission
from app.domains.accounting.domain.exceptions import (
    AccountingPeriodClosedError,
    AccountNotFoundError,
    DuplicateTransactionError,
    ImmutableLedgerError,
    InvalidAccountHierarchyError,
    InvalidMoneyError,
    JournalEntryNotFoundError,
    ReversalNotAllowedError,
    UnbalancedJournalError,
)
from app.domains.accounting.schemas import (
    AccountBalanceResponse,
    AccountLedgerResponse,
    AccountResponse,
    ClosePeriodRequest,
    CreateAccountRequest,
    CreateJournalEntryRequest,
    CreatePeriodRequest,
    CreateReconciliationRequest,
    GeneralLedgerResponse,
    JournalEntryDetailResponse,
    JournalEntryResponse,
    MarkDiscrepancyRequest,
    PeriodResponse,
    PostJournalRequest,
    ReconcileMatchRequest,
    ReconciliationResponse,
    ReopenPeriodRequest,
    ReverseJournalRequest,
    TrialBalanceResponse,
    UpdateAccountRequest,
)
from app.domains.accounting.services import (
    BalanceService,
    ChartOfAccountsService,
    JournalService,
    PeriodService,
    PostingService,
    ReconciliationService,
    ReversalService,
)

logger = get_logger("wealthos.api.accounting")

router = APIRouter()


def _get_client_meta(request: Request) -> tuple[str | None, str | None, str | None]:
    """Extract client request metadata."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip_address = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else (request.client.host if request.client else None)
    )
    user_agent = request.headers.get("User-Agent")
    correlation_id = correlation_id_ctx.get()
    return ip_address, user_agent, correlation_id


# ==============================================================================
# CHART OF ACCOUNTS
# ==============================================================================


@router.post(
    "/accounts",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account in Chart of Accounts",
)
async def create_account(
    payload: CreateAccountRequest,
    context: TenantContext = Depends(require_permission("accounting:accounts:create")),
    session: AsyncSession = Depends(get_db_session),
) -> AccountResponse:
    """Create a new account with specified type and parent hierarchy."""
    try:
        account = await ChartOfAccountsService.create_account(
            session=session,
            tenant_id=context.tenant.id,
            payload=payload,
        )
        return AccountResponse.model_validate(account)
    except (ValueError, InvalidMoneyError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except AccountNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post(
    "/accounts/seed",
    response_model=list[AccountResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Seed standard Chart of Accounts template",
)
async def seed_chart_of_accounts(
    currency_code: str = Query(default="INR", min_length=3, max_length=3),
    context: TenantContext = Depends(require_permission("accounting:accounts:create")),
    session: AsyncSession = Depends(get_db_session),
) -> list[AccountResponse]:
    """Seed the standard wealth management chart of accounts for the workspace."""
    accounts = await ChartOfAccountsService.seed_standard_chart_of_accounts(
        session=session,
        tenant_id=context.tenant.id,
        currency_code=currency_code,
    )
    return [AccountResponse.model_validate(a) for a in accounts]


@router.get(
    "/accounts",
    response_model=list[AccountResponse],
    summary="List accounts in Chart of Accounts",
)
async def list_accounts(
    account_type: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    context: TenantContext = Depends(require_permission("accounting:accounts:read")),
    session: AsyncSession = Depends(get_db_session),
) -> list[AccountResponse]:
    """List tenant accounts ordered by account_code."""
    accounts = await ChartOfAccountsService.list_accounts(
        session=session,
        tenant_id=context.tenant.id,
        account_type=account_type,
        is_active=is_active,
    )
    return [AccountResponse.model_validate(a) for a in accounts]


@router.get(
    "/accounts/{account_id}",
    response_model=AccountResponse,
    summary="Get account detail by ID",
)
async def get_account(
    account_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("accounting:accounts:read")),
    session: AsyncSession = Depends(get_db_session),
) -> AccountResponse:
    """Fetch an individual account."""
    try:
        account = await ChartOfAccountsService.get_account(
            session=session,
            tenant_id=context.tenant.id,
            account_id=account_id,
        )
        return AccountResponse.model_validate(account)
    except AccountNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.patch(
    "/accounts/{account_id}",
    response_model=AccountResponse,
    summary="Update account properties",
)
async def update_account(
    account_id: uuid.UUID,
    payload: UpdateAccountRequest,
    context: TenantContext = Depends(require_permission("accounting:accounts:update")),
    session: AsyncSession = Depends(get_db_session),
) -> AccountResponse:
    """Update mutable properties of an account with cycle prevention."""
    try:
        account = await ChartOfAccountsService.update_account(
            session=session,
            tenant_id=context.tenant.id,
            account_id=account_id,
            payload=payload,
        )
        return AccountResponse.model_validate(account)
    except AccountNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except (InvalidAccountHierarchyError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get(
    "/accounts/{account_id}/balance",
    response_model=AccountBalanceResponse,
    summary="Get real-time balance for an account",
)
async def get_account_balance(
    account_id: uuid.UUID,
    as_of_date: date | None = Query(default=None),
    context: TenantContext = Depends(require_permission("accounting:accounts:read")),
    session: AsyncSession = Depends(get_db_session),
) -> AccountBalanceResponse:
    """Compute real-time balance respecting account normal balance."""
    try:
        return await BalanceService.get_account_balance(
            session=session,
            tenant_id=context.tenant.id,
            account_id=account_id,
            as_of_date=as_of_date,
        )
    except AccountNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get(
    "/accounts/{account_id}/ledger",
    response_model=AccountLedgerResponse,
    summary="Get detailed account ledger statement",
)
async def get_account_ledger(
    account_id: uuid.UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    context: TenantContext = Depends(require_permission("accounting:ledger:read")),
    session: AsyncSession = Depends(get_db_session),
) -> AccountLedgerResponse:
    """Retrieve detailed ledger statement with running balances."""
    try:
        return await BalanceService.get_account_ledger(
            session=session,
            tenant_id=context.tenant.id,
            account_id=account_id,
            start_date=start_date,
            end_date=end_date,
        )
    except AccountNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


# ==============================================================================
# JOURNAL ENTRIES
# ==============================================================================


@router.post(
    "/journals",
    response_model=JournalEntryDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a DRAFT journal entry",
)
async def create_journal_draft(
    payload: CreateJournalEntryRequest,
    context: TenantContext = Depends(require_permission("accounting:journals:create")),
    session: AsyncSession = Depends(get_db_session),
) -> JournalEntryDetailResponse:
    """Draft a new double-entry transaction."""
    try:
        entry = await JournalService.create_draft(
            session=session,
            tenant_id=context.tenant.id,
            payload=payload,
            created_by=context.user.id,
        )
        return JournalEntryDetailResponse.model_validate(entry)
    except (UnbalancedJournalError, InvalidMoneyError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except AccountNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post(
    "/journals/post-direct",
    response_model=JournalEntryDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and atomically post a journal entry",
)
async def create_and_post_journal(
    request: Request,
    payload: CreateJournalEntryRequest,
    context: TenantContext = Depends(require_permission("accounting:journals:post")),
    session: AsyncSession = Depends(get_db_session),
) -> JournalEntryDetailResponse:
    """Draft and immediately post a double-entry transaction atomically."""
    _, _, correlation_id = _get_client_meta(request)
    try:
        entry = await PostingService.create_and_post(
            session=session,
            tenant_id=context.tenant.id,
            payload=payload,
            user_id=context.user.id,
            correlation_id=correlation_id,
        )
        return JournalEntryDetailResponse.model_validate(entry)
    except (
        UnbalancedJournalError,
        InvalidMoneyError,
        ValueError,
        AccountingPeriodClosedError,
    ) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except DuplicateTransactionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    except AccountNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get(
    "/journals",
    response_model=list[JournalEntryResponse],
    summary="List journal entries",
)
async def list_journal_entries(
    status_filter: str | None = Query(default=None, alias="status"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    context: TenantContext = Depends(require_permission("accounting:journals:read")),
    session: AsyncSession = Depends(get_db_session),
) -> list[JournalEntryResponse]:
    """List journal entries."""
    entries = await JournalService.list_entries(
        session=session,
        tenant_id=context.tenant.id,
        status=status_filter,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )
    return [JournalEntryResponse.model_validate(e) for e in entries]


@router.get(
    "/journals/{entry_id}",
    response_model=JournalEntryDetailResponse,
    summary="Get journal entry detail by ID",
)
async def get_journal_entry(
    entry_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("accounting:journals:read")),
    session: AsyncSession = Depends(get_db_session),
) -> JournalEntryDetailResponse:
    """Fetch complete journal entry with line items."""
    try:
        entry = await JournalService.get_entry(
            session=session,
            tenant_id=context.tenant.id,
            entry_id=entry_id,
        )
        return JournalEntryDetailResponse.model_validate(entry)
    except JournalEntryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.delete(
    "/journals/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a DRAFT journal entry",
)
async def delete_journal_draft(
    entry_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("accounting:journals:create")),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete an unposted DRAFT journal entry."""
    try:
        await JournalService.delete_draft(
            session=session,
            tenant_id=context.tenant.id,
            entry_id=entry_id,
        )
    except JournalEntryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except ImmutableLedgerError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/journals/{entry_id}/post",
    response_model=JournalEntryDetailResponse,
    summary="Post a draft journal entry",
)
async def post_journal_entry(
    request: Request,
    entry_id: uuid.UUID,
    payload: PostJournalRequest | None = None,
    context: TenantContext = Depends(require_permission("accounting:journals:post")),
    session: AsyncSession = Depends(get_db_session),
) -> JournalEntryDetailResponse:
    """Atomically commit and post a draft journal entry."""
    _, _, correlation_id = _get_client_meta(request)
    try:
        entry = await PostingService.post_journal_entry(
            session=session,
            tenant_id=context.tenant.id,
            entry_id=entry_id,
            payload=payload,
            user_id=context.user.id,
            correlation_id=correlation_id,
        )
        return JournalEntryDetailResponse.model_validate(entry)
    except JournalEntryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except DuplicateTransactionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    except (
        AccountingPeriodClosedError,
        UnbalancedJournalError,
        ImmutableLedgerError,
        ValueError,
    ) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/journals/{entry_id}/reverse",
    response_model=JournalEntryDetailResponse,
    summary="Reverse a posted journal entry",
)
async def reverse_journal_entry(
    request: Request,
    entry_id: uuid.UUID,
    payload: ReverseJournalRequest,
    context: TenantContext = Depends(require_permission("accounting:journals:reverse")),
    session: AsyncSession = Depends(get_db_session),
) -> JournalEntryDetailResponse:
    """Create an exact mirrored reversal counter-entry."""
    _, _, correlation_id = _get_client_meta(request)
    try:
        reversal = await ReversalService.reverse_journal_entry(
            session=session,
            tenant_id=context.tenant.id,
            entry_id=entry_id,
            payload=payload,
            user_id=context.user.id,
            correlation_id=correlation_id,
        )
        return JournalEntryDetailResponse.model_validate(reversal)
    except JournalEntryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except DuplicateTransactionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    except (ReversalNotAllowedError, AccountingPeriodClosedError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


# ==============================================================================
# GENERAL LEDGER & TRIAL BALANCE REPORTS
# ==============================================================================


@router.get(
    "/ledger/general",
    response_model=GeneralLedgerResponse,
    summary="Get General Ledger report across accounts",
)
async def get_general_ledger(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    functional_currency: str = Query(default="INR", min_length=3, max_length=3),
    context: TenantContext = Depends(require_permission("accounting:ledger:read")),
    session: AsyncSession = Depends(get_db_session),
) -> GeneralLedgerResponse:
    """Generate multi-account General Ledger statement."""
    return await BalanceService.get_general_ledger(
        session=session,
        tenant_id=context.tenant.id,
        start_date=start_date,
        end_date=end_date,
        functional_currency=functional_currency,
    )


@router.get(
    "/reports/trial-balance",
    response_model=TrialBalanceResponse,
    summary="Generate Trial Balance report",
)
async def get_trial_balance(
    as_of_date: date | None = Query(default=None),
    functional_currency: str = Query(default="INR", min_length=3, max_length=3),
    context: TenantContext = Depends(require_permission("accounting:ledger:read")),
    session: AsyncSession = Depends(get_db_session),
) -> TrialBalanceResponse:
    """Compute Trial Balance confirming Sigma(Debits) == Sigma(Credits)."""
    return await BalanceService.get_trial_balance(
        session=session,
        tenant_id=context.tenant.id,
        as_of_date=as_of_date,
        functional_currency=functional_currency,
    )


# ==============================================================================
# ACCOUNTING PERIODS
# ==============================================================================


@router.get(
    "/periods",
    response_model=list[PeriodResponse],
    summary="List accounting periods",
)
async def list_periods(
    context: TenantContext = Depends(require_permission("accounting:accounts:read")),
    session: AsyncSession = Depends(get_db_session),
) -> list[PeriodResponse]:
    """List accounting periods for workspace."""
    periods = await PeriodService.list_periods(session, context.tenant.id)
    return [PeriodResponse.model_validate(p) for p in periods]


@router.post(
    "/periods",
    response_model=PeriodResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new accounting period",
)
async def create_period(
    payload: CreatePeriodRequest,
    context: TenantContext = Depends(require_permission("accounting:periods:manage")),
    session: AsyncSession = Depends(get_db_session),
) -> PeriodResponse:
    """Open a new accounting period."""
    try:
        period = await PeriodService.create_period(
            session=session,
            tenant_id=context.tenant.id,
            payload=payload,
        )
        return PeriodResponse.model_validate(period)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/periods/{period_id}/close",
    response_model=PeriodResponse,
    summary="Close an accounting period",
)
async def close_period(
    request: Request,
    period_id: uuid.UUID,
    payload: ClosePeriodRequest | None = None,
    context: TenantContext = Depends(require_permission("accounting:periods:manage")),
    session: AsyncSession = Depends(get_db_session),
) -> PeriodResponse:
    """Close an accounting period to lock postings."""
    _, _, correlation_id = _get_client_meta(request)
    try:
        period = await PeriodService.close_period(
            session=session,
            tenant_id=context.tenant.id,
            period_id=period_id,
            payload=payload,
            user_id=context.user.id,
            correlation_id=correlation_id,
        )
        return PeriodResponse.model_validate(period)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/periods/{period_id}/reopen",
    response_model=PeriodResponse,
    summary="Reopen a closed accounting period (admin only)",
)
async def reopen_period(
    request: Request,
    period_id: uuid.UUID,
    payload: ReopenPeriodRequest,
    context: TenantContext = Depends(require_permission("accounting:periods:manage")),
    session: AsyncSession = Depends(get_db_session),
) -> PeriodResponse:
    """Reopen a closed period under audit control."""
    _, _, correlation_id = _get_client_meta(request)
    try:
        period = await PeriodService.reopen_period(
            session=session,
            tenant_id=context.tenant.id,
            period_id=period_id,
            payload=payload,
            user_id=context.user.id,
            correlation_id=correlation_id,
        )
        return PeriodResponse.model_validate(period)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


# ==============================================================================
# RECONCILIATION
# ==============================================================================


@router.get(
    "/reconciliation",
    response_model=list[ReconciliationResponse],
    summary="List external reconciliation records",
)
async def list_reconciliation_records(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    context: TenantContext = Depends(require_permission("accounting:accounts:read")),
    session: AsyncSession = Depends(get_db_session),
) -> list[ReconciliationResponse]:
    """List reconciliation records."""
    records = await ReconciliationService.list_records(
        session=session,
        tenant_id=context.tenant.id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return [ReconciliationResponse.model_validate(r) for r in records]


@router.post(
    "/reconciliation",
    response_model=ReconciliationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest an external transaction record for reconciliation",
)
async def create_reconciliation_record(
    payload: CreateReconciliationRequest,
    context: TenantContext = Depends(require_permission("accounting:journals:create")),
    session: AsyncSession = Depends(get_db_session),
) -> ReconciliationResponse:
    """Register an external transaction awaiting matching."""
    try:
        record = await ReconciliationService.create_record(
            session=session,
            tenant_id=context.tenant.id,
            payload=payload,
        )
        return ReconciliationResponse.model_validate(record)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/reconciliation/{record_id}/match",
    response_model=ReconciliationResponse,
    summary="Match external record against posted journal entry",
)
async def match_reconciliation_record(
    request: Request,
    record_id: uuid.UUID,
    payload: ReconcileMatchRequest,
    context: TenantContext = Depends(require_permission("accounting:journals:create")),
    session: AsyncSession = Depends(get_db_session),
) -> ReconciliationResponse:
    """Match external record against posted journal."""
    _, _, correlation_id = _get_client_meta(request)
    try:
        record = await ReconciliationService.match_record(
            session=session,
            tenant_id=context.tenant.id,
            record_id=record_id,
            payload=payload,
            user_id=context.user.id,
            correlation_id=correlation_id,
        )
        return ReconciliationResponse.model_validate(record)
    except JournalEntryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/reconciliation/{record_id}/discrepancy",
    response_model=ReconciliationResponse,
    summary="Flag an external record with discrepancy",
)
async def flag_reconciliation_discrepancy(
    request: Request,
    record_id: uuid.UUID,
    payload: MarkDiscrepancyRequest,
    context: TenantContext = Depends(require_permission("accounting:journals:create")),
    session: AsyncSession = Depends(get_db_session),
) -> ReconciliationResponse:
    """Mark record as discrepancy."""
    _, _, correlation_id = _get_client_meta(request)
    try:
        record = await ReconciliationService.flag_discrepancy(
            session=session,
            tenant_id=context.tenant.id,
            record_id=record_id,
            payload=payload,
            user_id=context.user.id,
            correlation_id=correlation_id,
        )
        return ReconciliationResponse.model_validate(record)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
