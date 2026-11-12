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
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center font-bold text-xl text-white shadow-md mb-4">
          W
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Sign in to <span className="text-[#10B981]">WealthOS</span>
        </h1>
        <p className="text-xs text-[#475569] mt-1">
          Enterprise Multi-Tenant Personal Wealth Intelligence
        </p>
      </div>

      <Card className="bg-white border-[#E2E8F0] p-6 sm:p-8 shadow-sm rounded-2xl">
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-3 text-xs text-[#B91C1C]"
          >
            <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Authentication Failed</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Address */}
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-[#0F172A] mb-1.5">
              Work or Personal Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-[#0F172A]">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[#10B981] hover:text-[#059669] transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-10 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-colors"
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

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded bg-[#F8FAFC] border-[#E2E8F0] text-[#10B981] focus:ring-[#10B981]"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs text-[#475569]">
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

          {/* Quick Demo Access for Preview & Testing */}
          <button
            type="button"
            onClick={async () => {
              setIsLoading(true);
              const demoUser = {
                id: 'usr-demo-01',
                email: 'livesh.j@wealthos.internal',
                first_name: 'Livesh',
                last_name: 'J',
                is_active: true,
                status: 'active' as const,
                is_email_verified: true,
                is_mfa_enabled: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                roles: ['OWNER'],
              };
              document.cookie = 'wealthos_access_token=demo-token; path=/; max-age=86400';
              await login('demo-token', demoUser);
              router.push('/dashboard');
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#10B981]/40 bg-[#E8F5EE] hover:bg-[#D4EEDB] text-[#059669] text-xs font-bold transition shadow-xs"
          >
            <span>⚡ Instant Preview Sign In (Livesh J)</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#E2E8F0] text-center">
          <p className="text-xs text-[#475569]">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-[#10B981] hover:text-[#059669] transition-colors"
            >
              Register & create workspace
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
