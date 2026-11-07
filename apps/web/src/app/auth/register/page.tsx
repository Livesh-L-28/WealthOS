'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, User, Building, AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Default workspace preview
  const defaultWorkspaceName = useMemo(() => {
    if (firstName.trim()) {
      return `${firstName.trim()}'s Wealth Space`;
    }
    return 'Personal Wealth Space';
  }, [firstName]);

  // NIST SP 800-63B password policy checks
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password security criteria before registering.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        personal_workspace_name: workspaceName.trim() || defaultWorkspaceName,
      });

      if (!res.success) {
        setErrorMessage(res.error?.message || 'Registration failed. Please check the provided details.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
    } catch {
      setErrorMessage('Unable to connect to registration service. Please verify your connection.');
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md py-8">
        <Card className="bg-[#111827] border-slate-800 p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Verify your email address</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            We have created your personal workspace and dispatched a cryptographic verification link to{' '}
            <span className="text-slate-200 font-medium">{email}</span>.
          </p>
          <div className="mt-6 p-3 rounded-lg bg-slate-900 border border-slate-800 text-left text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Next Steps:</p>
            <p>1. Check your email inbox for the verification token link.</p>
            <p>2. Verify your email to activate all platform capabilities.</p>
            <p>3. Sign in to your newly provisioned workspace.</p>
          </div>
          <div className="mt-6">
            <Link href="/auth/login">
              <Button size="md" className="w-full py-2.5 text-xs font-semibold">
                Proceed to Sign In
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
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20 mb-3">
          W
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Create WealthOS Account
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Provision your private, multi-tenant financial workspace
        </p>
      </div>

      <Card className="bg-[#111827] border-slate-800 p-6 sm:p-8 shadow-2xl">
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Registration Error</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-first-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                First Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Livesh"
                  className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-last-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                Last Name
              </label>
              <input
                id="reg-last-name"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="L"
                className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="block text-xs font-medium text-slate-300 mb-1.5">
              Work or Personal Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="livesh@example.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Workspace Name */}
          <div>
            <label htmlFor="reg-workspace" className="block text-xs font-medium text-slate-300 mb-1.5">
              Initial Workspace Name
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-workspace"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder={defaultWorkspaceName}
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Will be provisioned as your primary isolated tenant ({workspaceName.trim() || defaultWorkspaceName}).
            </p>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="block text-xs font-medium text-slate-300 mb-1.5">
              Argon2id Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-10 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
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

            {/* NIST Policy Checklist */}
            <div className="mt-3 p-3 rounded bg-slate-900/80 border border-slate-800/80 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                NIST SP 800-63B Requirements:
              </p>
              {passwordCriteria.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-[11px]">
                  {c.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  )}
                  <span className={c.valid ? 'text-emerald-300' : 'text-slate-400'}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="md"
            isLoading={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold mt-4"
          >
            <span>Create Enterprise Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
