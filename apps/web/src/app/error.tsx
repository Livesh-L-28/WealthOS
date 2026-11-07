'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console without leaking user state
    console.error('WealthOS client error boundary triggered:', error.message);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-bold text-slate-100">Application Error Encountered</h2>
      <p className="text-xs text-slate-400 max-w-md mt-2 mb-6">
        An unexpected client error occurred while rendering this view. Financial records remain protected.
      </p>
      <Button variant="secondary" size="md" onClick={() => reset()} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        <span>Try Again</span>
      </Button>
    </div>
  );
}

