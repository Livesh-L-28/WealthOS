'use client';

import React, { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // NIST SP 800-63B policy validation
  const passwordCriteria = useMemo(() => {
    return [
      { id: 'length', label: 'At least 12 characters', valid: password.length >= 12 },
      { id: 'upper', label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
      { id: 'lower', label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(password) },
      { id: 'digit', label: 'At least one number (0-9)', valid: /[0-9]/.test(password) },
      { id: 'special', label: 'At least one special symbol (!@#$%...)', valid: /[^A-Za-z0-9]/.test(password) },
    ];
  }, [password]);

  const isPasswordValid = passwordCriteria.every((c) => c.valid);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Missing password reset token in URL.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password does not satisfy NIST security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.resetPassword({
        token,
        new_password: password,
      });

      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.error?.message || 'Password reset token is invalid or has expired.');
      }
    } catch {
      setErrorMessage('Service failure during password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md py-8">
        <Card className="bg-white border-[#E2E8F0] p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">Password Updated</h2>
          <p className="text-xs text-[#475569] mt-2 leading-relaxed">
            Your master credentials have been securely updated with Argon2id hashing. All existing active sessions have been invalidated.
          </p>
          <div className="mt-6">
            <Link href="/auth/login">
              <Button size="md" className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold">
                <span>Sign In with New Password</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md py-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#10B981] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20 mb-3">
          W
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Set New Password
        </h1>
        <p className="text-xs text-[#475569] mt-1">
          Create a secure master password meeting NIST requirements
        </p>
      </div>

      <Card className="bg-white border-[#E2E8F0] p-6 sm:p-8 shadow-2xl">
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

        {!token && (
          <div className="mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
            Warning: No reset token detected in the URL query string.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-new-password" className="block text-xs font-medium text-[#4A554E] mb-1.5">
              New Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-md pl-9 pr-10 py-2.5 text-xs text-[#0F172A] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="p-1.5 text-[#475569] hover:text-[#0F172A] absolute right-2.5 top-1/2 -translate-y-1/2 rounded focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reset-confirm-password" className="block text-xs font-medium text-[#4A554E] mb-1.5">
              Confirm Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-md pl-9 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] transition-colors"
              />
            </div>
          </div>

          {/* Criteria Checklist */}
          <div className="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] mb-1">
              NIST SP 800-63B Requirements:
            </p>
            {passwordCriteria.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[11px]">
                {c.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
                )}
                <span className={c.valid ? 'text-emerald-300' : 'text-[#475569]'}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            size="md"
            disabled={!isPasswordValid || !passwordsMatch || !token}
            isLoading={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold mt-4"
          >
            <span>Update Master Password</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-5 pt-5 border-t border-[#E2E8F0] text-center">
          <Link
            href="/auth/login"
            className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors"
          >
            Cancel and Return to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-xs text-[#475569]">Loading reset interface...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
