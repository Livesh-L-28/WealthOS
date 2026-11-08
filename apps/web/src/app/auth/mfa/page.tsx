'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, KeyRound, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function MfaChallengePage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isUsingRecovery, setIsUsingRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('wealthos_mfa_token');
    if (!token) {
      router.push('/auth/login');
    } else {
      setMfaToken(token);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const payload = isUsingRecovery
        ? { mfa_token: mfaToken, recovery_code: recoveryCode.trim() }
        : { mfa_token: mfaToken, code: code.trim() };

      const res = await apiClient.verifyMfa(payload);

      if (!res.success) {
        setErrorMessage(res.error?.message || 'Invalid authentication code. Please try again.');
        setIsLoading(false);
        return;
      }

      if (res.data?.access_token && res.data.user) {
        sessionStorage.removeItem('wealthos_mfa_token');
        await login(res.data.access_token, res.data.user);
        router.push('/dashboard');
      } else {
        setErrorMessage('Verification failed to produce valid tokens.');
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Communication error with authentication cluster.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md py-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#16A36A] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20 mb-3">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#17231D]">
          Two-Factor Verification
        </h1>
        <p className="text-xs text-[#758078] mt-1">
          High-assurance authentication required for this account
        </p>
      </div>

      <Card className="bg-white border-[#E7ECE8] p-6 sm:p-8 shadow-2xl">
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isUsingRecovery ? (
            <div>
              <label htmlFor="mfa-code" className="block text-xs font-medium text-[#4A554E] mb-1.5 text-center">
                Enter 6-Digit Authenticator Code
              </label>
              <div className="flex justify-center my-2">
                <input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="w-48 bg-[#F7F9F7] border border-[#E7ECE8] focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] rounded-lg py-2.5 text-center font-mono text-2xl tracking-[0.4em] text-[#16A36A] focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[11px] text-[#758078] text-center mt-2">
                Open Google Authenticator, Authy, or 1Password to view your current temporary code.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="recovery-code" className="block text-xs font-medium text-[#4A554E] mb-1.5">
                Emergency Backup Recovery Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="recovery-code"
                  type="text"
                  autoFocus
                  required
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="XXXX-XXXX-XX"
                  className="w-full bg-[#F7F9F7] border border-[#E7ECE8] rounded-md pl-9 pr-4 py-2.5 text-xs font-mono text-[#17231D] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A] uppercase tracking-widest transition-colors"
                />
              </div>
              <p className="text-[11px] text-amber-300/80 mt-2">
                Recovery codes are single-use. Using this code will permanently consume it.
              </p>
            </div>
          )}

          <Button
            type="submit"
            size="md"
            disabled={(!isUsingRecovery && code.length !== 6) || (isUsingRecovery && !recoveryCode.trim())}
            isLoading={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
          >
            <span>Verify & Authenticate</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setIsUsingRecovery(!isUsingRecovery);
                setErrorMessage(null);
              }}
              className="text-xs text-[#16A36A] hover:text-[#087A50] transition-colors"
            >
              {isUsingRecovery ? '← Use Authenticator App Code' : 'Lost device? Use emergency recovery code'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E7ECE8] text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#758078] hover:text-[#17231D] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel and Return to Sign In</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
