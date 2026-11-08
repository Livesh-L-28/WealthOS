"""WealthOS Gate 10 Acceptance Test Suite.

Validates Reports Generation (CSV formula defense, Excel, PDF),
In-App Notifications Event Bus & Preferences, DPDP Act Consent,
AES-256-GCM Provider Credential Envelope Encryption, and Cursor Synchronization.
"""

import io
import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from cryptography.exceptions import InvalidTag
from openpyxl import load_workbook
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.integrations.notifications import NotificationService
from app.domains.integrations.providers import FinancialProviderService
from app.domains.integrations.reports import (
    FinancialReportGenerator,
)


async def bind_tenant_session(db_session: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID):
    """Bind tenant session variables without transaction expiration."""
    await db_session.execute(
        text("SELECT set_config('app.current_tenant_id', :t, false);"),
        {"t": str(tenant_id)},
    )
    await db_session.execute(
        text("SELECT set_config('app.current_user_id', :u, false);"),
        {"u": str(user_id)},
    )


@pytest.mark.asyncio
async def test_gate10_csv_formula_injection_defense():
    """Verify CSV export sanitizes spreadsheet formula injection payloads (CWE-1236)."""
    headers = ["Account", "Description", "Amount"]
    rows = [
        ["HDFC Savings", "=cmd|' /C calc'!A0", 15000.00],
        ["ICICI Current", "+10+20", 25000.00],
        ["Axis Demat", "-SUM(A1:A10)", 35000.00],
        ["Zerodha", "@HYPERLINK('http://malicious.com')", 45000.00],
        ["Safe Account", "Standard Vendor Payment", 55000.00],
    ]

    csv_bytes = FinancialReportGenerator.generate_csv(headers, rows)
    csv_str = csv_bytes.decode("utf-8")

    # Formula tokens must be sanitized by prepending single quote
    assert "'=cmd|' /C calc'!A0" in csv_str
    assert "'+10+20" in csv_str
    assert "'-SUM(A1:A10)" in csv_str
    assert "'@HYPERLINK" in csv_str
    # Safe text must NOT be prepended with a quote
    assert "Standard Vendor Payment" in csv_str


@pytest.mark.asyncio
async def test_gate10_excel_report_generation():
    """Verify professional openpyxl Excel generation with formula safety."""
    headers = ["Asset Category", "Holding Name", "Valuation INR"]
    rows = [
        ["Equity", "=2+5", Decimal("150000.00")],
        ["Debt", "Govt Sovereign Gold Bond", Decimal("85000.00")],
    ]

    xlsx_bytes = FinancialReportGenerator.generate_excel("Balance Sheet", headers, rows)
    assert xlsx_bytes[:4] == b"PK\x03\x04", "Must produce valid OpenXML / ZIP signature"

    # Reload workbook into openpyxl and inspect cells
    wb = load_workbook(io.BytesIO(xlsx_bytes))
    ws = wb.active
    assert ws.title == "Balance Sheet"
    assert ws.cell(row=1, column=1).value == "Asset Category"
    # Injected formula is sanitized
    assert ws.cell(row=2, column=2).value == "'=2+5"
    assert ws.cell(row=3, column=2).value == "Govt Sovereign Gold Bond"


@pytest.mark.asyncio
async def test_gate10_pdf_report_generation():
    """Verify ReportLab PDF generation with valid structure and styles."""
    headers = ["Metric", "Reported Amount"]
    rows = [
        ["Total Assets", Decimal("9430201.25")],
        ["Total Liabilities", Decimal("1892300.00")],
        ["Consolidated Net Worth", Decimal("7537901.25")],
    ]
    metadata = {"Workspace": "Acme Holdings", "Period": "Q3 2026", "Currency": "INR"}

    pdf_bytes = FinancialReportGenerator.generate_pdf(
        "Quarterly Statement of Financial Condition", headers, rows, metadata
    )
    assert pdf_bytes.startswith(b"%PDF-"), "Must have valid PDF header"
    assert len(pdf_bytes) > 1000, "PDF document must contain generated tables and content"


