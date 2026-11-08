"""WealthOS Universal Financial Document Intelligence Repository."""

import uuid
from typing import Sequence

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.documents.models import (
    DocumentApprovalEvent,
    DocumentExtraction,
    FinancialDocument,
)


class DocumentRepository:
    """Repository handling document entities, extractions, and approval audit logs."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_document(self, doc: FinancialDocument) -> FinancialDocument:
        """Persist a new financial document."""
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def get_document(
        self, tenant_id: uuid.UUID, document_id: uuid.UUID
    ) -> FinancialDocument | None:
        """Fetch document by ID with tenant isolation."""
        stmt = select(FinancialDocument).where(
            FinancialDocument.tenant_id == tenant_id,
            FinancialDocument.id == document_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_document_by_hash(
        self, tenant_id: uuid.UUID, file_hash: str
    ) -> FinancialDocument | None:
        """Check for existing duplicate document in tenant."""
        stmt = select(FinancialDocument).where(
            FinancialDocument.tenant_id == tenant_id,
            FinancialDocument.file_hash == file_hash,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_documents(
        self,
        tenant_id: uuid.UUID,
        status: str | None = None,
        doc_type: str | None = None,
    ) -> Sequence[FinancialDocument]:
        """Fetch documents for a tenant with optional filtering."""
        stmt = select(FinancialDocument).where(FinancialDocument.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(FinancialDocument.processing_status == status)
        if doc_type:
            stmt = stmt.where(FinancialDocument.document_type == doc_type)
        stmt = stmt.order_by(desc(FinancialDocument.created_at))
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_document(self, doc: FinancialDocument) -> FinancialDocument:
        """Update document metadata or processing status."""
        await self.session.flush()
        return doc

    async def delete_document(self, doc: FinancialDocument) -> None:
        """Delete a document."""
        await self.session.delete(doc)
        await self.session.flush()

    async def create_extraction(
        self, extraction: DocumentExtraction
    ) -> DocumentExtraction:
        """Persist structured extraction results."""
        self.session.add(extraction)
        await self.session.flush()
        return extraction

    async def get_extraction(
        self, tenant_id: uuid.UUID, extraction_id: uuid.UUID
    ) -> DocumentExtraction | None:
        """Fetch an extraction by ID."""
        stmt = select(DocumentExtraction).where(
            DocumentExtraction.tenant_id == tenant_id,
            DocumentExtraction.id == extraction_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_extractions_for_document(
        self, tenant_id: uuid.UUID, document_id: uuid.UUID
    ) -> Sequence[DocumentExtraction]:
        """Fetch all extractions for a given document."""
        stmt = (
            select(DocumentExtraction)
            .where(
                DocumentExtraction.tenant_id == tenant_id,
                DocumentExtraction.document_id == document_id,
            )
            .order_by(desc(DocumentExtraction.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_extraction(
        self, extraction: DocumentExtraction
    ) -> DocumentExtraction:
        """Update extraction validation or approval status."""
        await self.session.flush()
        return extraction

    async def create_approval_event(
        self, event: DocumentApprovalEvent
    ) -> DocumentApprovalEvent:
        """Persist an audit event for approval, rejection, or posting."""
        self.session.add(event)
        await self.session.flush()
        return event

    async def list_approval_events(
        self, tenant_id: uuid.UUID, document_id: uuid.UUID
    ) -> Sequence[DocumentApprovalEvent]:
        """Fetch audit log for a document."""
        stmt = (
            select(DocumentApprovalEvent)
            .where(
                DocumentApprovalEvent.tenant_id == tenant_id,
                DocumentApprovalEvent.document_id == document_id,
            )
            .order_by(DocumentApprovalEvent.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
