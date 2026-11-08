"""WealthOS India Tax Readiness Pydantic Schemas."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TaxProfileBase(BaseModel):
    financial_year: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="e.g. 2026-27")
    tax_regime: str = Field(default="NEW", description="'NEW' or 'OLD'")
    taxpayer_category: str = Field(default="INDIVIDUAL", description="'INDIVIDUAL', 'SENIOR_CITIZEN', 'SUPER_SENIOR'")
    residential_status: str = Field(default="RESIDENT", description="'RESIDENT' or 'NRI'")


class TaxProfileCreate(TaxProfileBase):
    pass


class TaxProfileUpdate(BaseModel):
    tax_regime: str | None = None
    taxpayer_category: str | None = None
    residential_status: str | None = None


class TaxProfileResponse(TaxProfileBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    assessment_year: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HeadOfIncomeBreakdown(BaseModel):
    salary_income: Decimal = Decimal("0.0000")
    house_property_income: Decimal = Decimal("0.0000")
    pgbp_income: Decimal = Decimal("0.0000")
    capital_gains_stcg: Decimal = Decimal("0.0000")
    capital_gains_ltcg: Decimal = Decimal("0.0000")
    other_sources_income: Decimal = Decimal("0.0000")
    total_gross_income: Decimal = Decimal("0.0000")
    non_income_credits_excluded: Decimal = Decimal("0.0000")


class CapitalGainsSummary(BaseModel):
    equity_stcg: Decimal = Decimal("0.0000")
    equity_ltcg: Decimal = Decimal("0.0000")
    debt_and_other_stcg: Decimal = Decimal("0.0000")
    other_ltcg: Decimal = Decimal("0.0000")
    total_stcg: Decimal = Decimal("0.0000")
    total_ltcg: Decimal = Decimal("0.0000")
    exempt_ltcg_112a: Decimal = Decimal("0.0000")
    taxable_ltcg: Decimal = Decimal("0.0000")
    total_taxable_capital_gains: Decimal = Decimal("0.0000")


class DeductionsSummary(BaseModel):
    standard_deduction: Decimal = Decimal("0.0000")
    section_80c: Decimal = Decimal("0.0000")
    section_80d: Decimal = Decimal("0.0000")
    section_80ccd_1b: Decimal = Decimal("0.0000")
    section_80tta: Decimal = Decimal("0.0000")
    section_24b: Decimal = Decimal("0.0000")
    total_deductions: Decimal = Decimal("0.0000")


class TaxComputationResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    profile_id: uuid.UUID
    financial_year: str
    assessment_year: str
    tax_regime: str
    rule_version: str
    gross_total_income: Decimal
    total_deductions: Decimal
    taxable_income: Decimal
    tax_on_income: Decimal
    rebate_87a: Decimal
    surcharge: Decimal
    cess: Decimal
    total_tax_liability: Decimal
    tds_credits: Decimal
    net_tax_payable: Decimal
    estimated_refund: Decimal
    computation_breakdown: dict[str, Any]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RegimeComparisonResponse(BaseModel):
    financial_year: str
    assessment_year: str
    new_regime_tax: Decimal
    old_regime_tax: Decimal
    tax_savings_with_recommended: Decimal
    recommended_regime: str
    comparison_notes: list[str]


class TaxReadinessReportResponse(BaseModel):
    tenant_id: uuid.UUID
    financial_year: str
    assessment_year: str
    generated_at: datetime
    tax_profile: TaxProfileResponse
    income_breakdown: HeadOfIncomeBreakdown
    capital_gains_summary: CapitalGainsSummary
    deductions_summary: DeductionsSummary
    active_computation: TaxComputationResponse
    regime_comparison: RegimeComparisonResponse
    informational_disclaimer: str
