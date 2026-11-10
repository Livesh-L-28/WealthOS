"""WealthOS India Tax Readiness Domain."""

from app.domains.tax.models import TaxComputation, TaxProfile
from app.domains.tax.router import router as tax_router
from app.domains.tax.service import TaxService

__all__ = [
    "TaxComputation",
    "TaxProfile",
    "TaxService",
    "tax_router",
]
