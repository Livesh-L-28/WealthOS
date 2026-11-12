"""WealthOS API v1 Router Configuration."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.tenants import router as tenants_router
from app.domains.accounting.router import router as accounting_router
from app.domains.analytics.api.router import router as analytics_router
from app.domains.budget.router import router as budget_router
from app.domains.cash.router import router as cash_router
from app.domains.copilot.router import router as copilot_router
from app.domains.documents.router import router as documents_router
from app.domains.household.router import router as household_router
from app.domains.integrations.reports_router import reports_router
from app.domains.integrations.router import router as integrations_router
from app.domains.investments.router import router as investments_router
from app.domains.liabilities.router import router as liabilities_router
from app.domains.planning.router import goals_router, planning_router
from app.domains.reconciliation.router import router as reconciliation_router
from app.domains.risk.router import router as risk_router
from app.domains.sync.router import router as sync_router
from app.domains.tax.router import router as tax_router
from app.domains.twin.router import router as twin_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router, prefix="/health", tags=["Health & Diagnostics"])
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication & Identity"])
api_v1_router.include_router(tenants_router, prefix="/tenants", tags=["Tenants & Workspaces"])
api_v1_router.include_router(
    accounting_router, prefix="/accounting", tags=["Accounting & Double-Entry Ledger"]
)
api_v1_router.include_router(
    budget_router, prefix="/budgets", tags=["Budget & Expense Intelligence"]
)
api_v1_router.include_router(
    cash_router, prefix="/cash-management", tags=["Cash Management & Liquidity"]
)
api_v1_router.include_router(
    reconciliation_router, prefix="/reconciliation", tags=["Financial Control & Reconciliation"]
)
api_v1_router.include_router(
    investments_router, prefix="/investments", tags=["Investment Accounting & FIFO Engine"]
)
api_v1_router.include_router(
    liabilities_router, prefix="/liabilities", tags=["Liability & Debt Management"]
)
api_v1_router.include_router(
    documents_router, prefix="/documents", tags=["Universal Financial Document Intelligence"]
)
api_v1_router.include_router(
    goals_router, prefix="/goals", tags=["Financial Goals & Wealth Targets"]
)
api_v1_router.include_router(
    planning_router, prefix="/planning", tags=["Financial Planning & Forecasting"]
)
api_v1_router.include_router(
    tax_router, prefix="/tax", tags=["India Tax Readiness"]
)
api_v1_router.include_router(
    risk_router, prefix="/risk", tags=["Financial Risk Intelligence"]
)
api_v1_router.include_router(
    twin_router, prefix="/financial-twin", tags=["Financial Digital Twin"]
)
api_v1_router.include_router(
    household_router, prefix="/households", tags=["Household Wealth Management"]
)
api_v1_router.include_router(
    integrations_router, prefix="/integrations", tags=["Enterprise Financial Integrations"]
)
api_v1_router.include_router(
    reports_router, prefix="/reports", tags=["Financial Reports & Certified Exports"]
)
api_v1_router.include_router(copilot_router, prefix="/copilot", tags=["AI Financial Copilot"])
api_v1_router.include_router(
    analytics_router, prefix="/analytics", tags=["Financial Analytics & Visualization Engine"]
)
api_v1_router.include_router(
    sync_router, prefix="/sync", tags=["Synchronization & Offline-First Engine"]
)
