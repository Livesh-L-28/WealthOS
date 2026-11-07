'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { SecurityAuditLog } from '@wealthos/shared-types';

export default function AuditSettingsPage() {
  const { currentWorkspace } = useAuth();
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<SecurityAuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.getAuditLogs(currentWorkspace.id, 100);
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch audit log records.');
      }
    } catch {
      setError('Communication error retrieving audit records.');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.event_type.toLowerCase().includes(q) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(q)) ||
      (log.user_id && log.user_id.toLowerCase().includes(q))
    );
  });

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Security Audit Trail
            </h2>
            <Badge variant="neutral" size="sm">
              Append-Only Ledger
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable, scrubbed security and administrative activity log scoped strictly to {currentWorkspace?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by event type, actor ID, or IP..."
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing {filteredLogs.length} of {logs.length} events
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card className="bg-[#111827] border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit trail...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No matching audit events recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actor ID</th>
                  <th className="py-3 px-4">Source IP</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map((log) => {
                  const isSuccess = log.status === 'success';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100 whitespace-nowrap">
                        {formatEventType(log.event_type)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={isSuccess ? 'positive' : 'negative'}
                          size="sm"
                          className="inline-flex items-center gap-1 uppercase text-[10px]"
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-400" />
                          )}
                          <span>{log.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap max-w-[120px] truncate">
                        {log.user_id ? log.user_id.slice(0, 8) + '...' : 'System'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {log.ip_address || 'Internal'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 p-1"
                          aria-label="Inspect payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-[#111827] border-slate-700 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">
                Audit Record: {formatEventType(selectedLog.event_type)}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500">Record ID:</span>{' '}
                  <span className="font-mono text-slate-300 select-all">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp:</span>{' '}
                  <span className="font-mono text-slate-300">
                    {new Date(selectedLog.created_at).toISOString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Actor User:</span>{' '}
                  <span className="font-mono text-slate-300 select-all">
                    {selectedLog.user_id || 'System / Unauthenticated'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Source IP:</span>{' '}
                  <span className="font-mono text-slate-300">{selectedLog.ip_address || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1 font-semibold text-[11px]">
                  Scrubbed Audit Payload:
                </span>
                <pre className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