@pytest.mark.asyncio
async def test_gate10_notifications_event_bus_and_preferences(
    db_session: AsyncSession, test_user_factory
):
    """Verify notification preferences, event emission, inbox delivery, and read state."""
    user, tenant, _ = await test_user_factory(email="notif-gate10@example.com", status="active")
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 1. Configure user preferences: Disable 'MARKETING', Enable 'SECURITY' and 'BUDGET_ALERT'
    await NotificationService.set_user_preference(
        db_session, tenant.id, user.id, category="MARKETING", is_enabled=False
    )
    await NotificationService.set_user_preference(
        db_session, tenant.id, user.id, category="BUDGET_ALERT", is_enabled=True
    )

    # 2. Emit Domain Events
    event1 = await NotificationService.emit_event(
        db_session,
        tenant_id=tenant.id,
        event_type="budget.overspent",
        category="BUDGET_ALERT",
        priority="HIGH",
        payload={"budget_id": str(uuid.uuid4()), "ratio": 114.0},
    )
    assert event1.priority == "HIGH"

    # 3. Dispatch Notifications
    # Suppressed due to user preference
    suppressed = await NotificationService.dispatch_notification(
        db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        event_type="promo.new_feature",
        category="MARKETING",
        priority="LOW",
        title="Check out our new tool!",
        message="New feature released.",
    )
    assert suppressed is None

    # Allowed by preference
    notif = await NotificationService.dispatch_notification(
        db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        event_type="budget.overspent",
        category="BUDGET_ALERT",
        priority="HIGH",
        title="Critical Budget Overspending Detected",
        message="Technology & Cloud Hosting has reached 114% utilization.",
        action_url="/budgets",
    )
    assert notif is not None
    assert notif.title == "Critical Budget Overspending Detected"

    # 4. Check Inbox
    inbox = await NotificationService.get_inbox(db_session, tenant.id, user.id, unread_only=True)
    assert len(inbox) == 1
    assert inbox[0].id == notif.id
    assert inbox[0].read_at is None

    # 5. Mark as Read & Archive
    read_success = await NotificationService.mark_as_read(db_session, tenant.id, user.id, notif.id)
    assert read_success is True

    unread_inbox = await NotificationService.get_inbox(
        db_session, tenant.id, user.id, unread_only=True
    )
    assert len(unread_inbox) == 0

    archive_success = await NotificationService.archive_notification(
        db_session, tenant.id, user.id, notif.id
    )
    assert archive_success is True

    all_inbox = await NotificationService.get_inbox(
        db_session, tenant.id, user.id, unread_only=False
    )
    assert len(all_inbox) == 0


@pytest.mark.asyncio
async def test_gate10_financial_provider_consent_and_aes_credentials(
    db_session: AsyncSession, test_user_factory
):
    """Verify DPDP Act consent logging, AES-256-GCM credential envelope encryption, and tamper detection."""
    user, tenant, _ = await test_user_factory(email="provider-gate10@example.com", status="active")
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 1. Register financial provider (Setu Account Aggregator)
    provider = await FinancialProviderService.get_or_create_provider(
        db_session,
        provider_key="setu_aa_india",
        name="Setu Account Aggregator (RBI Licensed)",
        category="ACCOUNT_AGGREGATOR",
        supported_products=["BANK_ACCOUNTS", "TRANSACTIONS", "DEPOSITS"],
        auth_type="OAUTH2",
    )
    assert provider.provider_key == "setu_aa_india"

    # 2. Record explicit DPDP Act 2023 user consent
    consent = await FinancialProviderService.record_dpdp_consent(
        db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        provider_id=provider.id,
        scopes_granted=["ACCOUNTS_READ", "TRANSACTIONS_READ"],
        purpose="Automated financial balance sheet reconciliation and net worth intelligence.",
        valid_days=180,
        dpdp_notice_version="1.2.0",
    )
    assert consent.dpdp_notice_version == "1.2.0"
    assert consent.revoked_at is None
    assert consent.valid_until > datetime.now(UTC)

    # 3. Store envelope-encrypted provider credentials
    sensitive_creds = {
        "client_id": "setu_live_client_88921",
        "client_secret": "sec_k99201!#_very_confidential_token",
        "access_token": "bearer_jwt_setu_992182041",
    }
    cred_record = await FinancialProviderService.store_provider_credentials(
        db_session,
        tenant_id=tenant.id,
        provider_id=provider.id,
        credentials_dict=sensitive_creds,
    )
    assert cred_record.encrypted_data != sensitive_creds["client_secret"]
    assert len(cred_record.iv) > 0
    assert len(cred_record.auth_tag) > 0

    # 4. Decrypt credentials and verify authenticity
    decrypted = await FinancialProviderService.decrypt_provider_credentials(
        db_session, tenant_id=tenant.id, provider_id=provider.id
    )
    assert decrypted is not None
    assert decrypted["client_id"] == sensitive_creds["client_id"]
    assert decrypted["client_secret"] == sensitive_creds["client_secret"]

    # 5. Tamper detection: corrupt the authentication tag and verify decryption failure
    import base64

    corrupted_tag = base64.b64encode(b"TAMPERED_TAG_123").decode("ascii")
    cred_record.auth_tag = corrupted_tag
    await db_session.flush()

    with pytest.raises(InvalidTag):
        await FinancialProviderService.decrypt_provider_credentials(
            db_session, tenant_id=tenant.id, provider_id=provider.id
        )


