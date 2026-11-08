"""WealthOS Universal Financial Document Intelligence Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FinancialDocumentCreate(BaseModel):
    """Payload to register an ingested financial document."""

    filename: str = Field(..., max_length=255)
    file_size_bytes: int = Field(..., gt=0)
    mime_type: str = Field(..., max_length=100)
    storage_path: str
    file_hash: str = Field(..., max_length=64)
    document_type: str = Field(
        default="STATEMENT",
        description="STATEMENT, CREDIT_CARD, CAS, INVOICE, PAYSLIP, OTHER",
    )


class FinancialDocumentResponse(BaseModel):
    """Response schema for ingested financial document entity."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    filename: str
    file_size_bytes: int
    mime_type: str
    storage_path: str
    file_hash: str
    document_type: str
    processing_status: str
    ocr_text: str | None = None
    extracted_data: dict[str, Any] | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class BankStatementItem(BaseModel):
    """Transaction line item in an extracted bank statement."""

    date: date
    description: str
    reference_number: str | None = None
    type: str = Field(..., description="CREDIT or DEBIT")
    amount: Decimal = Field(..., gt=0)
    running_balance: Decimal | None = None


class BankStatementPayload(BaseModel):
    """Canonical bank statement extraction payload."""

    account_number: str
    bank_name: str
    currency: str = "INR"
    period_start: date
    period_end: date
    opening_balance: Decimal
    closing_balance: Decimal
    total_credits: Decimal
    total_debits: Decimal
    transactions: list[BankStatementItem] = Field(default_factory=list)


class InvoiceLineItem(BaseModel):
    """Line item in an extracted invoice/receipt."""

    description: str
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    total_price: Decimal = Field(..., ge=0)


class InvoiceReceiptPayload(BaseModel):
    """Canonical invoice/receipt extraction payload."""

    vendor_name: str
    tax_id: str | None = None
    invoice_number: str
    invoice_date: date
    currency: str = "INR"
    line_items: list[InvoiceLineItem] = Field(default_factory=list)
    subtotal: Decimal
    taxes: Decimal = Field(default=Decimal("0.0000"))
    discounts: Decimal = Field(default=Decimal("0.0000"))
    total_amount: Decimal


class BrokerageHoldingItem(BaseModel):
    """Asset holding in a Consolidated Account Statement (CAS)."""

    symbol: str
    isin: str | None = None
    asset_type: str = Field(..., description="EQUITY or MUTUAL_FUND")
    quantity: Decimal = Field(..., gt=0)
    nav_or_price: Decimal = Field(..., gt=0)
    current_value: Decimal = Field(..., gt=0)


class BrokerageCasPayload(BaseModel):
    """Canonical brokerage CAS extraction payload."""

    demat_account: str
    statement_date: date
    depository: str
    currency: str = "INR"
    holdings: list[BrokerageHoldingItem] = Field(default_factory=list)
    total_portfolio_value: Decimal


class DocumentExtractionCreate(BaseModel):
    """Payload to persist an extraction result."""

    schema_version: str = "v1"
    document_type: str
    reporting_start: date | None = None
    reporting_end: date | None = None
    currency: str = "INR"
    confidence_score: Decimal = Decimal("1.0000")
    extracted_payload: dict[str, Any]
    provenance_metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentExtractionResponse(BaseModel):
    """Structured extraction response with validation and approval status."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    document_id: uuid.UUID
    schema_version: str
    document_type: str
    reporting_start: date | None
    reporting_end: date | None
    currency: str
    confidence_score: Decimal
    validation_status: str
    approval_status: str
    extracted_payload: dict[str, Any]
    validation_errors: list[Any]
    provenance_metadata: dict[str, Any]
    reviewed_by: uuid.UUID | None
    reviewed_at: datetime | None
    posted_at: datetime | None
    created_at: datetime


class ArithmeticValidationResult(BaseModel):
    """Deterministic mathematical verification output."""

    is_valid: bool
    validation_status: str  # VALIDATED or ARITHMETIC_MISMATCH
    errors: list[dict[str, Any]]
    summary: dict[str, Any]


class DocumentApprovalRequest(BaseModel):
    """Payload for human review approval or rejection."""

    action: str = Field(..., description="APPROVE, REJECT, or OVERRIDE")
    notes: str | None = None
    post_transactions: bool = False
    target_account_id: uuid.UUID | None = None


class DocumentApprovalEventResponse(BaseModel):
    """Audit log response for an approval action."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    document_id: uuid.UUID
    extraction_id: uuid.UUID
    action: str
    actor_id: uuid.UUID | None
    notes: str | None
    audit_metadata: dict[str, Any]
    created_at: datetime


class ReconciliationMatchItem(BaseModel):
    """Individual match status between extracted record and existing ledger."""

    extracted_index: int
    extracted_date: date
    extracted_amount: Decimal
    extracted_description: str
    match_type: str  # EXACT_MATCH, PROBABLE_MATCH, NEW_TRANSACTION
    matched_transaction_id: uuid.UUID | None = None


class DocumentReconciliationResponse(BaseModel):
    """Reconciliation match report for an extraction."""

    document_id: uuid.UUID
    extraction_id: uuid.UUID
    total_extracted_records: int
    exact_matches: int
    probable_matches: int
    new_transactions: int
    matches: list[ReconciliationMatchItem]
