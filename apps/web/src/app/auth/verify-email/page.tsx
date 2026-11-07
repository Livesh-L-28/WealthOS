'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      return;
    }

    const verifyToken = async () => {
      setStatus('verifying');
      try {
        const res = await apiClient.verifyEmail(token);
        if (res.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(res.error?.message || 'Verification link has expired or is invalid.');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Verification service error. Please try again.');
      }
    };

    verifyToken();
  }, [token]);

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);
    try {
      const res = await apiClient.resendVerification();
      if (res.success) {
        setResendSuccess(true);
      } else {
        setErrorMessage(res.error?.message || 'Failed to dispatch verification email.');
      }
    } catch {
      setErrorMessage('Failed to connect to verification dispatch.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md py-8">
      <Card className="bg-[#111827] border-slate-800 p-8 text-center shadow-2xl">
        {status === 'verifying' && (
          <div className="py-8">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-100">Verifying Email Token</h2>
            <p className="text-xs text-slate-400 mt-2">
              Validating your cryptographic verification signature with WealthOS identity service...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Email Verified Successfully</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your account and primary workspace are fully verified. You may now sign in to access your financial intelligence portal.
            </p>
            <div className="mt-6">
              <Link href="/auth/login">
                <Button size="md" className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold">
                  <span>Sign In to WealthOS</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Verification Failed</h2>
            <p className="text-xs text-rose-300 mt-2 leading-relaxed">
              {errorMessage || 'This email verification token is invalid or has expired.'}
            </p>

            {resendSuccess ? (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                A fresh verification link has been dispatched to your email.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleResend}
                  isLoading={isResending}
                  variant="secondary"
                  size="md"
                  className="w-full text-xs"
                >
                  Resend Verification Email
                </Button>
                <Link href="/auth/login" className="block text-xs text-slate-400 hover:text-slate-200">
                  Return to Sign In
                </Link>
              </div>
            )}
          </div>
        )}

        {status === 'idle' && (
          <div>
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Email Verification Required</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Please click the link sent to your registered inbox to verify your email address.
            </p>
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleResend}
                isLoading={isResending}
                variant="primary"
                size="md"
                className="w-full text-xs"
              >
                Resend Verification Link
              </Button>
              <Link href="/auth/login" className="block text-xs text-slate-400 hover:text-slate-200">
                Return to Sign In
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Loading verification status...</span>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
