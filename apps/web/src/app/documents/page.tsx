'use client';

import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  FileCheck2,
  ArrowRight,
  Database,
  Sparkles,
  Check,
  X,
  History,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import {
  UploadDocumentModal,
  ExtractedDocumentItem,
} from '@/components/modals/UploadDocumentModal';

interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  uploadDate: string;
  status: 'RECONCILED' | 'EXTRACTED' | 'QUARANTINED' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'POSTED' | 'REJECTED';
  confidence: number;
  journalRef?: string;
  arithmeticCheck?: 'VALIDATED' | 'ARITHMETIC_MISMATCH';
}

const DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    name: 'HDFC_Bank_Statement_Oct2026.pdf',
    mimeType: 'application/pdf',
    size: '1.4 MB',
    uploadDate: '2026-11-07 14:22',
    status: 'POSTED',
    confidence: 0.98,
    journalRef: 'JE-2026-1107-001',
    arithmeticCheck: 'VALIDATED',
  },
  {
    id: 'doc-2',
    name: 'Zerodha_Contract_Note_Q3_2026.pdf',
    mimeType: 'application/pdf',
    size: '850 KB',
    uploadDate: '2026-11-06 09:15',
    status: 'RECONCILED',
    confidence: 0.99,
    journalRef: 'JE-2026-1106-004',
    arithmeticCheck: 'VALIDATED',
  },
  {
    id: 'doc-3',
    name: 'AWS_Cloud_Hosting_Invoice_Nov.pdf',
    mimeType: 'application/pdf',
    size: '420 KB',
    uploadDate: '2026-11-05 18:40',
    status: 'READY_FOR_APPROVAL',
    confidence: 0.94,
    arithmeticCheck: 'VALIDATED',
  },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>(DOCUMENTS);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; docName: string; action: string; timestamp: string }>>([
    { id: 'log-1', docName: 'HDFC_Bank_Statement_Oct2026.pdf', action: 'APPROVED & POSTED to GL', timestamp: '2026-11-07 14:25' },
    { id: 'log-2', docName: 'Zerodha_Contract_Note_Q3_2026.pdf', action: 'RECONCILED with Demat', timestamp: '2026-11-06 09:20' },
  ]);

  const handleDocumentAdded = (newDoc: ExtractedDocumentItem) => {
    const record: DocumentItem = {
      id: newDoc.id,
      name: newDoc.name,
      mimeType: newDoc.mimeType,
      size: newDoc.size,
      uploadDate: newDoc.uploadDate,
      status: 'READY_FOR_APPROVAL',
      confidence: newDoc.confidence,
      journalRef: newDoc.journalRef,
      arithmeticCheck: 'VALIDATED',
    };
    setDocuments((prev) => [record, ...prev]);
  };

  const handleApprove = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              status: 'POSTED',
              journalRef: `JE-2026-${Date.now().toString().slice(-4)}`,
            }
          : d
      )
    );
    const targetDoc = documents.find((d) => d.id === docId);
    if (targetDoc) {
      setAuditLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          docName: targetDoc.name,
          action: 'APPROVED & POSTED to GL (Double-Entry Balanced)',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        },
        ...prev,
      ]);
    }
  };

  const handleReject = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'REJECTED' } : d))
    );
    const targetDoc = documents.find((d) => d.id === docId);
    if (targetDoc) {
      setAuditLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          docName: targetDoc.name,
          action: 'REJECTED by User Review',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        },
        ...prev,
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Financial Document Vault & OCR</h1>
            <Badge variant="positive" size="sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
              MinIO S3 Encrypted
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Automated financial statement parsing, deterministic arithmetic validation, and human-in-the-loop approval.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onClick={() => setIsUploadModalOpen(true)}
        className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-8 text-center bg-white hover:bg-[#F8FAFC] hover:border-[#10B981] transition-all flex flex-col items-center justify-center shadow-xs group cursor-pointer"
      >
        <div className="p-4 rounded-2xl bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 mb-3 group-hover:scale-105 transition-transform">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-[#0F172A]">
          Upload Financial Statements, Invoices or Receipts
        </h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-md">
          Supported formats: PDF (%PDF-1.x), PNG, JPEG, Excel, CSV up to 50 MB. Files are quarantined in MinIO and processed with deterministic math validation before approval.
        </p>
        <div className="mt-4 flex gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsUploadModalOpen(true);
            }}
            className="gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Select File to Upload</span>
          </Button>
        </div>
      </div>

      {/* Processed Documents Table */}
      <Card>
        <CardHeader
          title="Document Repository & Verification State"
          subtitle="Processed statements with arithmetic invariants, approval controls, and General Ledger mapping"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#475569] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Size & Format</th>
                <th className="py-3 px-4">Arithmetic Check</th>
                <th className="py-3 px-4">Extraction Confidence</th>
                <th className="py-3 px-4">Ledger Reference</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#F1F5F9] text-[#10B981] border border-[#E2E8F0]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-[#0F172A]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#475569]">{doc.size} &bull; {doc.mimeType}</td>
                  <td className="py-3 px-4">
                    <Badge variant="positive" size="sm">
                      <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                      {doc.arithmeticCheck || 'VALIDATED'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#10B981] h-1.5 rounded-full"
                          style={{ width: `${doc.confidence * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-medium text-[#0F172A]">
                        {(doc.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {doc.journalRef ? (
                      <span className="text-[#10B981] font-medium">{doc.journalRef}</span>
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        doc.status === 'POSTED' || doc.status === 'RECONCILED'
                          ? 'positive'
                          : doc.status === 'READY_FOR_APPROVAL'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {doc.status === 'READY_FOR_APPROVAL' ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(doc.id)}
                          className="px-2 py-1 text-[11px] gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Approve & Post
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(doc.id)}
                          className="px-2 py-1 text-[11px] text-[#EF4444] hover:bg-[#FEF2F2]"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#475569] font-medium">Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Human Review Audit Trail */}
      <Card>
        <CardHeader
          title="Human Review & Approval Audit Trail"
          subtitle="Chronological audit events tracking document approvals, overrides, and General Ledger postings"
        />
        <div className="space-y-2.5">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[#10B981]">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">{log.docName}</p>
                  <p className="text-[10px] text-[#10B981] font-medium">{log.action}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#475569]">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentAdded={handleDocumentAdded}
      />
    </div>
  );
}
