'use client';

import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Check,
  Edit2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { TenantSummary } from '@wealthos/shared-types';

const CURRENCIES = [
  { code: 'INR', label: 'INR (₹) - Indian Rupee' },
  { code: 'USD', label: 'USD ($) - US Dollar' },
  { code: 'EUR', label: 'EUR (€) - Euro' },
  { code: 'GBP', label: 'GBP (£) - British Pound' },
  { code: 'AED', label: 'AED (د.إ) - UAE Dirham' },
  { code: 'SGD', label: 'SGD (S$) - Singapore Dollar' },
];

const WORKSPACE_TYPES = [
  { value: 'personal', label: 'Personal Wealth Space' },
  { value: 'household', label: 'Joint Household / Family' },
  { value: 'family_office', label: 'Multi-Entity / Family Office' },
];

export default function WorkspacesSettingsPage() {
  const { workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces } = useAuth();

  // Create Workspace Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('household');
  const [newCurrency, setNewCurrency] = useState('INR');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Workspace Modal State
  const [editingWs, setEditingWs] = useState<TenantSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editCurrency, setEditCurrency] = useState('INR');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await apiClient.createWorkspace({
        name: newName.trim(),
        type: newType,
        base_currency: newCurrency,
      });

      if (res.success && res.data) {
        setShowCreateModal(false);
        setNewName('');
        setNotification(`Workspace "${res.data.name}" created successfully.`);
        await refreshWorkspaces();
        await switchWorkspace(res.data.id);
      } else {
        setCreateError(res.error?.message || 'Failed to create workspace.');
      }
    } catch {
      setCreateError('Service communication failure.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (ws: TenantSummary) => {
    setEditingWs(ws);
    setEditName(ws.name);
    setEditCurrency(ws.base_currency);
    setUpdateError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWs || !editName.trim()) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const res = await apiClient.updateWorkspace(editingWs.id, {
        name: editName.trim(),
        base_currency: editCurrency,
      });

      if (res.success && res.data) {
        setEditingWs(null);
        setNotification(`Workspace updated to "${res.data.name}".`);
        await refreshWorkspaces();
      } else {
        setUpdateError(res.error?.message || 'Failed to update workspace.');
      }
    } catch {
      setUpdateError('Service failure during workspace update.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E7ECE8] gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#17231D]">Workspaces & Multi-Tenancy</h2>
          <p className="text-xs text-[#758078] mt-1">
            Seamlessly switch between personal accounts, household pools, and business entities with strictly partitioned ledgers.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
          }}
          className="text-xs flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workspace</span>
        </Button>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Workspace List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspaces.map((ws) => {
          const isCurrent = ws.id === currentWorkspace?.id;
          return (
            <Card
              key={ws.id}
              className={`p-5 transition-all ${
                isCurrent
                  ? 'bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-950/30'
                  : 'bg-white border-[#E7ECE8] hover:border-[#E7ECE8]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isCurrent
                        ? 'bg-[#16A36A] text-white'
                        : 'bg-[#F0F4F1] text-[#4A554E] border border-[#E7ECE8]'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#17231D]">{ws.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="neutral" size="sm" className="capitalize">
                        {ws.type}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {ws.base_currency}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isCurrent && (
                  <Badge variant="positive" size="sm" className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Active</span>
                  </Badge>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-[#E7ECE8] flex items-center justify-between text-xs text-[#758078]">
                <div className="flex items-center gap-1.5">
                  <span>Role:</span>
                  <span className="font-medium text-[#17231D] capitalize">{ws.role}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(ws)}
                    className="text-xs text-[#758078] hover:text-[#17231D] p-1.5"
                    aria-label="Edit workspace"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  {!isCurrent && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => switchWorkspace(ws.id)}
                      className="text-xs"
                    >
                      Switch to Workspace
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal: Create Workspace */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border-[#E7ECE8] w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#17231D] mb-1">Create New Workspace</h3>
            <p className="text-xs text-[#758078] mb-4">
              Provision a distinct, partitioned financial environment with its own accounts and collaborators.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Oak Household, Apex Holdings"
                  className="w-full bg-[#F7F9F7] border border-[#E7ECE8] rounded-md px-3 py-2 text-xs text-[#17231D] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Workspace Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-[#F7F9F7] border border-[#E7ECE8] rounded-md px-3 py-2 text-xs text-[#17231D] focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A]"
                >
                  {WORKSPACE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Primary Ledger Base Currency
                </label>
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  className="w-full bg-[#F7F9F7] border border-[#E7ECE8] rounded-md px-3 py-2 text-xs text-[#17231D] focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E7ECE8] flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isCreating}
                  className="text-xs"
                >
                  Provision Workspace
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Edit Workspace */}
      {editingWs && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border-[#E7ECE8] w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#17231D] mb-1">Edit Workspace</h3>
            <p className="text-xs text-[#758078] mb-4">
              Update name and display currency settings for this tenant.
            </p>

            {updateError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#F7F9F7] border border-[#E7ECE8] rounded-md px-3 py-2 text-xs text-[#17231D] focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A554E] mb-1">
                  Base Currency
                </label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full bg-[#F7F9F7] border border-[#E7ECE8] rounded-md px-3 py-2 text-xs text-[#17231D] focus:outline-none focus:ring-1 focus:ring-[#16A36A] focus:border-[#16A36A]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E7ECE8] flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingWs(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isUpdating}
                  className="text-xs"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
