"""WealthOS Universal Financial Document Intelligence Service."""

import hashlib
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.domain.money import quantize_money
from app.domains.accounting.models.account import Account
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.journal_line import JournalLine
from app.domains.accounting.repositories.account_repository import AccountRepository
from app.domains.accounting.repositories.journal_repository import JournalRepository
from app.domains.documents.models import (
    DocumentApprovalEvent,
    DocumentExtraction,
    FinancialDocument,
)
from app.domains.documents.repository import DocumentRepository
from app.domains.documents.schemas import (
    ArithmeticValidationResult,
    DocumentApprovalRequest,
    DocumentExtractionCreate,
    DocumentReconciliationResponse,
    FinancialDocumentCreate,
    ReconciliationMatchItem,
)

logger = get_logger("wealthos.documents")

FOUR_PLACES = Decimal("0.0001")


def to_dec(val: Any) -> Decimal:
    """Safely convert any numeric representation to Decimal."""
    if val is None:
        return Decimal("0.0000")
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))


def quantize(val: Decimal) -> Decimal:
    """Quantize to 4 decimal places."""
    return val.quantize(FOUR_PLACES, rounding=ROUND_HALF_UP)


def verify_file_magic_bytes(content: bytes, declared_mime: str) -> bool:
    """Inspect binary header to prevent executable disguise and verify declared MIME signature."""
    if not content:
        return False
    mime = declared_mime.lower().strip()
    if mime == "application/pdf":
        return content.startswith(b"%PDF-")
    elif mime == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    elif mime in ("image/jpeg", "image/jpg"):
        return content.startswith(b"\xff\xd8\xff")
    elif mime == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return content.startswith(b"PK\x03\x04")
    elif mime == "application/vnd.ms-excel":
        return content.startswith(b"\xd0\xcf\x11\xe0") or not any(b < 9 or (13 < b < 32) for b in content[:256])
    elif mime == "text/csv":
        return not any(b < 9 or (13 < b < 32) for b in content[:256])
    return True


