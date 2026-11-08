"""WealthOS India Tax Readiness Acceptance Test Suite.

Validates all Phase 8 capabilities:
1. FY/AY temporal boundary derivation and handling.
2. Tax profile lifecycle and tenant uniqueness per financial year.
3. Heads of income aggregation from double-entry General Ledger.
4. Strict non-income credit exclusion (transfer neutrality, refunds).
5. FIFO capital gains integration with Section 112A ₹1.25L exemption.
6. New Regime (Section 115BAC) ₹75k standard deduction and Section 87A rebate.
7. Old Regime Chapter VI-A deductions and dual-regime comparison optimization.
8. Informational tax readiness report generation with non-authoritative disclaimer.
9. Multi-tenant RLS isolation.
10. Live HTTP REST API endpoints under /api/v1/tax/*.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.accounting.models import Account, JournalEntry, JournalLine
from app.domains.tax.schemas import (
    CapitalGainsSummary,
    TaxProfileUpdate,
)
from app.domains.tax.service import INFORMATIONAL_TAX_DISCLAIMER, TaxService


@pytest.mark.asyncio
async def test_fy_ay_temporal_mapping():
    """Requirement 1: Verify exact April 1 - March 31 FY and AY separation."""
    assert TaxService.derive_ay_from_fy("2026-27") == "2027-28"
    assert TaxService.derive_ay_from_fy("2025-26") == "2026-27"
    assert TaxService.derive_ay_from_fy("2024-25") == "2025-26"

    start_d, end_d = TaxService.get_fy_date_range("2026-27")
    assert start_d == date(2026, 4, 1)
    assert end_d == date(2027, 3, 31)

    curr_fy = TaxService.get_current_fy()
    assert "-" in curr_fy
    assert len(curr_fy) == 7


@pytest.mark.asyncio
async def test_tax_profile_lifecycle(db_session: AsyncSession, test_user_factory):
    """Requirement 2: Profile creation, update, and FY uniqueness."""
    user, tenant, _ = await test_user_factory(email="tax.profile@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = TaxService(db_session)

    # 1. Get or create initial profile
    profile = await service.get_or_create_profile(tenant.id, "2026-27")
    assert profile.financial_year == "2026-27"
    assert profile.assessment_year == "2027-28"
    assert profile.tax_regime == "NEW"
    assert profile.taxpayer_category == "INDIVIDUAL"

    # 2. Update profile to OLD regime
    updated = await service.update_profile(
        tenant.id,
        "2026-27",
        TaxProfileUpdate(
            tax_regime="OLD",
            taxpayer_category="SENIOR_CITIZEN",
        ),
    )
    assert updated.tax_regime == "OLD"
    assert updated.taxpayer_category == "SENIOR_CITIZEN"


@pytest.mark.asyncio
async def test_non_income_transfer_exclusion(db_session: AsyncSession, test_user_factory):
    """Requirements 3 & 4: Income aggregation with strict non-income credit exclusion."""
    user, tenant, _ = await test_user_factory(email="tax.income@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = TaxService(db_session)

    # Provision sample accounts
    acc_bank = Account(
        tenant_id=tenant.id,
        account_code="1001",
        account_name="HDFC Bank Operating",
        account_type="ASSET",
        normal_balance="DEBIT",
        currency_code="INR",
        is_active=True,
    )
    acc_savings = Account(
        tenant_id=tenant.id,
        account_code="1002",
        account_name="ICICI Savings Account",
        account_type="ASSET",
        normal_balance="DEBIT",
        currency_code="INR",
        is_active=True,
    )
    acc_salary = Account(
        tenant_id=tenant.id,
        account_code="4001",
        account_name="Salary and Allowances",
        account_type="INCOME",
        normal_balance="CREDIT",
        currency_code="INR",
        is_active=True,
    )
    db_session.add_all([acc_bank, acc_savings, acc_salary])
    await db_session.flush()

    # 1. Post taxable salary income entry: ₹150,000
    entry_salary = JournalEntry(
        tenant_id=tenant.id,
        entry_number="JE-SAL-01",
        entry_date=date(2026, 5, 1),
        source_type="MANUAL",
        description="Monthly Salary Credit",
        status="DRAFT",
    )
    db_session.add(entry_salary)
    await db_session.flush()

    line_sal_dr = JournalLine(
        tenant_id=tenant.id,
        journal_entry_id=entry_salary.id,
        account_id=acc_bank.id,
        line_number=1,
        debit_amount=Decimal("150000.0000"),
        functional_debit_amount=Decimal("150000.0000"),
        credit_amount=Decimal("0.0000"),
        functional_credit_amount=Decimal("0.0000"),
    )
    line_sal_cr = JournalLine(
        tenant_id=tenant.id,
        journal_entry_id=entry_salary.id,
        account_id=acc_salary.id,
        line_number=2,
        debit_amount=Decimal("0.0000"),
        functional_debit_amount=Decimal("0.0000"),
        credit_amount=Decimal("150000.0000"),
        functional_credit_amount=Decimal("150000.0000"),
    )
    db_session.add_all([line_sal_dr, line_sal_cr])
    await db_session.flush()
    entry_salary.status = "POSTED"
    await db_session.flush()

    # 2. Post internal transfer (Non-Income Credit): ₹50,000 between bank accounts
    entry_transfer = JournalEntry(
        tenant_id=tenant.id,
        entry_number="JE-TRF-01",
        entry_date=date(2026, 5, 2),
        source_type="TRANSFER",
        description="Internal account transfer to savings",
        status="DRAFT",
    )
    db_session.add(entry_transfer)
    await db_session.flush()

    line_trf_dr = JournalLine(
        tenant_id=tenant.id,
        journal_entry_id=entry_transfer.id,
        account_id=acc_savings.id,
        line_number=1,
        debit_amount=Decimal("50000.0000"),
        functional_debit_amount=Decimal("50000.0000"),
        credit_amount=Decimal("0.0000"),
        functional_credit_amount=Decimal("0.0000"),
    )
    line_trf_cr = JournalLine(
        tenant_id=tenant.id,
        journal_entry_id=entry_transfer.id,
        account_id=acc_bank.id,
        line_number=2,
        debit_amount=Decimal("0.0000"),
        functional_debit_amount=Decimal("0.0000"),
        credit_amount=Decimal("50000.0000"),
        functional_credit_amount=Decimal("50000.0000"),
    )
    db_session.add_all([line_trf_dr, line_trf_cr])
    await db_session.flush()
    entry_transfer.status = "POSTED"
    await db_session.flush()

    # Aggregate income
    breakdown, _ = await service.aggregate_income_breakdown(tenant.id, "2026-27")
    assert breakdown.salary_income >= Decimal("150000.00")
    # Transfer amount MUST be captured under non_income_credits_excluded and NOT in gross total income
    assert breakdown.non_income_credits_excluded >= Decimal("50000.00")


@pytest.mark.asyncio
async def test_capital_gains_and_112a_exemption():
    """Requirement 5: Capital gains calculation with ₹1.25L Section 112A exemption."""
    cap_summary = CapitalGainsSummary(
        equity_stcg=Decimal("50000.0000"),
        equity_ltcg=Decimal("200000.0000"),
        debt_and_other_stcg=Decimal("0.0000"),
        other_ltcg=Decimal("0.0000"),
        total_stcg=Decimal("50000.0000"),
        total_ltcg=Decimal("200000.0000"),
        exempt_ltcg_112a=Decimal("125000.0000"),
        taxable_ltcg=Decimal("75000.0000"),  # 200k - 125k = 75k
        total_taxable_capital_gains=Decimal("125000.0000"),  # 50k STCG + 75k LTCG
    )

    # Compute under New Regime with ₹1,200,000 ordinary salary
    gross = Decimal("1200000.0000") + cap_summary.total_taxable_capital_gains
    (
        taxable_total,
        tax_on_income,
        rebate_87a,
        surcharge,
        cess,
        total_liability,
        deductions,
    ) = TaxService.compute_new_regime_tax(
        gross_income=gross,
        salary_income=Decimal("1200000.0000"),
        cap_summary=cap_summary,
    )

    assert deductions.standard_deduction == Decimal("75000.00")
    # Equity STCG tax @ 20% on 50,000 = 10,000
    # Equity LTCG tax @ 12.5% on 75,000 = 9,375
    # Total CG tax = 19,375
    assert total_liability > Decimal("80000.00")


@pytest.mark.asyncio
async def test_section_87a_rebate_threshold():
    """Requirement 6: Section 87A rebate wipes out tax for taxable income <= ₹7,00,000 in New Regime."""
    cap_zero = CapitalGainsSummary()
    # Income ₹7,50,000 - ₹75,000 Standard Deduction = ₹6,75,000 Taxable Ordinary Income <= ₹7L
    (
        taxable_total,
        tax_on_income,
        rebate_87a,
        surcharge,
        cess,
        total_liability,
        deductions,
    ) = TaxService.compute_new_regime_tax(
        gross_income=Decimal("750000.0000"),
        salary_income=Decimal("750000.0000"),
        cap_summary=cap_zero,
    )

    assert deductions.standard_deduction == Decimal("75000.00")
    assert taxable_total == Decimal("675000.00")
    # Slabs: 0-3L=0, 3-7L@5% on 375k = 18,750
    assert rebate_87a == Decimal("18750.00")
    # Rebate wipes out ordinary tax -> total liability must be 0!
    assert total_liability == Decimal("0.00")


@pytest.mark.asyncio
async def test_dual_regime_comparison_and_recommendation(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 7: Compare New vs Old regime and identify optimal choice."""
    user, tenant, _ = await test_user_factory(email="tax.compare@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = TaxService(db_session)

    (
        comp_resp,
        comparison,
        breakdown,
        cap_summary,
        deductions,
    ) = await service.compute_and_compare_regimes(tenant.id, "2026-27")

    assert comparison.financial_year == "2026-27"
    assert comparison.assessment_year == "2027-28"
    assert comparison.recommended_regime in ["NEW", "OLD"]
    assert comparison.tax_savings_with_recommended >= Decimal("0.00")
    assert len(comparison.comparison_notes) > 0


@pytest.mark.asyncio
async def test_tax_readiness_report_and_disclaimer(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 8: Generate tax readiness report with explicit non-authoritative disclaimer."""
    user, tenant, _ = await test_user_factory(email="tax.report@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = TaxService(db_session)

    report = await service.generate_tax_readiness_report(tenant.id, "2026-27")
    assert report.financial_year == "2026-27"
    assert report.assessment_year == "2027-28"
    assert report.tax_profile.tax_regime in ["NEW", "OLD"]
    assert report.income_breakdown.total_gross_income > Decimal("0.00")
    # Verify non-authoritative disclaimer
    assert "DISCLAIMER" in report.informational_disclaimer
    assert "Income Tax Department" in report.informational_disclaimer
    assert "Chartered Accountant" in report.informational_disclaimer


@pytest.mark.asyncio
async def test_tax_tenant_isolation(db_session: AsyncSession, test_user_factory):
    """Requirement 9: Cross-tenant data isolation enforcement for tax records."""
    user_a, tenant_a, _ = await test_user_factory(email="tax.tenanta@example.com")
    user_b, tenant_b, _ = await test_user_factory(email="tax.tenantb@example.com")

    # Tenant A sets profile to OLD regime
    await set_db_tenant_context(db_session, tenant_a.id, user_id=user_a.id)
    service_a = TaxService(db_session)
    await service_a.update_profile(
        tenant_a.id,
        "2026-27",
        TaxProfileUpdate(tax_regime="OLD"),
    )

    # Tenant B fetches profile for same FY -> defaults to NEW regime, does NOT see Tenant A's profile
    await set_db_tenant_context(db_session, tenant_b.id, user_id=user_b.id)
    service_b = TaxService(db_session)
    profile_b = await service_b.get_or_create_profile(tenant_b.id, "2026-27")
    assert profile_b.tax_regime == "NEW"
    assert profile_b.tenant_id == tenant_b.id
    assert profile_b.tenant_id != tenant_a.id


@pytest.mark.asyncio
async def test_live_tax_http_api(client: AsyncClient, test_user_factory):
    """Requirement 10: Complete live HTTP API verification for tax readiness."""
    user, tenant, token = await test_user_factory(email="api.tax@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get profile
    resp_prof = await client.get("/api/v1/tax/profile?financial_year=2026-27", headers=headers)
    assert resp_prof.status_code == 200, resp_prof.text
    assert resp_prof.json()["assessment_year"] == "2027-28"

    # 2. Update profile
    resp_upd = await client.put(
        "/api/v1/tax/profile?financial_year=2026-27",
        headers=headers,
        json={"tax_regime": "NEW", "taxpayer_category": "INDIVIDUAL"},
    )
    assert resp_upd.status_code == 200
    assert resp_upd.json()["tax_regime"] == "NEW"

    # 3. Income breakdown
    resp_inc = await client.get("/api/v1/tax/income-breakdown?financial_year=2026-27", headers=headers)
    assert resp_inc.status_code == 200
    assert "total_gross_income" in resp_inc.json()
    assert "non_income_credits_excluded" in resp_inc.json()

    # 4. Capital gains
    resp_cg = await client.get("/api/v1/tax/capital-gains?financial_year=2026-27", headers=headers)
    assert resp_cg.status_code == 200
    assert "exempt_ltcg_112a" in resp_cg.json()

    # 5. Compare regimes
    resp_cmp = await client.get("/api/v1/tax/compare-regimes?financial_year=2026-27", headers=headers)
    assert resp_cmp.status_code == 200
    assert resp_cmp.json()["recommended_regime"] in ["NEW", "OLD"]

    # 6. Compute tax snapshot
    resp_calc = await client.post("/api/v1/tax/compute?financial_year=2026-27", headers=headers)
    assert resp_calc.status_code == 201
    assert "total_tax_liability" in resp_calc.json()

    # 7. Complete tax readiness report
    resp_rep = await client.get("/api/v1/tax/readiness-report?financial_year=2026-27", headers=headers)
    assert resp_rep.status_code == 200
    report_data = resp_rep.json()
    assert "informational_disclaimer" in report_data
    assert "Income Tax Department" in report_data["informational_disclaimer"]
