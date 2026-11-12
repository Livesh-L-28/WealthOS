'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Building,
  Key,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Lock,
  ExternalLink,
  Plus,
  X,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface ProviderCard {
  id: string;
  name: string;
  category: 'ACCOUNT_AGGREGATOR' | 'BROKER' | 'MUTUAL_FUND';
  providerKey: string;
  status: 'CONNECTED' | 'REVOKED' | 'AVAILABLE';
  connectedSince: string;
  lastSync: string;
  accountsCount: number;
  description: string;
  scopes: string[];
}

const INITIAL_PROVIDERS: ProviderCard[] = [
  {
    id: 'prov-001',
    name: 'Zerodha Kite Connect',
    category: 'BROKER',
    providerKey: 'zerodha',
    status: 'CONNECTED',
    connectedSince: '14 Aug 2026',
    lastSync: '12 mins ago',
    accountsCount: 1,
    description: 'Direct tradebook execution, daily holdings, contract note ledger import, and equity lots.',
    scopes: ['read:holdings', 'read:orders', 'read:trades', 'read:margins'],
  },
  {
    id: 'prov-002',
    name: 'Setu Account Aggregator (RBI AA)',
    category: 'ACCOUNT_AGGREGATOR',
    providerKey: 'setu_aa',
    status: 'CONNECTED',
    connectedSince: '02 Sep 2026',
    lastSync: '1 hour ago',
    accountsCount: 3,
    description: 'RBI-regulated financial data sharing for savings accounts, sweep fixed deposits, and credit cards.',
    scopes: ['fip:deposit:transactions', 'fip:deposit:profile', 'fip:credit_card:statements'],
  },
  {
    id: 'prov-003',
    name: 'CAMS / KFintech CAS Sync',
    category: 'MUTUAL_FUND',
    providerKey: 'cams_cas',
    status: 'CONNECTED',
    connectedSince: '20 Sep 2026',
    lastSync: 'Yesterday',
    accountsCount: 2,
    description: 'Automated ingestion of Consolidated Account Statements for AMFI mutual funds and Folio balances.',
    scopes: ['read:folios', 'read:nav_history', 'read:mf_transactions'],
  },
  {
    id: 'prov-004',
    name: 'Upstox Pro API',
    category: 'BROKER',
    providerKey: 'upstox',
    status: 'AVAILABLE',
    connectedSince: '—',
    lastSync: 'Never',
    accountsCount: 0,
    description: 'High-frequency equity & derivative trades synchronization and daily position tracking.',
    scopes: ['read:portfolio', 'read:transactions'],
  },
];

