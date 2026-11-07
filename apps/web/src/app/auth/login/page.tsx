'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await apiClient.login({
        email,
        password,
        remember_me: rememberMe,
      });

      if (!res.success) {
        setErrorMessage(res.error?.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      if (res.data?.mfa_required && res.data.mfa_token) {
        // MFA challenge required: persist temporary challenge token and redirect to MFA verification
        sessionStorage.setItem('wealthos_mfa_token', res.data.mfa_token);
        router.push('/auth/mfa');
        return;
      }

      if (res.data?.access_token && res.data.user) {
        await login(res.data.access_token, res.data.user);
        router.push('/dashboard');
      } else {
        setErrorMessage('Authentication completed without token. Please try again.');
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Unable to connect to WealthOS authentication service. Please check your connection.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md py-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20 mb-4">
          W
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Sign in to <span className="text-indigo-400">WealthOS</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Enterprise Multi-Tenant Personal Wealth Intelligence
        </p>
      </div>

      <Card className="bg-[#111827] border-slate-800 p-6 sm:p-8 shadow-2xl">
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Authentication Failed</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Address */}
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-slate-300 mb-1.5">
              Work or Personal Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
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

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="p-1.5 text-slate-400 hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 rounded focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-400">
              Remember this device for 30 days
            </label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="md"
            isLoading={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Register & create workspace
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
