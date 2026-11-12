'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { TenantMember, TenantInvitation } from '@wealthos/shared-types';

const ASSIGNABLE_ROLES = [
  { value: 'admin', label: 'Admin (Full access to assets & members)' },
  { value: 'member', label: 'Member (Read/Write assets, no member mgmt)' },
  { value: 'viewer', label: 'Viewer (Read-only access)' },
];

export default function MembersSettingsPage() {
  const { currentWorkspace, user } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);

  // Transfer ownership modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const isOwner = currentWorkspace?.role?.toLowerCase() === 'owner';
  const canManage = isOwner || currentWorkspace?.role?.toLowerCase() === 'admin';

  const loadData = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setError(null);

    try {
      const [membersRes, invRes] = await Promise.all([
        apiClient.listMembers(currentWorkspace.id),
        apiClient.listInvitations(currentWorkspace.id),
      ]);

      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }
      if (invRes.success && invRes.data) {
        setInvitations(invRes.data);
      }
    } catch {
      setError('Failed to fetch workspace members and invitations.');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Invite member
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail.trim()) return;

    setIsInviting(true);
    setError(null);

    try {
      const res = await apiClient.inviteMember(currentWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (res.success) {
        setShowInviteModal(false);
        setInviteEmail('');
        setNotification(`Invitation dispatched to ${inviteEmail}.`);
        loadData();
      } else {
        setError(res.error?.message || 'Failed to dispatch invitation.');
      }
    } catch {
      setError('Service error sending invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  // Revoke invitation
  const handleRevokeInvitation = async (invitationId: string) => {
    if (!currentWorkspace) return;
    try {
      const res = await apiClient.revokeInvitation(currentWorkspace.id, invitationId);
      if (res.success) {
        setInvitations(invitations.filter((i) => i.id !== invitationId));
        setNotification('Invitation successfully revoked.');
      }
    } catch {
      setError('Failed to revoke invitation.');
    }
  };

  // Update role
  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!currentWorkspace) return;
    try {
      const res = await apiClient.updateMemberRole(currentWorkspace.id, targetUserId, newRole);
      if (res.success) {
        setNotification('Member role updated.');
        loadData();
      } else {
        setError(res.error?.message || 'Failed to update member role.');
      }
    } catch {
      setError('Service failure during role update.');
    }
  };

  // Remove member
  const handleRemoveMember = async (targetUserId: string, name: string) => {
    if (!currentWorkspace) return;
    if (!window.confirm(`Are you sure you want to remove ${name} from this workspace?`)) return;

    try {
      const res = await apiClient.removeMember(currentWorkspace.id, targetUserId);
      if (res.success) {
        setNotification(`Removed ${name} from workspace.`);
        loadData();
      } else {
        setError(res.error?.message || 'Failed to remove member.');
      }
    } catch {
      setError('Service error removing member.');
    }
  };

  // Transfer ownership
  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !newOwnerId || !transferPassword) return;

    setIsTransferring(true);
    setTransferError(null);

    try {
      const res = await apiClient.transferOwnership(currentWorkspace.id, {
        new_owner_user_id: newOwnerId,
        current_password: transferPassword,
      });

      if (res.success) {
        setShowTransferModal(false);
        setTransferPassword('');
        setNotification('Workspace ownership successfully transferred.');
        loadData();
      } else {
        setTransferError(res.error?.message || 'Failed to transfer ownership.');
      }
    } catch {
      setTransferError('Service error during ownership transfer.');
    } finally {
      setIsTransferring(false);
    }
  };

  const getRoleBadgeVariant = (roles: string[]) => {
    if (roles.includes('owner')) return 'positive';
    if (roles.includes('admin')) return 'brand';
    return 'neutral';
  };

  const getRoleIcon = (roles: string[]) => {
    if (roles.includes('owner')) return <Crown className="w-3.5 h-3.5 text-amber-400" />;
    if (roles.includes('admin')) return <Shield className="w-3.5 h-3.5 text-[#10B981]" />;
    return <Eye className="w-3.5 h-3.5 text-[#475569]" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              {currentWorkspace ? currentWorkspace.name : 'Workspace'} Collaborators
            </h2>
            <Badge variant="neutral" size="sm">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </Badge>
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Control RBAC permissions and team access for this partitioned tenant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && members.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowTransferModal(true);
                setTransferError(null);
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Transfer Ownership</span>
            </Button>
          )}

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowInviteModal(true);
                setError(null);
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Collaborator</span>
            </Button>
          )}
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Members Table */}
      <Card className="bg-white border-[#E2E8F0] overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0]">
          <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
            Active Members
          </h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#64748B]">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">No active members found.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {members.map((m) => {
              const isSelf = m.user_id === user?.id;
              const isTargetOwner = m.roles.includes('owner');
              return (
                <div key={m.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center font-medium text-xs text-[#0F172A] flex-shrink-0">
                      {m.first_name?.[0] || m.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-semibold text-[#0F172A] truncate">
                          {m.first_name} {m.last_name}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-[#10B981] font-mono">(You)</span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#475569] truncate block">{m.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Role display or selector */}
                    {canManage && !isTargetOwner && !isSelf ? (
                      <select
                        value={m.roles[0] || 'member'}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] capitalize"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <Badge
                        variant={getRoleBadgeVariant(m.roles)}
                        size="sm"
                        className="flex items-center gap-1.5 capitalize"
                      >
                        {getRoleIcon(m.roles)}
                        <span>{m.roles[0] || 'Member'}</span>
                      </Badge>
                    )}

                    {canManage && !isTargetOwner && !isSelf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.user_id, `${m.first_name} ${m.last_name}`)}
                        className="text-xs text-[#475569] hover:text-rose-400 hover:bg-rose-950/20 p-1.5"
                        aria-label="Remove collaborator"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="bg-white border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
              Pending Invitations ({invitations.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-800">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]/60 flex items-center justify-center text-[#475569] flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-xs font-medium text-[#0F172A] truncate block">
                      {inv.email}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Role: <span className="capitalize">{inv.role}</span> • Expires{' '}
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeInvitation(inv.id)}
                    className="text-xs text-[#475569] hover:text-rose-300 border-[#E2E8F0]"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal: Invite Member */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border-[#E2E8F0] w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#0F172A] mb-1">Invite Collaborator</h3>
            <p className="text-xs text-[#475569] mb-4">
              Dispatches an isolated invitation token with scoped RBAC permissions.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Collaborator Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-2 text-xs text-[#0F172A] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Assigned Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isInviting}
                  className="text-xs"
                >
                  Dispatch Invitation
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Transfer Ownership */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border-amber-500/30 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <Crown className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#0F172A]">Transfer Workspace Ownership</h3>
            </div>
            <p className="text-xs text-[#475569] mb-4 leading-relaxed">
              Transferring ownership will demote your account to an Administrator and grant full administrative authority to the selected member.
            </p>

            {transferError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleTransferOwnership} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Select New Workspace Owner
                </label>
                <select
                  required
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]"
                >
                  <option value="">Select an active member...</option>
                  {members
                    .filter((m) => m.user_id !== user?.id)
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.first_name} {m.last_name} ({m.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Confirm Current Master Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={transferPassword}
                    onChange={(e) => setTransferPassword(e.target.value)}
                    placeholder="Enter your master password"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-md pl-9 pr-4 py-2 text-xs text-[#0F172A] placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTransferModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={!newOwnerId || !transferPassword}
                  isLoading={isTransferring}
                  className="text-xs"
                >
                  Confirm Ownership Transfer
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