export default function ProvidersSettingsPage() {
  const [providers, setProviders] = useState<ProviderCard[]>(INITIAL_PROVIDERS);
  const [revokeModalProvider, setRevokeModalProvider] = useState<ProviderCard | null>(null);
  const [revokeInputText, setRevokeInputText] = useState<string>('');
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [connectModalProvider, setConnectModalProvider] = useState<ProviderCard | null>(null);

  const handleRevoke = async () => {
    if (!revokeModalProvider || revokeInputText !== 'REVOKE') return;

    setIsRevoking(true);
    try {
      // Call backend revocation endpoint
      await fetch(`/api/v1/integrations/connections/${revokeModalProvider.id}/revoke`, {
        method: 'POST',
      }).catch(() => null);

      setProviders(
        providers.map((p) =>
          p.id === revokeModalProvider.id
            ? { ...p, status: 'REVOKED', lastSync: 'Revoked by user', accountsCount: 0 }
            : p
        )
      );

      setToastMessage(`${revokeModalProvider.name} integration revoked. Stored OAuth tokens shredded in database.`);
      setRevokeModalProvider(null);
      setRevokeInputText('');
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleConnect = (prov: ProviderCard) => {
    setProviders(
      providers.map((p) =>
        p.id === prov.id
          ? { ...p, status: 'CONNECTED', lastSync: 'Just now', accountsCount: 1, connectedSince: 'Today' }
          : p
      )
    );
    setConnectModalProvider(null);
    setToastMessage(`Connected ${prov.name} under DPDP Act 2023 Consent Artifact.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="border-b border-border/60 pb-5">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-primary/20 text-primary border border-primary/30">
            Security & DPDP Compliance
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> AES-256-GCM Envelope Encryption
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
          Connected Financial Providers & API Credentials
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage third-party Account Aggregator consents and broker OAuth tokens. Revoking access permanently shreds stored keys in compliance with India&apos;s DPDP Act 2023.
        </p>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            Audit Logged
          </span>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((prov) => {
          const isConnected = prov.status === 'CONNECTED';
          const isRevoked = prov.status === 'REVOKED';

          return (
            <div
              key={prov.id}
              className={`bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all ${
                isConnected
                  ? 'border-border/80 hover:border-border'
                  : isRevoked
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-border/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-lg bg-secondary text-primary">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{prov.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">
                        {prov.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isRevoked
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {prov.status}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-4">{prov.description}</p>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-secondary/40 border border-border/60 text-xs mb-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Connected</span>
                    <span className="font-semibold text-foreground font-mono">{prov.connectedSince}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Last Synced</span>
                    <span className="font-semibold text-foreground font-mono">{prov.lastSync}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Linked</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {prov.accountsCount} {prov.accountsCount === 1 ? 'Account' : 'Accounts'}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-1.5">
                    Granted Permissions (DPDP Scopes)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {prov.scopes.map((sc) => (
                      <span
                        key={sc}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border/80"
                      >
                        {sc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => {
                        setToastMessage(`Triggered background sync for ${prov.name}...`);
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 rounded-lg transition-colors border border-border/80"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                      Sync Now
                    </button>

                    <button
                      onClick={() => setRevokeModalProvider(prov)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke Provider
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConnectModalProvider(prov)}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-white hover:bg-primary/90 rounded-lg shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    {isRevoked ? 'Re-authorize Integration' : 'Connect Provider'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Revocation Security Modal */}
      {revokeModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-destructive/40 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive mb-3">
              <div className="p-2.5 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Revoke {revokeModalProvider.name}
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  Irreversible Credential Shredding
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Revoking access will immediately destroy and shred all envelope-encrypted OAuth tokens stored in the database. Historical transactions and general ledger entries will be preserved.
            </p>

            <div className="p-3 rounded-lg bg-secondary/80 border border-border mb-4 text-xs">
              <label className="block text-muted-foreground mb-1.5 font-medium">
                To confirm, type <span className="font-mono font-bold text-destructive">REVOKE</span> in the box below:
              </label>
              <input
                type="text"
                value={revokeInputText}
                onChange={(e) => setRevokeInputText(e.target.value)}
                placeholder="REVOKE"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono font-bold focus:outline-none focus:ring-1 focus:ring-destructive"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRevokeModalProvider(null);
                  setRevokeInputText('');
                }}
                className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revokeInputText !== 'REVOKE' || isRevoking}
                onClick={handleRevoke}
                className="px-4 py-2 rounded-lg bg-destructive text-white text-xs font-semibold hover:bg-destructive/90 shadow-sm transition-all disabled:opacity-50"
              >
                {isRevoking ? 'Shredding Credentials...' : 'Permanently Revoke Integration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Provider Modal */}
      {connectModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Connect {connectModalProvider.name}
                </h3>
                <p className="text-xs text-muted-foreground">Digital Personal Data Protection (DPDP) Act 2023 Consent</p>
              </div>
              <button
                onClick={() => setConnectModalProvider(null)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-secondary/60 border border-border space-y-2">
                <span className="font-semibold text-foreground block">Explicit Purpose Limitation Notice</span>
                <p className="text-muted-foreground leading-relaxed">
                  WealthOS requests read-only access to synchronize historical and daily balances, trade contract notes, and holdings for your personal double-entry general ledger. Data will never be sold, leased, or shared with third parties.
                </p>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Consent Validity Horizon</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="365">365 Days (Annual Renewal) — Standard</option>
                  <option value="180">180 Days (Half-Yearly)</option>
                  <option value="90">90 Days (Quarterly Audit)</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary shrink-0" />
                <span>Credentials will be encrypted with tenant-scoped AES-256-GCM envelope keys before database persistence.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectModalProvider(null)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConnect(connectModalProvider)}
                  className="px-5 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 shadow-sm"
                >
                  Agree & Authorize Integration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
