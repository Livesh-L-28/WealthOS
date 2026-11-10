"""WealthOS Enterprise Integrations REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.core.security import TenantContext, get_current_tenant_context
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
