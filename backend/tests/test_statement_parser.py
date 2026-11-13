"""Tests for WealthOS Financial Statement, Broker Tradebook, and CAS Parser Engine."""

import uuid
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import init_db
from app.core.tenant_context import set_db_tenant_context
from app.domains.documents.schemas import StatementParseRequest
from app.domains.documents.service import DocumentIntelligenceService


@pytest.fixture(autouse=True)
async def setup_test_engine():
    await init_db()


@pytest.mark.asyncio
async def test_parse_hdfc_bank_statement_csv(
    db_session: AsyncSession, test_user_factory
):
    """Verify parsing real HDFC Bank Statement CSV with debit, credit, balance math."""
    user, tenant, _ = await test_user_factory(email=f"stmt.{uuid.uuid4().hex[:8]}@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)

    csv_content = """HDFC BANK ENHANCED STATEMENT
Account Number: 50100234567890
Opening Balance: 84200.00

Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
01/11/2026,SALARY CREDIT ACME TECH PRIVATE LIMITED,CMS908234,01/11/2026,,125000.00,209200.00
03/11/2026,UPI/5301827491/SWIGGY/BANGALORE,UPI530182,03/11/2026,840.00,,208360.00
05/11/2026,POS SHELL FUEL STATION KORAMANGALA,POS98214,05/11/2026,2500.00,,205860.00
08/11/2026,ACH BESCOM ELECTRICITY BILL ONLINE,ACH12984,08/11/2026,1420.00,,204440.00
10/11/2026,AMAZON PAY INDIA PRIVATE LIMITED,AMZN8291,10/11/2026,3299.00,,201141.00
12/11/2026,CREDIT INTEREST CAPITALIZED Q3,,12/11/2026,,1680.00,202821.00
"""

    req = StatementParseRequest(
        filename="hdfc_statement_nov2026.csv",
        raw_content=csv_content,
        document_format="BANK_CSV",
    )

    result = await service.parse_statement(tenant.id, req)

    assert result.institution == "HDFC Bank"
    assert len(result.transactions) == 6
    assert result.total_credits == Decimal("126680.00")
    assert result.total_debits == Decimal("8059.00")
    assert result.net_change == Decimal("118621.00")
    assert result.opening_balance == Decimal("84200.00")
    assert result.is_balanced is True

    # Check categories
    salary_tx = next(t for t in result.transactions if "SALARY" in t.description)
    assert salary_tx.category == "Income & Salary"
    assert salary_tx.type == "CREDIT"
    assert salary_tx.amount == Decimal("125000.00")

    swiggy_tx = next(t for t in result.transactions if "SWIGGY" in t.description)
    assert swiggy_tx.category == "Food & Dining"
    assert swiggy_tx.type == "DEBIT"
    assert swiggy_tx.amount == Decimal("840.00")

    shell_tx = next(t for t in result.transactions if "SHELL" in t.description)
    assert shell_tx.category == "Transport & Fuel"
    assert shell_tx.type == "DEBIT"
    assert shell_tx.amount == Decimal("2500.00")


@pytest.mark.asyncio
async def test_parse_zerodha_tradebook_csv(
    db_session: AsyncSession, test_user_factory
):
    """Verify parsing Zerodha equity tradebook CSV with holdings derivation."""
    user, tenant, _ = await test_user_factory(email=f"zerodha.{uuid.uuid4().hex[:8]}@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)

    csv_content = """symbol,isin,trade_date,exchange,segment,series,trade_type,quantity,price,order_id,order_execution_time
HDFCBANK,INE040A01034,2026-11-04,NSE,EQ,EQ,buy,25,1650.00,1200000018273641,2026-11-04 10:14:22
RELIANCE,INE002A01018,2026-11-05,NSE,EQ,EQ,buy,10,2950.00,1200000018299102,2026-11-05 11:32:05
INFY,INE009A01021,2026-11-06,NSE,EQ,EQ,buy,30,1520.00,1200000018314562,2026-11-06 14:05:49
TATASTEEL,INE081A01020,2026-11-08,NSE,EQ,EQ,buy,100,155.00,1200000018391820,2026-11-08 09:25:11
"""

    req = StatementParseRequest(
        filename="tradebook-nov-2026.csv",
        raw_content=csv_content,
        document_format="ZERODHA",
    )

    result = await service.parse_statement(tenant.id, req)

    assert result.institution == "Zerodha Broking Ltd"
    assert len(result.transactions) == 4
    assert len(result.holdings) == 4

    hdfc = next(h for h in result.holdings if h.symbol == "HDFCBANK")
    assert hdfc.quantity == Decimal("25.00")
    assert hdfc.avg_price == Decimal("1650.00")
    assert hdfc.invested_value == Decimal("41250.00")

    reliance = next(h for h in result.holdings if h.symbol == "RELIANCE")
    assert reliance.quantity == Decimal("10.00")
    assert reliance.avg_price == Decimal("2950.00")
    assert reliance.invested_value == Decimal("29500.00")


@pytest.mark.asyncio
async def test_parse_cams_cas_text(
    db_session: AsyncSession, test_user_factory
):
    """Verify parsing CAMS mutual fund CAS statement."""
    user, tenant, _ = await test_user_factory(email=f"cas.{uuid.uuid4().hex[:8]}@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = DocumentIntelligenceService(db_session)

    cas_text = """CAMS CONSOLIDATED ACCOUNT STATEMENT
Summary of Mutual Fund Investments

Parag Parikh Flexi Cap Fund - Direct Plan - Growth
Folio No: 10842910/24
05-Nov-2026 Systematic Investment Plan ₹5,000.00 74.1200 ₹67.4580 1250.400

Mirae Asset Large Cap Fund - Direct Plan - Growth
Folio No: 29401827/11
08-Nov-2026 Systematic Investment Plan ₹3,000.00 28.4500 ₹105.4480 840.120
"""

    req = StatementParseRequest(
        filename="cams_cas_statement.txt",
        raw_content=cas_text,
        document_format="CAS",
    )

    result = await service.parse_statement(tenant.id, req)

    assert "CAMS" in result.institution
    assert len(result.transactions) == 2
    assert len(result.holdings) == 2
    assert result.transactions[0].amount == Decimal("5000.00")
    assert result.transactions[1].amount == Decimal("3000.00")


@pytest.mark.asyncio
async def test_parse_statement_rest_api_endpoint(
    client: AsyncClient, test_user_factory
):
    """Verify HTTP REST API POST /api/v1/documents/parse-statement."""
    user, tenant, token = await test_user_factory(email=f"api.stmt.{uuid.uuid4().hex[:8]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    csv_data = """Date,Narration,Ref,Withdrawal,Deposit,Balance
01/11/2026,SALARY CREDIT,,0,75000.00,75000.00
02/11/2026,UBER RIDE,UBR123,450.00,0,74550.00
"""

    payload = {
        "filename": "icici_statement.csv",
        "raw_content": csv_data,
        "document_format": "BANK_CSV",
    }

    resp = await client.post(
        "/api/v1/documents/parse-statement",
        json=payload,
        headers=headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["transactions"]) == 2
    assert data["total_credits"] == "75000.00"
    assert data["total_debits"] == "450.00"
    assert data["document_id"] is not None
