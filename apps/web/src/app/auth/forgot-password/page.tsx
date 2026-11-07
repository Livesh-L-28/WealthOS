'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await apiClient.forgotPassword(email);
      if (res.success) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(res.error?.message || 'Unable to process password reset request.');
      }
    } catch {
      setErrorMessage('Service connection failure. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md py-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20 mb-3">
          W
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Reset Password
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Recover access to your WealthOS account and isolated workspace
        </p>
      </div>

      <Card className="bg-[#111827] border-slate-800 p-6 sm:p-8 shadow-2xl">
        {isSubmitted ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-100">Check your inbox</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              If an active WealthOS account is associated with <span className="text-slate-200 font-medium">{email}</span>, you will receive password reset instructions within moments.
            </p>
            <div className="mt-6">
              <Link href="/auth/login">
                <Button variant="secondary" size="md" className="w-full flex items-center justify-center gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
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

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Enter the email address tied to your WealthOS account. We will issue a cryptographic, single-use token valid for 1 hour.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="md"
                isLoading={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
              >
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
