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
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  uploadDate: string;
  status: 'RECONCILED' | 'EXTRACTED' | 'QUARANTINED';
  confidence: number;
  journalRef?: string;
}

const DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    name: 'HDFC_Bank_Statement_Oct2026.pdf',
    mimeType: 'application/pdf',
    size: '1.4 MB',
    uploadDate: '2026-11-07 14:22',
    status: 'RECONCILED',
    confidence: 0.98,
    journalRef: 'JE-2026-1107-001',
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
  },
  {
    id: 'doc-3',
    name: 'AWS_Cloud_Hosting_Invoice_Nov.pdf',
    mimeType: 'application/pdf',
    size: '420 KB',
    uploadDate: '2026-11-05 18:40',
    status: 'EXTRACTED',
    confidence: 0.94,
  },
];

export default function DocumentsPage() {
  const [documents] = useState<DocumentItem[]>(DOCUMENTS);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Universal Document Vault & OCR</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated financial statement parsing, MIME validation, and double-entry reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
            MinIO Quarantine Pipeline
          </Badge>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-800 rounded-lg p-8 text-center bg-slate-900/30 hover:bg-slate-900/60 transition-colors flex flex-col items-center justify-center">
        <div className="p-4 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-900/50 mb-3">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          Upload Financial Statements, Invoices or Receipts
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Supported formats: PDF (%PDF-1.x), PNG, JPEG, Excel, CSV up to 50 MB. Files are quarantined and verified before promotion.
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="primary" size="sm" className="gap-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Select File</span>
          </Button>
        </div>
      </div>

      {/* Documents Ledger Table */}
      <Card>
        <CardHeader
          title="Ingested Documents"
          subtitle="Audit-logged files with OCR extraction confidence and reconciliation status"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Document Name</th>
                <th className="px-4 py-3">Type & Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">OCR Confidence</th>
                <th className="px-4 py-3">Processing Status</th>
                <th className="px-4 py-3 text-right">Journal Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span className="font-medium text-slate-200">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {doc.mimeType} ({doc.size})
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{doc.uploadDate}</td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                    {(doc.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        doc.status === 'RECONCILED'
                          ? 'positive'
                          : doc.status === 'EXTRACTED'
                          ? 'brand'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-indigo-400">
                    {doc.journalRef || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

