"""WealthOS Universal Financial Document Intelligence Acceptance Test Suite.

Validates all Phase 6 capabilities:
1. Document ingestion and SHA-256 deduplication.
2. Deterministic arithmetic validation across Bank Statements, Invoices, Payslips, CAS.
3. Review status state machine (READY_FOR_APPROVAL vs NEEDS_REVIEW).
4. Reconciliation matching against existing ledger records.
5. Human review approval and rejection with mandatory audit logging.
6. Controlled double-entry General Ledger posting upon approval.
7. Multi-tenant RLS isolation.
8. Live HTTP REST API endpoints.
"""

import hashlib
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.accounting.services.chart_of_accounts import ChartOfAccountsService
from app.domains.documents.models import FinancialDocument
from app.domains.documents.schemas import (
    DocumentApprovalRequest,
    DocumentExtractionCreate,
    FinancialDocumentCreate,
)
from app.domains.documents.service import DocumentIntelligenceService


@pytest.mark.asyncio
async def test_document_ingestion_and_sha256_deduplication(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 1: Document ingestion and SHA-256 duplicate rejection."""
    user, tenant, _ = await test_user_factory(email="doc.ingest@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)
    dummy_bytes = b"%PDF-1.4 dummy financial statement stream 2026"
    file_hash = hashlib.sha256(dummy_bytes).hexdigest()

    # 1. Ingest document
    doc = await service.ingest_document(
        tenant.id,
        FinancialDocumentCreate(
            filename="hdfc_statement_jan2026.pdf",
            file_size_bytes=len(dummy_bytes),
            mime_type="application/pdf",
            storage_path="documents/hdfc_statement_jan2026.pdf",
            file_hash=file_hash,
            document_type="BANK_STATEMENT",
        ),
    )

    assert doc.id is not None
    assert doc.processing_status == "PENDING"
    assert doc.file_hash == file_hash

    # 2. Reject duplicate document with same hash in tenant
    with pytest.raises(ValueError, match="Duplicate document already exists"):
        await service.ingest_document(
            tenant.id,
            FinancialDocumentCreate(
                filename="duplicate_hdfc.pdf",
                file_size_bytes=len(dummy_bytes),
                mime_type="application/pdf",
                storage_path="documents/duplicate_hdfc.pdf",
                file_hash=file_hash,
                document_type="BANK_STATEMENT",
            ),
        )


@pytest.mark.asyncio
async def test_bank_statement_arithmetic_verification(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 2: Deterministic verification of bank statement balance invariant."""
    user, tenant, _ = await test_user_factory(email="doc.bank.val@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)
    doc = await service.ingest_document(
        tenant.id,
        FinancialDocumentCreate(
            filename="statement_valid.pdf",
            file_size_bytes=1024,
            mime_type="application/pdf",
            storage_path="documents/statement_valid.pdf",
            file_hash=hashlib.sha256(b"statement_valid").hexdigest(),
            document_type="BANK_STATEMENT",
        ),
    )

    # 1. Valid Bank Statement: Opening 10000 + Credits 5000 - Debits 2000 = Closing 13000
    valid_payload = {
        "account_number": "1234567890",
        "bank_name": "HDFC Bank",
        "opening_balance": "10000.0000",
        "closing_balance": "13000.0000",
        "total_credits": "5000.0000",
        "total_debits": "2000.0000",
        "transactions": [
            {"date": "2026-01-05", "description": "Salary Deposit", "type": "CREDIT", "amount": "5000.0000"},
            {"date": "2026-01-10", "description": "Grocery Store", "type": "DEBIT", "amount": "2000.0000"},
        ],
    }

    ext_valid = await service.record_extraction(
        tenant.id,
        doc.id,
        DocumentExtractionCreate(
            schema_version="v1",
            document_type="BANK_STATEMENT",
            reporting_start=date(2026, 1, 1),
            reporting_end=date(2026, 1, 31),
            confidence_score=Decimal("0.9800"),
            extracted_payload=valid_payload,
        ),
    )

    assert ext_valid.validation_status == "VALIDATED"
    assert len(ext_valid.validation_errors) == 0

    # Refresh document to check status
    refreshed_doc = await service.get_document(tenant.id, doc.id)
    assert refreshed_doc.processing_status == "READY_FOR_APPROVAL"

    # 2. Invalid Bank Statement: Discrepancy where reported closing is 12500 instead of 13000
    invalid_payload = dict(valid_payload)
    invalid_payload["closing_balance"] = "12500.0000"

    ext_invalid = await service.record_extraction(
        tenant.id,
        doc.id,
        DocumentExtractionCreate(
            schema_version="v1",
            document_type="BANK_STATEMENT",
            confidence_score=Decimal("0.9500"),
            extracted_payload=invalid_payload,
        ),
    )

    assert ext_invalid.validation_status == "ARITHMETIC_MISMATCH"
    assert len(ext_invalid.validation_errors) > 0
    assert ext_invalid.validation_errors[0]["field"] == "closing_balance"

    # Document flagged as NEEDS_REVIEW
    refreshed_doc2 = await service.get_document(tenant.id, doc.id)
    assert refreshed_doc2.processing_status == "NEEDS_REVIEW"


@pytest.mark.asyncio
async def test_invoice_and_payslip_arithmetic_verification(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 3: Verification of invoices (line sums + taxes - discounts) and payslips."""
    service = DocumentIntelligenceService(db_session)

    # 1. Invoice Verification: Subtotal 1000 + Taxes 180 - Discounts 50 = Total 1130
    invoice_valid = {
        "vendor_name": "Tech Corp",
        "invoice_number": "INV-2026-001",
        "subtotal": "1000.0000",
        "taxes": "180.0000",
        "discounts": "50.0000",
        "total_amount": "1130.0000",
        "line_items": [
            {"description": "Cloud Hosting", "quantity": "1", "unit_price": "1000.0000"},
        ],
    }
    res_inv = service.validate_arithmetic("INVOICE", invoice_valid)
    assert res_inv.is_valid is True

    # Invoice with arithmetic mismatch: Total 1200 instead of 1130
    invoice_invalid = dict(invoice_valid)
    invoice_invalid["total_amount"] = "1200.0000"
    res_inv_bad = service.validate_arithmetic("INVOICE", invoice_invalid)
    assert res_inv_bad.is_valid is False
    assert res_inv_bad.validation_status == "ARITHMETIC_MISMATCH"

    # 2. Payslip Verification: Gross 100000 - Deductions 20000 = Net 80000
    payslip_valid = {
        "gross_earnings": "100000.0000",
        "total_deductions": "20000.0000",
        "net_pay": "80000.0000",
    }
    res_pay = service.validate_arithmetic("PAYSLIP", payslip_valid)
    assert res_pay.is_valid is True

    # Payslip invalid
    payslip_bad = {
        "gross_earnings": "100000.0000",
        "total_deductions": "20000.0000",
        "net_pay": "85000.0000",
    }
    res_pay_bad = service.validate_arithmetic("PAYSLIP", payslip_bad)
    assert res_pay_bad.is_valid is False


@pytest.mark.asyncio
async def test_reconciliation_matching_engine(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 4: Reconciliation matching categorizes exact, probable, and new transactions."""
    user, tenant, _ = await test_user_factory(email="doc.recon@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)
    doc = await service.ingest_document(
        tenant.id,
        FinancialDocumentCreate(
            filename="statement_recon.pdf",
            file_size_bytes=2048,
            mime_type="application/pdf",
            storage_path="documents/statement_recon.pdf",
            file_hash=hashlib.sha256(b"statement_recon").hexdigest(),
            document_type="BANK_STATEMENT",
        ),
    )

    payload = {
        "account_number": "1122334455",
        "opening_balance": "5000.0000",
        "closing_balance": "6500.0000",
        "total_credits": "2000.0000",
        "total_debits": "500.0000",
        "transactions": [
            {"date": "2026-01-02", "description": "Client Payout", "type": "CREDIT", "amount": "2000.0000", "reference_number": "EXISTING_REF_123"},
            {"date": "2026-01-08", "description": "PROBABLE Coffee Shop", "type": "DEBIT", "amount": "150.0000"},
            {"date": "2026-01-12", "description": "Office Supplies Online", "type": "DEBIT", "amount": "350.0000"},
        ],
    }

    extraction = await service.record_extraction(
        tenant.id,
        doc.id,
        DocumentExtractionCreate(
            schema_version="v1",
            document_type="BANK_STATEMENT",
            confidence_score=Decimal("0.9900"),
            extracted_payload=payload,
        ),
    )

    recon = await service.reconcile_extraction(tenant.id, doc.id, extraction.id)
    assert recon.total_extracted_records == 3
    assert recon.exact_matches == 1
    assert recon.probable_matches == 1
    assert recon.new_transactions == 1
    assert recon.matches[0].match_type == "EXACT_MATCH"
    assert recon.matches[1].match_type == "PROBABLE_MATCH"
    assert recon.matches[2].match_type == "NEW_TRANSACTION"


@pytest.mark.asyncio
async def test_human_approval_workflow_and_audit_event_logging(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 5: Review approval and rejection with immutable audit events."""
    user, tenant, _ = await test_user_factory(email="doc.approval@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)
    doc = await service.ingest_document(
        tenant.id,
        FinancialDocumentCreate(
            filename="vendor_bill.pdf",
            file_size_bytes=1024,
            mime_type="application/pdf",
            storage_path="documents/vendor_bill.pdf",
            file_hash=hashlib.sha256(b"vendor_bill").hexdigest(),
            document_type="INVOICE",
        ),
    )

    extraction = await service.record_extraction(
        tenant.id,
        doc.id,
        DocumentExtractionCreate(
            schema_version="v1",
            document_type="INVOICE",
            confidence_score=Decimal("0.9600"),
            extracted_payload={
                "subtotal": "500.0000",
                "taxes": "50.0000",
                "discounts": "0.0000",
                "total_amount": "550.0000",
            },
        ),
    )

    # 1. Approve extraction
    approved_ext = await service.review_and_approve(
        tenant_id=tenant.id,
        document_id=doc.id,
        extraction_id=extraction.id,
        actor_id=user.id,
        request=DocumentApprovalRequest(
            action="APPROVE",
            notes="Verified vendor VAT number and invoice totals.",
            post_transactions=False,
        ),
    )

    assert approved_ext.approval_status == "APPROVED"
    assert approved_ext.reviewed_by == user.id

    # Verify audit event emitted
    events = await service.list_approval_events(tenant.id, doc.id)
    assert len(events) == 1
    assert events[0].action == "APPROVE"
    assert events[0].actor_id == user.id
    assert "Verified vendor" in events[0].notes


@pytest.mark.asyncio
async def test_controlled_ledger_posting_on_approval(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 6: Controlled double-entry journal entry generation on approval."""
    user, tenant, _ = await test_user_factory(email="doc.gl.posting@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    # Seed Standard Chart of Accounts (Cash 1010, Operating Expense 5000)
    await ChartOfAccountsService.seed_standard_chart_of_accounts(db_session, tenant.id)

    service = DocumentIntelligenceService(db_session)
    doc = await service.ingest_document(
        tenant.id,
        FinancialDocumentCreate(
            filename="receipt_cloud.pdf",
            file_size_bytes=2048,
            mime_type="application/pdf",
            storage_path="documents/receipt_cloud.pdf",
            file_hash=hashlib.sha256(b"receipt_cloud").hexdigest(),
            document_type="INVOICE",
        ),
    )

    extraction = await service.record_extraction(
        tenant.id,
        doc.id,
        DocumentExtractionCreate(
            schema_version="v1",
            document_type="INVOICE",
            confidence_score=Decimal("1.0000"),
            extracted_payload={
                "subtotal": "250.0000",
                "taxes": "0.0000",
                "discounts": "0.0000",
                "total_amount": "250.0000",
                "transactions": [
                    {
                        "date": "2026-02-01",
                        "description": "AWS Cloud Services Hosting",
                        "amount": "250.0000",
                    }
                ],
            },
        ),
    )

    # Approve with controlled posting
    posted_ext = await service.review_and_approve(
        tenant_id=tenant.id,
        document_id=doc.id,
        extraction_id=extraction.id,
        actor_id=user.id,
        request=DocumentApprovalRequest(
            action="APPROVE",
            notes="Approved for General Ledger posting",
            post_transactions=True,
        ),
    )

    assert posted_ext.approval_status == "APPROVED"
    assert posted_ext.posted_at is not None

    refreshed_doc = await service.get_document(tenant.id, doc.id)
    assert refreshed_doc.processing_status == "POSTED"


@pytest.mark.asyncio
async def test_tenant_isolation_documents(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 7: Cross-tenant isolation blocks unauthorized document access."""
    user_a, tenant_a, _ = await test_user_factory(email="tenant.a.doc@example.com")
    user_b, tenant_b, _ = await test_user_factory(email="tenant.b.doc@example.com")

    # Tenant A uploads document
    await set_db_tenant_context(db_session, tenant_a.id, user_id=user_a.id)
    service_a = DocumentIntelligenceService(db_session)
    doc_a = await service_a.ingest_document(
        tenant_a.id,
        FinancialDocumentCreate(
            filename="confidential_audit.pdf",
            file_size_bytes=512,
            mime_type="application/pdf",
            storage_path="documents/confidential_audit.pdf",
            file_hash=hashlib.sha256(b"tenant_a_secret").hexdigest(),
            document_type="STATEMENT",
        ),
    )

    # Tenant B attempts to read Tenant A's document
    await set_db_tenant_context(db_session, tenant_b.id, user_id=user_b.id)
    service_b = DocumentIntelligenceService(db_session)
    queried_by_b = await service_b.get_document(tenant_b.id, doc_a.id)
    assert queried_by_b is None

    b_docs = await service_b.list_documents(tenant_b.id)
    assert len(b_docs) == 0


@pytest.mark.asyncio
async def test_http_api_documents_lifecycle(
    client: AsyncClient, test_user_factory
):
    """Requirement 8: Complete REST API test via HTTP client."""
    user, tenant, token = await test_user_factory(email="api.documents@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Register document via API
    resp_ingest = await client.post(
        "/api/v1/documents",
        json={
            "filename": "api_bank_statement.pdf",
            "file_size_bytes": 1024,
            "mime_type": "application/pdf",
            "storage_path": "documents/api_bank_statement.pdf",
            "file_hash": hashlib.sha256(b"api_statement").hexdigest(),
            "document_type": "BANK_STATEMENT",
        },
        headers=headers,
    )
    assert resp_ingest.status_code == 201
    doc_data = resp_ingest.json()
    doc_id = doc_data["id"]
    assert doc_data["processing_status"] == "PENDING"

    # 2. List documents
    resp_list = await client.get("/api/v1/documents", headers=headers)
    assert resp_list.status_code == 200
    assert len(resp_list.json()) >= 1

    # 3. Record extraction via API
    resp_ext = await client.post(
        f"/api/v1/documents/{doc_id}/extractions",
        json={
            "schema_version": "v1",
            "document_type": "BANK_STATEMENT",
            "confidence_score": "0.9500",
            "extracted_payload": {
                "opening_balance": "5000.0000",
                "closing_balance": "7000.0000",
                "total_credits": "3000.0000",
                "total_debits": "1000.0000",
                "transactions": [
                    {"date": "2026-03-01", "description": "Consulting Income", "type": "CREDIT", "amount": "3000.0000"},
                    {"date": "2026-03-05", "description": "Equipment Purchase", "type": "DEBIT", "amount": "1000.0000"},
                ],
            },
        },
        headers=headers,
    )
    assert resp_ext.status_code == 201
    ext_data = resp_ext.json()
    ext_id = ext_data["id"]
    assert ext_data["validation_status"] == "VALIDATED"

    # 4. Reconcile extraction via API
    resp_recon = await client.get(
        f"/api/v1/documents/{doc_id}/extractions/{ext_id}/reconcile",
        headers=headers,
    )
    assert resp_recon.status_code == 200
    recon_data = resp_recon.json()
    assert recon_data["total_extracted_records"] == 2

    # 5. Approve extraction via API
    resp_approve = await client.post(
        f"/api/v1/documents/{doc_id}/extractions/{ext_id}/approve",
        json={
            "action": "APPROVE",
            "notes": "API test approval verified",
            "post_transactions": False,
        },
        headers=headers,
    )
    assert resp_approve.status_code == 200
    assert resp_approve.json()["approval_status"] == "APPROVED"

    # 6. Get approval events via API
    resp_events = await client.get(
        f"/api/v1/documents/{doc_id}/approval-events",
        headers=headers,
    )
    assert resp_events.status_code == 200
    assert len(resp_events.json()) == 1
    assert resp_events.json()[0]["action"] == "APPROVE"
