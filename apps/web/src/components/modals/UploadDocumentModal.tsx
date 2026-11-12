'use client';

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  FileSpreadsheet,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface ExtractedDocumentItem {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  uploadDate: string;
  status: 'RECONCILED' | 'EXTRACTED' | 'QUARANTINED';
  confidence: number;
  journalRef?: string;
}

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentAdded?: (doc: ExtractedDocumentItem) => void;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  onDocumentAdded,
}: UploadDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PARSING' | 'REVIEW' | 'COMPLETE'>('IDLE');
  const [simulatedEntries, setSimulatedEntries] = useState<
    { date: string; description: string; amount: number; type: 'DEBIT' | 'CREDIT' }[]
  >([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    // Validate size (max 50 MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File exceeds 50 MB limit. Please select a smaller statement.');
      return;
    }
    setErrorMsg('');
    setSelectedFile(file);
    startUploadPipeline(file);
  };

  const startUploadPipeline = (file: File) => {
    setStage('UPLOADING');
    setUploadProgress(25);

    setTimeout(() => {
      setUploadProgress(65);
      setStage('PARSING');

      setTimeout(() => {
        setUploadProgress(100);
        setSimulatedEntries([
          {
            date: '2026-11-06',
            description: 'Monthly Cloud Infrastructure - AWS APAC',
            amount: 14250.0,
            type: 'DEBIT',
          },
          {
            date: '2026-11-04',
            description: 'Client Advisory Retainer Inflow - TechCorp',
            amount: 180000.0,
            type: 'CREDIT',
          },
        ]);
        setStage('REVIEW');
      }, 700);
    }, 600);
  };

  const handleApproveAndPost = () => {
    setStage('COMPLETE');
    const newDoc: ExtractedDocumentItem = {
      id: `doc-${Date.now()}`,
      name: selectedFile?.name || 'Bank_Statement_Nov2026.pdf',
      mimeType: selectedFile?.type || 'application/pdf',
      size: `${((selectedFile?.size || 1024 * 1024) / (1024 * 1024)).toFixed(1)} MB`,
      uploadDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'RECONCILED',
      confidence: 0.98,
      journalRef: `JE-2026-AUTO-${Math.floor(100 + Math.random() * 900)}`,
    };

    if (onDocumentAdded) {
      onDocumentAdded(newDoc);
    }

    setTimeout(() => {
      setStage('IDLE');
      setSelectedFile(null);
      setUploadProgress(0);
      onClose();
    }, 1000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-doc-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 id="upload-doc-title" className="text-sm font-bold text-[#0F172A]">
                Upload Financial Document
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Statement parsing, OCR extraction & double-entry reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center gap-2 text-xs text-[#EF4444]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {stage === 'COMPLETE' && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#10B981]/15 text-[#10B981] mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0F172A]">Statements Reconciled!</h4>
              <p className="text-xs text-[#64748B]">
                Extracted transactions have been verified and posted to the general journal.
              </p>
            </div>
          )}

          {stage === 'IDLE' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-8 text-center bg-white hover:bg-[#F8FAFC] hover:border-[#10B981] transition-all flex flex-col items-center justify-center cursor-pointer group"
              onClick={() => document.getElementById('modal-file-upload')?.click()}
            >
              <input
                id="modal-file-upload"
                type="file"
                accept=".pdf,.png,.jpeg,.jpg,.xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />
              <div className="p-4 rounded-2xl bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-[#0F172A]">
                Drop file here or browse to upload
              </h4>
              <p className="text-[11px] text-[#64748B] mt-1 max-w-sm">
                Supported formats: PDF (%PDF-1.x), Excel (.xlsx), CSV, PNG, JPEG (up to 50 MB).
              </p>
              <div className="mt-3 px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-[11px] text-[#0F172A] font-medium">
                Choose File
              </div>
            </div>
          )}

          {(stage === 'UPLOADING' || stage === 'PARSING') && (
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[#10B981]/15 text-[#10B981] mx-auto flex items-center justify-center animate-spin">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">
                  {stage === 'UPLOADING' ? 'Uploading to MinIO Storage...' : 'OCR Parsing & Reconciliation...'}
                </h4>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {selectedFile?.name} ({((selectedFile?.size || 0) / 1024).toFixed(0)} KB)
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#10B981] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-[#64748B]">
                <span>MIME Header Validated</span>
                <span>Worker Parsing: {uploadProgress}%</span>
              </div>
            </div>
          )}

          {stage === 'REVIEW' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <div>
                    <p className="text-xs font-bold text-[#059669]">Extraction Successful (98% Confidence)</p>
                    <p className="text-[10px] text-[#64748B]">{selectedFile?.name}</p>
                  </div>
                </div>
                <Badge variant="positive" size="sm">
                  Review Required
                </Badge>
              </div>

              <p className="text-xs text-[#64748B]">
                The following transactions were extracted from your statement. Confirm below to post them to the ledger.
              </p>

              {/* Extracted table preview */}
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {simulatedEntries.map((entry, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="py-2 px-3 font-mono text-[11px] text-[#64748B]">
                          {entry.date}
                        </td>
                        <td className="py-2 px-3 font-medium text-[#0F172A]">
                          {entry.description}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-semibold ${
                            entry.type === 'DEBIT' ? 'text-[#EF4444]' : 'text-[#10B981]'
                          }`}
                        >
                          {entry.type === 'DEBIT' ? '-' : '+'}₹
                          {entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Security note */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2.5 text-[11px] text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] flex-shrink-0" />
            <span>
              Documents are quarantined in isolated MinIO buckets and never shared with external third parties.
            </span>
          </div>
        </div>

        {/* Footer */}
        {stage !== 'COMPLETE' && (
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStage('IDLE');
                setSelectedFile(null);
                onClose();
              }}
            >
              Cancel
            </Button>

            {stage === 'REVIEW' && (
              <Button variant="primary" size="sm" onClick={handleApproveAndPost} className="gap-1.5">
                <Check className="w-4 h-4" />
                <span>Approve & Post to Ledger</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