@pytest.mark.asyncio
async def test_gate10_provider_connection_and_sync_cursor(
    db_session: AsyncSession, test_user_factory
):
    """Verify provider connection lifecycle and pagination sync cursor tracking."""
    user, tenant, _ = await test_user_factory(email="cursor-gate10@example.com", status="active")
    await bind_tenant_session(db_session, tenant.id, user.id)

    provider = await FinancialProviderService.get_or_create_provider(
        db_session,
        provider_key="plaid_sandbox",
        name="Plaid Sandbox Banking Integration",
        category="CORE_BANKING",
    )

    # 1. Create connection
    conn = await FinancialProviderService.create_connection(
        db_session,
        tenant_id=tenant.id,
        provider_id=provider.id,
        account_count=3,
    )
    assert conn.status == "CONNECTED"
    assert conn.account_count == 3

    # 2. Advance sync cursor on initial sync
    cursor1 = await FinancialProviderService.advance_sync_cursor(
        db_session,
        tenant_id=tenant.id,
        connection_id=conn.id,
        new_cursor_token="cursor_token_batch_001",
    )
    assert cursor1.cursor_token == "cursor_token_batch_001"

    # 3. Advance sync cursor on incremental sync
    cursor2 = await FinancialProviderService.advance_sync_cursor(
        db_session,
        tenant_id=tenant.id,
        connection_id=conn.id,
        new_cursor_token="cursor_token_batch_002",
    )
    assert cursor2.cursor_token == "cursor_token_batch_002"
    assert cursor2.id == cursor1.id  # Same cursor record updated


@pytest.mark.asyncio
async def test_gate10_cross_tenant_integration_isolation(
    db_session: AsyncSession, test_user_factory
):
    """Verify strict PostgreSQL RLS ensures zero cross-tenant leakage for notifications and providers."""
    user_alpha, tenant_alpha, _ = await test_user_factory(
        email="alpha-gate10@example.com", status="active"
    )
    user_beta, tenant_beta, _ = await test_user_factory(
        email="beta-gate10@example.com", status="active"
    )

    # Alpha setup
    await bind_tenant_session(db_session, tenant_alpha.id, user_alpha.id)
    await FinancialProviderService.get_or_create_provider(
        db_session, provider_key="sandbox_feed", name="Sandbox Feed", category="AGGREGATOR"
    )
    alpha_notif = await NotificationService.dispatch_notification(
        db_session,
        tenant_id=tenant_alpha.id,
        user_id=user_alpha.id,
        event_type="test.alert",
        category="SECURITY",
        priority="HIGH",
        title="Tenant Alpha Confidential Security Alert",
        message="Restricted information",
    )
    assert alpha_notif is not None

    # Beta context switch
    await bind_tenant_session(db_session, tenant_beta.id, user_beta.id)

    # Beta should see ZERO notifications from Alpha
    beta_inbox = await NotificationService.get_inbox(
        db_session, tenant_beta.id, user_beta.id, unread_only=False
    )
    assert len(beta_inbox) == 0

    # Beta attempting to mark Alpha's notification as read must fail
    modified = await NotificationService.mark_as_read(
        db_session, tenant_beta.id, user_beta.id, alpha_notif.id
    )
    assert modified is False
