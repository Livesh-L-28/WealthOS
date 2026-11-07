"""WealthOS API v1 Router Configuration."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.tenants import router as tenants_router
from app.domains.accounting.router import router as accounting_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router, prefix="/health", tags=["Health & Diagnostics"])
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication & Identity"])
api_v1_router.include_router(tenants_router, prefix="/tenants", tags=["Tenants & Workspaces"])
api_v1_router.include_router(
    accounting_router, prefix="/accounting", tags=["Accounting & Double-Entry Ledger"]
)
