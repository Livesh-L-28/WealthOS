import React from 'react';
import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
        <FileQuestion className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-bold text-slate-100">Page Not Found</h2>
      <p className="text-xs text-slate-400 max-w-md mt-2 mb-6">
        The requested resource or financial statement ledger does not exist in this workspace.
      </p>
      <Link href="/dashboard">
        <Button variant="secondary" size="md" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Button>
      </Link>
    </div>
  );
}
