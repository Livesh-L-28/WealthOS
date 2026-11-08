"""WealthOS Universal Financial Document Intelligence Domain."""

from app.domains.documents.models import (
    DocumentApprovalEvent,
    DocumentExtraction,
    FinancialDocument,
)
from app.domains.documents.router import router as documents_router
from app.domains.documents.service import DocumentIntelligenceService

__all__ = [
    "DocumentApprovalEvent",
    "DocumentExtraction",
    "DocumentIntelligenceService",
    "FinancialDocument",
    "documents_router",
]

