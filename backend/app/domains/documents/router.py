"""WealthOS Universal Financial Document Intelligence REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.documents.schemas import (
    DocumentApprovalEventResponse,
    DocumentApprovalRequest,
    DocumentExtractionCreate,
    DocumentExtractionResponse,
    DocumentReconciliationResponse,
    FinancialDocumentCreate,
    FinancialDocumentResponse,
    ReceiptScanRequest,
    ReceiptScanResult,
    StatementParseRequest,
    StatementParseResult,
)
from app.domains.documents.service import DocumentIntelligenceService

logger = get_logger("wealthos.documents")

router = APIRouter()


@router.get(
    "",
    response_model=list[FinancialDocumentResponse],
    summary="List uploaded financial documents",
)
async def list_documents(
    status_filter: str | None = Query(None, alias="status", description="Filter by processing status"),
    doc_type: str | None = Query(None, description="Filter by document type"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[FinancialDocumentResponse]:
    """Retrieve all financial documents for the current tenant."""
    service = DocumentIntelligenceService(session)
    docs = await service.list_documents(context.tenant.id, status=status_filter, doc_type=doc_type)
    return [FinancialDocumentResponse.model_validate(d) for d in docs]


@router.post(
    "",
    response_model=FinancialDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register uploaded financial document",
)
async def register_document(
    payload: FinancialDocumentCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> FinancialDocumentResponse:
    """Register metadata for a file uploaded to quarantine storage."""
    service = DocumentIntelligenceService(session)
    try:
        doc = await service.ingest_document(context.tenant.id, payload)
        return FinancialDocumentResponse.model_validate(doc)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/scan-receipt",
    response_model=ReceiptScanResult,
    status_code=status.HTTP_200_OK,
    summary="Scan and extract receipt or invoice with OCR intelligence",
)
async def scan_receipt(
    payload: ReceiptScanRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> ReceiptScanResult:
    """Extract merchant, amount, category, date, and taxes from receipt OCR / image / UPI QR."""
    service = DocumentIntelligenceService(session)
    try:
        return await service.scan_receipt(context.tenant.id, payload)
    except Exception as e:
        logger.error(f"Receipt scan failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/parse-statement",
    response_model=StatementParseResult,
    status_code=status.HTTP_200_OK,
    summary="Parse financial bank statement, CAS, or Tradebook CSV/PDF",
)
async def parse_statement(
    payload: StatementParseRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> StatementParseResult:
    """Parse bank statement, Zerodha tradebook, or CAMS CAS and extract validated line items."""
    service = DocumentIntelligenceService(session)
    try:
        return await service.parse_statement(context.tenant.id, payload)
    except Exception as e:
        logger.error(f"Statement parse failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))



@router.get(
    "/{document_id}",
    response_model=FinancialDocumentResponse,
    summary="Get document details",
)
async def get_document(
    document_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> FinancialDocumentResponse:
    """Fetch details and status of an ingested financial document."""
    service = DocumentIntelligenceService(session)
    doc = await service.get_document(context.tenant.id, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return FinancialDocumentResponse.model_validate(doc)


@router.post(
    "/{document_id}/extractions",
    response_model=DocumentExtractionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record structured extraction and validate arithmetic",
)
async def record_extraction(
    document_id: uuid.UUID,
    payload: DocumentExtractionCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentExtractionResponse:
    """Submit OCR/AI extraction payload, evaluate mathematical invariants, and set review status."""
    service = DocumentIntelligenceService(session)
    try:
        extraction = await service.record_extraction(context.tenant.id, document_id, payload)
        return DocumentExtractionResponse.model_validate(extraction)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/{document_id}/extractions",
    response_model=list[DocumentExtractionResponse],
    summary="List extractions for document",
)
async def list_extractions(
    document_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[DocumentExtractionResponse]:
    """Retrieve all historical extractions generated for a document."""
    service = DocumentIntelligenceService(session)
    extractions = await service.list_extractions(context.tenant.id, document_id)
    return [DocumentExtractionResponse.model_validate(e) for e in extractions]


@router.get(
    "/{document_id}/extractions/{extraction_id}/reconcile",
    response_model=DocumentReconciliationResponse,
    summary="Match extracted records against ledger",
)
async def reconcile_extraction(
    document_id: uuid.UUID,
    extraction_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentReconciliationResponse:
    """Identify exact matches, probable matches, and new transactions against existing ledger."""
    service = DocumentIntelligenceService(session)
    try:
        return await service.reconcile_extraction(context.tenant.id, document_id, extraction_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{document_id}/extractions/{extraction_id}/approve",
    response_model=DocumentExtractionResponse,
    summary="Human review approval, rejection, or controlled posting",
)
async def review_and_approve_extraction(
    document_id: uuid.UUID,
    extraction_id: uuid.UUID,
    payload: DocumentApprovalRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentExtractionResponse:
    """Human-in-the-loop review action with mandatory audit logging and optional double-entry ledger posting."""
    service = DocumentIntelligenceService(session)
    try:
        updated = await service.review_and_approve(
            tenant_id=context.tenant.id,
            document_id=document_id,
            extraction_id=extraction_id,
            actor_id=context.user.id if context.user else None,
            request=payload,
        )
        return DocumentExtractionResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/{document_id}/approval-events",
    response_model=list[DocumentApprovalEventResponse],
    summary="Get document audit events",
)
async def list_approval_events(
    document_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[DocumentApprovalEventResponse]:
    """Retrieve full chronological audit trail of human reviews and approvals for a document."""
    service = DocumentIntelligenceService(session)
    events = await service.list_approval_events(context.tenant.id, document_id)
    return [DocumentApprovalEventResponse.model_validate(ev) for ev in events]

