'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Laptop,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { UserSession, MfaSetupResponse } from '@wealthos/shared-types';

export default function SecuritySettingsPage() {
  const { user, refreshUser } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // MFA State
  const [mfaSetupData, setMfaSetupData] = useState<MfaSetupResponse | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState<string | null>(null);
  const [mfaErrorMsg, setMfaErrorMsg] = useState<string | null>(null);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // NIST Password Checklist
  const passwordCriteria = useMemo(() => {
    return [
      { id: 'length', label: 'At least 12 characters', valid: newPassword.length >= 12 },
      { id: 'upper', label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
      { id: 'lower', label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
      { id: 'digit', label: 'At least one number (0-9)', valid: /[0-9]/.test(newPassword) },
      { id: 'special', label: 'At least one special symbol (!@#$%...)', valid: /[^A-Za-z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const isPasswordValid = passwordCriteria.every((c) => c.valid);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Load active sessions
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await apiClient.getSessions();
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch {
      setSessionError('Failed to load active sessions.');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!isPasswordValid || !passwordsMatch) {
      setPasswordError('Please ensure password satisfies all NIST criteria and matches confirmation.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiClient.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.success) {
        setPasswordSuccess('Master password changed successfully. All other active sessions have been invalidated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        loadSessions();
      } else {
        setPasswordError(res.error?.message || 'Failed to update master password.');
      }
    } catch {
      setPasswordError('Error connecting to authentication service.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Start MFA Enrollment
  const handleStartMfaSetup = async () => {
    setMfaErrorMsg(null);
    setMfaSuccessMsg(null);
    try {
      const res = await apiClient.setupMfa();
      if (res.success && res.data) {
        setMfaSetupData(res.data);
      } else {
        setMfaErrorMsg(res.error?.message || 'Unable to initiate MFA enrollment.');
      }
    } catch {
      setMfaErrorMsg('Service error during MFA initiation.');
    }
  };

  // Confirm MFA Activation
  const handleActivateMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) return;

    setMfaErrorMsg(null);
    setIsEnrollingMfa(true);
    try {
      const res = await apiClient.activateMfa(mfaCode.trim());
      if (res.success) {
        setMfaSuccessMsg('Two-Factor Authentication is now active on your account.');
        await refreshUser();
      } else {
        setMfaErrorMsg(res.error?.message || 'Invalid verification code. Please check your authenticator.');
      }
    } catch {
      setMfaErrorMsg('Failed to activate MFA.');
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  // Confirm MFA Disable
  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) return;

    setMfaErrorMsg(null);
    try {
      const res = await apiClient.disableMfa(disablePassword);
      if (res.success) {
        setShowDisableModal(false);
        setDisablePassword('');
        setMfaSetupData(null);
        setMfaSuccessMsg('Two-Factor Authentication has been disabled.');
        await refreshUser();
      } else {
        setMfaErrorMsg(res.error?.message || 'Incorrect password.');
      }
    } catch {
      setMfaErrorMsg('Failed to disable MFA.');
    }
  };

  // Revoke single session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await apiClient.revokeSession(sessionId);
      if (res.success) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
      }
    } catch {
      setSessionError('Failed to revoke session.');
    }
  };

  // Revoke all other sessions
  const handleRevokeAllOther = async () => {
    try {
      const res = await apiClient.logoutAll();
      if (res.success) {
        loadSessions();
      }
    } catch {
      setSessionError('Failed to revoke sessions.');
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'codes') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const downloadRecoveryCodes = (codes: string[]) => {
    const element = document.createElement('a');
    const file = new Blob([codes.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'wealthos-recovery-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8">
      {/* 1. Two-Factor Authentication (MFA) */}
      <Card className="bg-[#111827] border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-start gap-3">
            {user?.is_mfa_enabled ? (
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">Two-Factor Authentication (TOTP)</h2>
                {user?.is_mfa_enabled ? (
                  <Badge variant="positive" size="sm">Enabled</Badge>
                ) : (
                  <Badge variant="warning" size="sm">Disabled</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Enforces time-based one-time password (TOTP) verification on every sign-in via Google Authenticator, 1Password, or Authy.
              </p>
            </div>
          </div>

          <div>
            {user?.is_mfa_enabled ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDisableModal(true)}
                className="text-xs"
              >
                Disable 2FA
              </Button>
            ) : (
              !mfaSetupData && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartMfaSetup}
                  className="text-xs"
                >
                  Enable 2FA
                </Button>
              )
            )}
          </div>
        </div>

        {mfaSuccessMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{mfaSuccessMsg}</span>
          </div>
        )}

        {mfaErrorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{mfaErrorMsg}</span>
          </div>
        )}

        {/* MFA Enrollment Workflow */}
        {!user?.is_mfa_enabled && mfaSetupData && (
          <div className="mt-6 pt-4 border-t border-slate-800 space-y-6">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Step 1: Configure Authenticator Application
              </h3>
              <p className="text-xs text-slate-400">
                Scan or enter the Base32 setup key into your authenticator app (e.g., Google Authenticator, Bitwarden, 1Password):
              </p>

              {/* Secret Key Box */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 font-mono text-xs text-indigo-300 select-all">
                  {mfaSetupData.secret_key}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(mfaSetupData.secret_key, 'secret')}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSecret ? 'Copied!' : 'Copy Key'}</span>
                </Button>
              </div>

              {/* Provisioning URI */}
              <div className="text-[11px] text-slate-500 font-mono break-all bg-slate-950/60 p-2 rounded">
                URI: {mfaSetupData.provisioning_uri}
              </div>
            </div>

            {/* Verification Code Input */}
            <form onSubmit={handleActivateMfa} className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Step 2: Verify & Activate
              </h3>
              <p className="text-xs text-slate-400">
                Enter the 6-digit verification code generated by your authenticator app to complete pairing:
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="w-36 bg-slate-950 border border-slate-700 rounded-md py-2 text-center font-mono text-lg tracking-widest text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={mfaCode.length !== 6}
                  isLoading={isEnrollingMfa}
                  className="text-xs"
                >
                  Activate Two-Factor
                </Button>
              </div>
            </form>

            {/* Emergency Recovery Codes */}
            {mfaSetupData.backup_recovery_codes?.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-amber-300">
                      Emergency Backup Recovery Codes
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Store these 10 codes in a password vault. Each code can be used once if you lose device access.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(mfaSetupData.backup_recovery_codes.join('\n'), 'codes')}
                      className="text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCodes ? 'Copied' : 'Copy'}</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadRecoveryCodes(mfaSetupData.backup_recovery_codes)}
                      className="text-xs flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  {mfaSetupData.backup_recovery_codes.map((c, i) => (
                    <div key={i} className="bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-center font-mono text-xs text-amber-200">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Disable 2FA */}
        {showDisableModal && (
          <div className="mt-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-3">
            <h4 className="text-xs font-semibold text-rose-300">
              Confirm Disabling Two-Factor Authentication
            </h4>
            <p className="text-xs text-slate-300">
              Disabling 2FA lowers your account assurance level. Enter your master password to proceed:
            </p>
            <form onSubmit={handleDisableMfa} className="flex gap-3">
              <input
                type="password"
                required
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Current master password"
                className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <Button type="submit" variant="danger" size="sm" className="text-xs">
                Confirm Deactivation
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDisableModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </form>
          </div>
        )}
      </Card>

      {/* 2. Master Password Change */}
      <Card className="bg-[#111827] border-slate-800 p-6">
        <div className="pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">Update Master Password</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Re-hashes your credentials with memory-hard Argon2id (m=64MB, t=3, p=4) and terminates all other active sessions.
          </p>
        </div>

        {passwordSuccess && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="mt-5 space-y-4 max-w-lg">
          <div>
            <label htmlFor="current-pw" className="block text-xs font-medium text-slate-300 mb-1">
              Current Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="current-pw"
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-10 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-slate-400 hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new-pw" className="block text-xs font-medium text-slate-300 mb-1">
              New Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="new-pw"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-pw" className="block text-xs font-medium text-slate-300 mb-1">
              Confirm New Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="confirm-pw"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* NIST Checklist */}
          <div className="p-3 rounded bg-slate-900/80 border border-slate-800/80 space-y-1.5">
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

          <Button
            type="submit"
            size="sm"
            disabled={!isPasswordValid || !passwordsMatch || isChangingPassword}
            isLoading={isChangingPassword}
            className="text-xs"
          >
            Update Password & Rotate Credentials
          </Button>
        </form>
      </Card>

      {/* 3. Active Sessions & Device Management */}
      <Card className="bg-[#111827] border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-100">Active Sessions & Trusted Devices</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              All active authenticated sessions across your browser instances and mobile devices.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeAllOther}
            className="text-xs text-rose-300 hover:text-rose-200 border-rose-900/40 hover:bg-rose-950/20 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Other Devices</span>
          </Button>
        </div>

        {sessionError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{sessionError}</span>
          </div>
        )}

        <div className="mt-4 divide-y divide-slate-800">
          {isLoadingSessions ? (
            <div className="py-6 text-center text-xs text-slate-500">Loading active sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">No active sessions found.</div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 flex-shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">
                        {session.user_agent ? session.user_agent.split(' ')[0] : 'Browser Client'}
                      </span>
                      {session.is_current && (
                        <Badge variant="positive" size="sm">Current Device</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>IP: {session.ip_address || '127.0.0.1'}</span>
                      <span>•</span>
                      <span>Last active: {new Date(session.last_active_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!session.is_current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
                    aria-label="Revoke session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
