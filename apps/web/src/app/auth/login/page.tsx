'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, Smartphone, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Mode: OTP or Password
  const [authMethod, setAuthMethod] = useState<'OTP' | 'PASSWORD'>('OTP');

  // OTP State
  const [otpStep, setOtpStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Password State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanId = identifier.trim();
    if (!cleanId || cleanId.length < 3) {
      setErrorMessage('Please enter a valid mobile number or email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await (apiClient as any).sendOtp({ identifier: cleanId });
      if (res.success) {
        setOtpStep('VERIFY');
        setDebugOtp((res as any).debug_otp || (res as any).data?.debug_otp || null);
        setResendTimer(10);
      } else {
        setErrorMessage(res.error?.message || 'Failed to dispatch verification code.');
      }
    } catch {
      setErrorMessage('Unable to connect to WealthOS authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 4) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await (apiClient as any).verifyOtp({
        identifier: identifier.trim(),
        otp: cleanCode,
      });

      if (!res.success) {
        setErrorMessage(res.error?.message || 'Invalid or expired verification code.');
        setIsLoading(false);
        return;
      }

      if (res.data?.access_token && res.data.user) {
        await login(res.data.access_token, res.data.user);
        router.push('/dashboard');
      } else {
        setErrorMessage('Verification completed without session token. Please try again.');
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Unable to connect to WealthOS authentication service.');
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
        {/* Method Switcher Tabs */}
        <div className="flex p-1 bg-[#F1F5F9] rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('OTP');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'OTP'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile / OTP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('PASSWORD');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'PASSWORD'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-3 text-xs text-[#B91C1C]"
          >
            <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Authentication Notice</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {authMethod === 'OTP' ? (
          /* OTP Form */
          otpStep === 'REQUEST' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label htmlFor="otp-identifier" className="block text-xs font-medium text-[#0F172A] mb-1.5">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="otp-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="+91 98765 43210 or user@example.com"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-colors"
                  />
                </div>
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  We will send a 6-digit one-time password to verify your account or automatically provision a new workspace.
                </p>
              </div>

              <Button
                type="submit"
                size="md"
                isLoading={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
              >
                <span>Send Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="otp-code" className="block text-xs font-medium text-[#0F172A]">
                    Enter 6-Digit Code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('REQUEST');
                      setOtpCode('');
                    }}
                    className="text-xs text-[#10B981] hover:text-[#059669] transition-colors font-medium"
                  >
                    Change Number/Email
                  </button>
                </div>

                <p className="text-[11px] text-[#64748B] mb-3">
                  Code sent to <span className="font-semibold text-[#0F172A]">{identifier}</span>
                </p>

                {debugOtp && (
                  <div className="mb-3 p-2.5 rounded-lg bg-[#EFF6FF] border border-[#3B82F6]/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#1D4ED8] font-bold block text-[10px]">VERIFICATION CODE:</span>
                      <span className="font-mono font-extrabold text-[#1E3A8A] text-sm tracking-widest">{debugOtp}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpCode(debugOtp)}
                      className="px-2.5 py-1 bg-[#2563EB] text-white rounded text-[11px] font-bold hover:bg-[#1D4ED8]"
                    >
                      Fill Code
                    </button>
                  </div>
                )}

                <input
                  id="otp-code"
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2.5 text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-colors"
                />
              </div>

              <Button
                type="submit"
                size="md"
                isLoading={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
              >
                <span>Verify & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="text-center pt-2">
                {resendTimer > 0 ? (
                  <span className="text-xs text-[#94A3B8]">Resend code in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-[#10B981] hover:text-[#059669] font-medium"
                  >
                    Resend Verification Code
                  </button>
                )}
              </div>
            </form>
          )
        ) : (
          /* Password Form */
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
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
        )}

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