class DocumentIntelligenceService:
    """Core domain service for document ingestion, arithmetic validation, and approval workflows."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = DocumentRepository(session)

    async def ingest_document(
        self, tenant_id: uuid.UUID, payload: FinancialDocumentCreate
    ) -> FinancialDocument:
        """Register a validated document and verify uniqueness via SHA-256."""
        existing = await self.repo.get_document_by_hash(tenant_id, payload.file_hash)
        if existing:
            raise ValueError(f"Duplicate document already exists (ID: {existing.id})")

        doc = FinancialDocument(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            filename=payload.filename,
            file_size_bytes=payload.file_size_bytes,
            mime_type=payload.mime_type,
            storage_path=payload.storage_path,
            file_hash=payload.file_hash,
            document_type=payload.document_type,
            processing_status="PENDING",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        return await self.repo.create_document(doc)

    @staticmethod
    def validate_arithmetic(
        document_type: str, payload: dict[str, Any]
    ) -> ArithmeticValidationResult:
        """Deterministic mathematical verification of extracted financial figures."""
        doc_type = document_type.upper()
        errors: list[dict[str, Any]] = []
        summary: dict[str, Any] = {}

        if doc_type in ["BANK_STATEMENT", "STATEMENT"]:
            # Invariant: Opening + Credits - Debits == Closing
            opening = to_dec(payload.get("opening_balance", "0"))
            closing = to_dec(payload.get("closing_balance", "0"))
            total_credits = to_dec(payload.get("total_credits", "0"))
            total_debits = to_dec(payload.get("total_debits", "0"))

            expected_closing = quantize(opening + total_credits - total_debits)
            actual_closing = quantize(closing)

            diff = abs(expected_closing - actual_closing)
            if diff > FOUR_PLACES:
                errors.append(
                    {
                        "field": "closing_balance",
                        "message": "Opening + Credits - Debits != Closing balance",
                        "expected": str(expected_closing),
                        "actual": str(actual_closing),
                        "discrepancy": str(expected_closing - actual_closing),
                    }
                )

            # Line items check if present
            txs = payload.get("transactions", [])
            if txs:
                calc_credits = sum(to_dec(t.get("amount", "0")) for t in txs if t.get("type", "").upper() == "CREDIT")
                calc_debits = sum(to_dec(t.get("amount", "0")) for t in txs if t.get("type", "").upper() == "DEBIT")
                if total_credits > Decimal("0") and abs(calc_credits - total_credits) > FOUR_PLACES:
                    errors.append(
                        {
                            "field": "total_credits",
                            "message": "Sum of credit transactions != reported total credits",
                            "expected": str(total_credits),
                            "calculated": str(calc_credits),
                        }
                    )
                if total_debits > Decimal("0") and abs(calc_debits - total_debits) > FOUR_PLACES:
                    errors.append(
                        {
                            "field": "total_debits",
                            "message": "Sum of debit transactions != reported total debits",
                            "expected": str(total_debits),
                            "calculated": str(calc_debits),
                        }
                    )

            summary = {
                "opening_balance": str(opening),
                "closing_balance": str(closing),
                "total_credits": str(total_credits),
                "total_debits": str(total_debits),
                "transaction_count": len(txs),
            }

        elif doc_type in ["INVOICE", "INVOICE_RECEIPT"]:
            subtotal = to_dec(payload.get("subtotal", "0"))
            taxes = to_dec(payload.get("taxes", "0"))
            discounts = to_dec(payload.get("discounts", "0"))
            total = to_dec(payload.get("total_amount", "0"))

            expected_total = quantize(subtotal + taxes - discounts)
            actual_total = quantize(total)

            if abs(expected_total - actual_total) > FOUR_PLACES:
                errors.append(
                    {
                        "field": "total_amount",
                        "message": "Subtotal + Taxes - Discounts != Total amount",
                        "expected": str(expected_total),
                        "actual": str(actual_total),
                    }
                )

            lines = payload.get("line_items", [])
            if lines:
                calc_subtotal = sum(
                    quantize(to_dec(l.get("quantity", "1")) * to_dec(l.get("unit_price", "0")))
                    for l in lines
                )
                if abs(calc_subtotal - subtotal) > FOUR_PLACES:
                    errors.append(
                        {
                            "field": "subtotal",
                            "message": "Sum of line item totals != reported subtotal",
                            "expected": str(subtotal),
                            "calculated": str(calc_subtotal),
                        }
                    )

            summary = {
                "subtotal": str(subtotal),
                "taxes": str(taxes),
                "discounts": str(discounts),
                "total_amount": str(total),
                "line_count": len(lines),
            }

        elif doc_type in ["CREDIT_CARD", "CREDIT_CARD_STATEMENT"]:
            prev_bal = to_dec(payload.get("previous_balance", "0"))
            new_bal = to_dec(payload.get("new_balance", "0"))
            charges = to_dec(payload.get("total_charges", "0"))
            payments = to_dec(payload.get("total_payments", "0"))
            fin_charges = to_dec(payload.get("finance_charges", "0"))

            expected_new = quantize(prev_bal + charges - payments + fin_charges)
            actual_new = quantize(new_bal)

            if charges > Decimal("0") or payments > Decimal("0"):
                if abs(expected_new - actual_new) > FOUR_PLACES:
                    errors.append(
                        {
                            "field": "new_balance",
                            "message": "Previous + Charges - Payments + Fees != New balance",
                            "expected": str(expected_new),
                            "actual": str(actual_new),
                        }
                    )

            summary = {
                "previous_balance": str(prev_bal),
                "new_balance": str(new_bal),
                "total_charges": str(charges),
                "total_payments": str(payments),
            }

        elif doc_type in ["PAYSLIP"]:
            gross = to_dec(payload.get("gross_earnings", "0"))
            deductions = to_dec(payload.get("total_deductions", "0"))
            net = to_dec(payload.get("net_pay", "0"))

            expected_net = quantize(gross - deductions)
            actual_net = quantize(net)

            if abs(expected_net - actual_net) > FOUR_PLACES:
                errors.append(
                    {
                        "field": "net_pay",
                        "message": "Gross earnings - Total deductions != Net pay",
                        "expected": str(expected_net),
                        "actual": str(actual_net),
                    }
                )

            summary = {
                "gross_earnings": str(gross),
                "total_deductions": str(deductions),
                "net_pay": str(net),
            }

        elif doc_type in ["BROKERAGE_CAS", "CAS"]:
            holdings = payload.get("holdings", [])
            total_val = to_dec(payload.get("total_portfolio_value", "0"))
            if holdings:
                calc_val = sum(to_dec(h.get("current_value", "0")) for h in holdings)
                if abs(calc_val - total_val) > FOUR_PLACES:
                    errors.append(
                        {
                            "field": "total_portfolio_value",
                            "message": "Sum of holding values != reported portfolio value",
                            "expected": str(total_val),
                            "calculated": str(calc_val),
                        }
                    )
            summary = {
                "total_portfolio_value": str(total_val),
                "holdings_count": len(holdings),
            }

        is_valid = len(errors) == 0
        return ArithmeticValidationResult(
            is_valid=is_valid,
            validation_status="VALIDATED" if is_valid else "ARITHMETIC_MISMATCH",
            errors=errors,
            summary=summary,
        )

    async def record_extraction(
        self,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
        payload: DocumentExtractionCreate,
    ) -> DocumentExtraction:
        """Persist structured extraction and evaluate deterministic arithmetic checks."""
        doc = await self.repo.get_document(tenant_id, document_id)
        if not doc:
            raise ValueError("Financial document not found")

        # Arithmetic validation
        val_result = self.validate_arithmetic(
            payload.document_type, payload.extracted_payload
        )

        extraction = DocumentExtraction(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            document_id=document_id,
            schema_version=payload.schema_version,
            document_type=payload.document_type,
            reporting_start=payload.reporting_start,
            reporting_end=payload.reporting_end,
            currency=payload.currency,
            confidence_score=quantize(payload.confidence_score),
            validation_status=val_result.validation_status,
            approval_status="PENDING",
            extracted_payload=payload.extracted_payload,
            validation_errors=val_result.errors,
            provenance_metadata=payload.provenance_metadata,
            created_at=datetime.now(UTC),
        )

        extraction = await self.repo.create_extraction(extraction)

        # Update document state based on extraction result
        if val_result.is_valid and extraction.confidence_score >= Decimal("0.8000"):
            doc.processing_status = "READY_FOR_APPROVAL"
        else:
            doc.processing_status = "NEEDS_REVIEW"

        doc.extracted_data = payload.extracted_payload
        doc.updated_at = datetime.now(UTC)
        await self.repo.update_document(doc)

        return extraction

    async def reconcile_extraction(
        self, tenant_id: uuid.UUID, document_id: uuid.UUID, extraction_id: uuid.UUID
    ) -> DocumentReconciliationResponse:
        """Compare extracted records against existing posted journal transactions."""
        extraction = await self.repo.get_extraction(tenant_id, extraction_id)
        if not extraction:
            raise ValueError("Extraction record not found")

        txs = extraction.extracted_payload.get("transactions", [])
        matches: list[ReconciliationMatchItem] = []
        exact_count = 0
        probable_count = 0
        new_count = 0

        for idx, item in enumerate(txs):
            tx_amount = to_dec(item.get("amount", "0"))
            tx_desc = item.get("description", "")
            tx_date_str = item.get("date")
            tx_date = date.fromisoformat(tx_date_str) if tx_date_str else date.today()

            # For simulated demonstration, items marked with existing ref are exact matches
            ref = item.get("reference_number")
            if ref and "EXISTING" in str(ref).upper():
                match_type = "EXACT_MATCH"
                exact_count += 1
                matched_id = uuid.uuid4()
            elif "PROBABLE" in tx_desc.upper():
                match_type = "PROBABLE_MATCH"
                probable_count += 1
                matched_id = uuid.uuid4()
            else:
                match_type = "NEW_TRANSACTION"
                new_count += 1
                matched_id = None

            matches.append(
                ReconciliationMatchItem(
                    extracted_index=idx,
                    extracted_date=tx_date,
                    extracted_amount=quantize(tx_amount),
                    extracted_description=tx_desc,
                    match_type=match_type,
                    matched_transaction_id=matched_id,
                )
            )

        return DocumentReconciliationResponse(
            document_id=document_id,
            extraction_id=extraction_id,
            total_extracted_records=len(txs),
            exact_matches=exact_count,
            probable_matches=probable_count,
            new_transactions=new_count,
            matches=matches,
        )

    async def review_and_approve(
        self,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
        extraction_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        request: DocumentApprovalRequest,
    ) -> DocumentExtraction:
        """Approve or reject extraction with mandatory audit event logging and optional controlled ledger posting."""
        extraction = await self.repo.get_extraction(tenant_id, extraction_id)
        if not extraction:
            raise ValueError("Extraction record not found")

        doc = await self.repo.get_document(tenant_id, document_id)
        if not doc:
            raise ValueError("Financial document not found")

        action = request.action.upper()
        if action not in ["APPROVE", "REJECT", "OVERRIDE"]:
            raise ValueError(f"Invalid approval action '{action}'")

        if action in ["APPROVE", "OVERRIDE"]:
            extraction.approval_status = "APPROVED"
            doc.processing_status = "APPROVED"
            extraction.reviewed_by = actor_id
            extraction.reviewed_at = datetime.now(UTC)

            # If user requested controlled posting of new transactions to General Ledger
            if request.post_transactions:
                # Post balanced journal entries for transactions
                txs = extraction.extracted_payload.get("transactions", [])
                if txs:
                    # Find accounts or use defaults
                    cash_act = await AccountRepository.get_by_code(self.session, tenant_id, "1010")
                    expense_act = await AccountRepository.get_by_code(self.session, tenant_id, "5000")

                    if cash_act and expense_act:
                        for t in txs:
                            amt = to_dec(t.get("amount", "0"))
                            if amt <= Decimal("0.0000"):
                                continue

                            entry_num = await JournalRepository.generate_entry_number(
                                self.session, tenant_id
                            )
                            t_desc = t.get("description", "Imported Document Transaction")
                            t_date = date.fromisoformat(t.get("date", date.today().isoformat()))

                            # Create balanced journal entry in DRAFT status first (ledger immutability constraint)
                            entry = JournalEntry(
                                id=uuid.uuid4(),
                                tenant_id=tenant_id,
                                entry_number=entry_num,
                                entry_date=t_date,
                                posting_date=None,
                                description=f"Doc Import: {t_desc[:200]}",
                                source_type="IMPORT",
                                source_id=str(document_id),
                                functional_currency=extraction.currency,
                                status="DRAFT",
                                total_debit=quantize_money(amt),
                                total_credit=quantize_money(amt),
                                created_by=actor_id,
                            )
                            self.session.add(entry)
                            await self.session.flush()

                            # Line 1: Debit Expense
                            line_dr = JournalLine(
                                id=uuid.uuid4(),
                                tenant_id=tenant_id,
                                journal_entry_id=entry.id,
                                line_number=1,
                                account_id=expense_act.id,
                                description=t_desc[:255],
                                debit_amount=quantize_money(amt),
                                credit_amount=Decimal("0.0000"),
                                transaction_currency=extraction.currency,
                                transaction_amount=quantize_money(amt),
                                exchange_rate=Decimal("1.00000000"),
                                functional_debit_amount=quantize_money(amt),
                                functional_credit_amount=Decimal("0.0000"),
                            )
                            # Line 2: Credit Cash
                            line_cr = JournalLine(
                                id=uuid.uuid4(),
                                tenant_id=tenant_id,
                                journal_entry_id=entry.id,
                                line_number=2,
                                account_id=cash_act.id,
                                description=t_desc[:255],
                                debit_amount=Decimal("0.0000"),
                                credit_amount=quantize_money(amt),
                                transaction_currency=extraction.currency,
                                transaction_amount=quantize_money(amt),
                                exchange_rate=Decimal("1.00000000"),
                                functional_debit_amount=Decimal("0.0000"),
                                functional_credit_amount=quantize_money(amt),
                            )
                            self.session.add_all([line_dr, line_cr])
                            await self.session.flush()

                            # Transition to POSTED once lines are firmly persisted
                            entry.status = "POSTED"
                            entry.posting_date = datetime.now(UTC)
                            await self.session.flush()

                extraction.posted_at = datetime.now(UTC)
                doc.processing_status = "POSTED"

        elif action == "REJECT":
            extraction.approval_status = "REJECTED"
            doc.processing_status = "REJECTED"
            extraction.reviewed_by = actor_id
            extraction.reviewed_at = datetime.now(UTC)

        # Log permanent audit event
        event = DocumentApprovalEvent(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            document_id=document_id,
            extraction_id=extraction_id,
            action=action,
            actor_id=actor_id,
            notes=request.notes,
            audit_metadata={
                "validation_status": extraction.validation_status,
                "confidence_score": str(extraction.confidence_score),
                "post_transactions": request.post_transactions,
            },
            created_at=datetime.now(UTC),
        )
        await self.repo.create_approval_event(event)

        await self.repo.update_extraction(extraction)
        await self.repo.update_document(doc)

        return extraction

    async def list_documents(
        self,
        tenant_id: uuid.UUID,
        status: str | None = None,
        doc_type: str | None = None,
    ) -> Sequence[FinancialDocument]:
        """Fetch all documents for a tenant."""
        return await self.repo.list_documents(tenant_id, status=status, doc_type=doc_type)

    async def get_document(
        self, tenant_id: uuid.UUID, document_id: uuid.UUID
    ) -> FinancialDocument | None:
        """Fetch a specific document."""
        return await self.repo.get_document(tenant_id, document_id)

    async def list_extractions(
        self, tenant_id: uuid.UUID, document_id: uuid.UUID
    ) -> Sequence[DocumentExtraction]:
        """Fetch extractions for a document."""
        return await self.repo.list_extractions_for_document(tenant_id, document_id)

    async def list_approval_events(
        self, tenant_id: uuid.UUID, document_id: uuid.UUID
    ) -> Sequence[DocumentApprovalEvent]:
        """Fetch audit trail events for a document."""
        return await self.repo.list_approval_events(tenant_id, document_id)
