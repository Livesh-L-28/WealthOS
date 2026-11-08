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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E7ECE8]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#17231D] tracking-tight">Financial Document Vault & OCR</h1>
            <Badge variant="positive" size="sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
              MinIO S3 Encrypted
            </Badge>
          </div>
          <p className="text-xs text-[#758078] mt-1">
            Automated financial statement parsing, MIME validation, and double-entry reconciliation.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-[#E7ECE8] rounded-2xl p-8 text-center bg-white hover:bg-[#F7F9F7] hover:border-[#16A36A] transition-all flex flex-col items-center justify-center shadow-xs group">
        <div className="p-4 rounded-2xl bg-[#16A36A]/10 text-[#16A36A] border border-[#16A36A]/20 mb-3 group-hover:scale-105 transition-transform">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-[#17231D]">
          Upload Financial Statements, Invoices or Receipts
        </h3>
        <p className="text-xs text-[#758078] mt-1 max-w-md">
          Supported formats: PDF (%PDF-1.x), PNG, JPEG, Excel, CSV up to 50 MB. Files are quarantined in MinIO and processed via asynchronous Celery workers.
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="primary" size="sm" className="gap-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Select File to Upload</span>
          </Button>
        </div>
      </div>

      {/* Processed Documents Table */}
      <Card>
        <CardHeader
          title="Document Repository & Reconciliation State"
          subtitle="Processed statements with confidence scores and mapped general journal entries"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E7ECE8] text-[#758078] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Size & Format</th>
                <th className="py-3 px-4">Upload Timestamp</th>
                <th className="py-3 px-4">Extraction Confidence</th>
                <th className="py-3 px-4">Ledger Reference</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7ECE8]">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#F7F9F7] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#F0F4F1] text-[#16A36A] border border-[#E7ECE8]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-[#17231D]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#758078]">{doc.size} &bull; {doc.mimeType}</td>
                  <td className="py-3 px-4 font-mono text-[#758078]">{doc.uploadDate}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[#E7ECE8] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#16A36A] h-1.5 rounded-full"
                          style={{ width: `${doc.confidence * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-medium text-[#17231D]">
                        {(doc.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {doc.journalRef ? (
                      <span className="text-[#16A36A] font-medium">{doc.journalRef}</span>
                    ) : (
                      <span className="text-[#9BA39D]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={doc.status === 'RECONCILED' ? 'positive' : 'warning'}
                      size="sm"
                    >
                      {doc.status}
                    </Badge>
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
