"""Tests for WealthOS Receipt OCR Scanner and Extraction Engine."""

import uuid
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import init_db
from app.core.tenant_context import set_db_tenant_context
from app.domains.documents.schemas import ReceiptScanRequest
from app.domains.documents.service import DocumentIntelligenceService


@pytest.fixture(autouse=True)
async def setup_test_engine():
    await init_db()


@pytest.mark.asyncio
async def test_receipt_scan_with_brand_and_taxes(
    db_session: AsyncSession, test_user_factory
):
    """Verify OCR parsing of brand, amount, taxes, GSTIN, and line items."""
    user, tenant, _ = await test_user_factory(email=f"receipt.{uuid.uuid4().hex[:8]}@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)

    sample_receipt_text = """
    STARBUCKS COFFEE INDIA
    Tata Starbucks Private Limited
    GSTIN: 27AABCT3456K1Z9
    Bill No: SBX-2026-98124
    Date: 12/11/2026

    Caffe Latte Grande       1   ₹350.00
    Blueberry Muffin         1   ₹220.00
    Subtotal: ₹570.00
    CGST + SGST: ₹28.50
    TOTAL: ₹598.50
    Paid via Credit Card
    """

    req = ReceiptScanRequest(
        filename="starbucks_bill.jpg",
        raw_text=sample_receipt_text,
    )

    result = await service.scan_receipt(tenant.id, req)

    assert result.merchant_name == "Starbucks Coffee"
    assert result.category == "Dining & Restaurants"
    assert result.amount == Decimal("598.50")
    assert result.taxes == Decimal("28.50")
    assert result.gstin == "27AABCT3456K1Z9"
    assert result.invoice_number == "SBX-2026-98124"
    assert result.document_id is not None
    assert len(result.line_items) == 2


@pytest.mark.asyncio
async def test_receipt_scan_with_upi_qr(
    db_session: AsyncSession, test_user_factory
):
    """Verify scanning UPI payment QR codes on invoices."""
    user, tenant, _ = await test_user_factory(email=f"upi.{uuid.uuid4().hex[:8]}@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)

    upi_string = "upi://pay?pa=apollopharmacy@hdfcbank&pn=Apollo%20Pharmacy&am=850.50&cu=INR&tn=MedStoreBill"

    req = ReceiptScanRequest(
        filename="upi_invoice.png",
        qr_payload=upi_string,
    )

    result = await service.scan_receipt(tenant.id, req)

    assert "Apollo Pharmacy" in result.merchant_name
    assert result.amount == Decimal("850.50")
    assert result.document_id is not None


@pytest.mark.asyncio
async def test_receipt_scan_rest_api_endpoint(
    client: AsyncClient, test_user_factory
):
    """Verify HTTP REST API POST /api/v1/documents/scan-receipt."""
    user, tenant, token = await test_user_factory(email=f"api.receipt.{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "filename": "shell_fuel_bill.jpg",
        "raw_text": "SHELL FUEL STATION\nDate: 10/11/2026\nPower Petrol 15L\nTOTAL: ₹1550.00\nGSTIN: 29AAFCS1234F1Z5",
    }

    resp = await client.post(
        "/api/v1/documents/scan-receipt",
        json=payload,
        headers=headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["merchant_name"] == "Shell Fuel Station"
    assert data["category"] == "Transport & Fuel"
    assert float(data["amount"]) == 1550.00
    assert data["document_id"] is not None
