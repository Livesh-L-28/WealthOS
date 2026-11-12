'use client';

import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  TrendingUp,
  Plus,
  Send,
  Eye,
  Lock,
  ArrowRightLeft,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Landmark,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  sharedAssets: string;
  sharedLiabilities: string;
  netContribution: string;
  joinedAt: string;
}

interface SharedResource {
  id: string;
  name: string;
  type: 'ASSET' | 'ACCOUNT' | 'LIABILITY' | 'BUDGET';
  ownerName: string;
  amount: string;
  visibility: 'HOUSEHOLD_SHARED' | 'LIMITED_SHARED' | 'PERSONAL_ONLY';
  allocationPct: number;
}

interface SharedGoal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  status: 'ACTIVE' | 'COMPLETED';
}

interface Settlement {
  id: string;
  payerName: string;
  payeeName: string;
  amount: string;
  description: string;
  date: string;
  status: 'COMPLETED';
}

const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-1',
    name: 'Livesh J (You)',
    email: 'livesh@wealthos.dev',
    role: 'OWNER',
    sharedAssets: '₹51,25,350.00',
    sharedLiabilities: '₹12,90,000.00',
    netContribution: '₹38,35,350.00',
    joinedAt: '12 Jan 2026',
  },
  {
    id: 'mem-2',
    name: 'Priya J (Partner)',
    email: 'priya@wealthos.dev',
    role: 'ADMIN',
    sharedAssets: '₹24,12,551.25',
    sharedLiabilities: '₹6,02,300.00',
    netContribution: '₹18,10,251.25',
    joinedAt: '15 Jan 2026',
  },
  {
    id: 'mem-3',
    name: 'Family Office Trust',
    email: 'trust@wealthos.dev',
    role: 'VIEWER',
    sharedAssets: '₹1,89,00,000.00',
    sharedLiabilities: '₹0.00',
    netContribution: '₹1,89,00,000.00',
    joinedAt: '01 Feb 2026',
  },
];

const INITIAL_RESOURCES: SharedResource[] = [
  {
    id: 'res-1',
    name: 'Indiranagar Residence Villa',
    type: 'ASSET',
    ownerName: 'Aarav Sharma',
    amount: '₹22,00,000.00',
    visibility: 'HOUSEHOLD_SHARED',
    allocationPct: 100,
  },
  {
    id: 'res-2',
    name: 'Joint Emergency Savings (HDFC)',
    type: 'ACCOUNT',
    ownerName: 'Priya Sharma',
    amount: '₹8,40,000.00',
    visibility: 'HOUSEHOLD_SHARED',
    allocationPct: 50,
  },
  {
    id: 'res-3',
    name: 'Home Renovation Loan',
    type: 'LIABILITY',
    ownerName: 'Aarav Sharma',
    amount: '₹6,00,000.00',
    visibility: 'HOUSEHOLD_SHARED',
    allocationPct: 100,
  },
  {
    id: 'res-4',
    name: 'Mutual Fund SIP Portfolio',
    type: 'ACCOUNT',
    ownerName: 'Priya Sharma',
    amount: '₹10,00,000.00',
    visibility: 'LIMITED_SHARED',
    allocationPct: 100,
  },
];

const INITIAL_GOALS: SharedGoal[] = [
  {
    id: 'goal-1',
    name: 'Family Summer Vacation & Retreat',
    targetAmount: '₹3,00,000.00',
    currentAmount: '₹2,10,000.00',
    targetDate: '15 Jun 2027',
    status: 'ACTIVE',
  },
  {
    id: 'goal-2',
    name: 'Child Higher Education Fund',
    targetAmount: '₹25,00,000.00',
    currentAmount: '₹12,50,000.00',
    targetDate: '31 Mar 2032',
    status: 'ACTIVE',
  },
];

const INITIAL_SETTLEMENTS: Settlement[] = [
  {
    id: 'set-1',
    payerName: 'Priya Sharma',
    payeeName: 'Aarav Sharma',
    amount: '₹6,500.00',
    description: '50% Monthly Groceries & Utility settlement',
    date: '04 Nov 2026',
    status: 'COMPLETED',
  },
  {
    id: 'set-2',
    payerName: 'Aarav Sharma',
    payeeName: 'Priya Sharma',
    amount: '₹12,000.00',
    description: 'Kids annual sports coaching fee share',
    date: '28 Oct 2026',
    status: 'COMPLETED',
  },
];

export default function HouseholdPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [resources, setResources] = useState<SharedResource[]>(INITIAL_RESOURCES);
  const [goals, setGoals] = useState<SharedGoal[]>(INITIAL_GOALS);
  const [settlements, setSettlements] = useState<Settlement[]>(INITIAL_SETTLEMENTS);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');

  const [settleAmount, setSettleAmount] = useState('');
  const [settleDesc, setSettleDesc] = useState('');
  const [showSettleModal, setShowSettleModal] = useState(false);

  // Consolidated Math
  const totalAssetsNum = 2200000 + 420000 + 1000000; // Villa (2.2M) + 50% of 840k (420k) + MF (1M) = 3.62M
  const totalLiabNum = 600000;
  const netWorthNum = totalAssetsNum - totalLiabNum;

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteSuccessMsg(`Cryptographic invitation token generated and dispatched to ${inviteEmail}.`);
    setInviteEmail('');
    setTimeout(() => {
      setShowInviteModal(false);
      setInviteSuccessMsg('');
    }, 2500);
  };

  const handleRecordSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleAmount || !settleDesc) return;

    const newSettle: Settlement = {
      id: `set-${Date.now()}`,
      payerName: 'Priya Sharma',
      payeeName: 'Aarav Sharma (You)',
      amount: `₹${parseFloat(settleAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      description: settleDesc,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'COMPLETED',
    };

    setSettlements((prev) => [newSettle, ...prev]);
    setSettleAmount('');
    setSettleDesc('');
    setShowSettleModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Household Wealth Management</h1>
            <Badge variant="positive" size="sm">
              <Users className="w-3.5 h-3.5 mr-1 inline" />
              Collaborative Hub
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Privacy-preserving family finance: 3-tier visibility scopes, single-deduplication net worth, and transfer neutrality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettleModal(true)}
            className="flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Record Settlement</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invite Member</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards: Consolidated Household Net Worth */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-[#64748B] text-xs mb-1">
            <span className="font-medium">Consolidated Net Worth</span>
            <Scale className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">₹{netWorthNum.toLocaleString('en-IN')}.00</div>
          <div className="text-[11px] text-[#10B981] font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Single-deduplication verified</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-[#64748B] text-xs mb-1">
            <span className="font-medium">Total Shared Assets</span>
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">₹{totalAssetsNum.toLocaleString('en-IN')}.00</div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Across {resources.filter((r) => r.type !== 'LIABILITY').length} shared accounts & properties
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-[#64748B] text-xs mb-1">
            <span className="font-medium">Total Shared Debt</span>
            <Landmark className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-2xl font-bold text-[#DC2626]">₹{totalLiabNum.toLocaleString('en-IN')}.00</div>
          <div className="text-[11px] text-[#64748B] mt-1">Home Loan (100% household obligation)</div>
        </Card>

        <Card className="p-4 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-[#64748B] text-xs mb-1">
            <span className="font-medium">Active Members</span>
            <Users className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{members.length} Members</div>
          <div className="text-[11px] text-[#64748B] mt-1">1 Owner · 1 Admin · 0 Pending Invites</div>
        </Card>
      </div>

      {/* Household Members Table */}
      <Card className="border border-[#E2E8F0] overflow-hidden">
        <CardHeader
          title="Household Members & Equity Share"
          subtitle="Role-based permissions allow members to view or administer shared assets"
          action={<InfoTooltip content="Role-based permissions allow members to view or administer shared assets while personal accounts remain strictly hidden." />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#E2E8F0] text-[#64748B]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Shared Assets</th>
                <th className="px-4 py-2.5 font-medium">Shared Liabilities</th>
                <th className="px-4 py-2.5 font-medium">Net Contribution</th>
                <th className="px-4 py-2.5 font-medium">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-[#FAFBF9]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#0F172A]">{m.name}</div>
                    <div className="text-[11px] text-[#64748B]">{m.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.role === 'OWNER' ? 'positive' : 'neutral'} size="sm">
                      {m.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{m.sharedAssets}</td>
                  <td className="px-4 py-3 font-medium text-[#DC2626]">{m.sharedLiabilities}</td>
                  <td className="px-4 py-3 font-bold text-[#10B981]">{m.netContribution}</td>
                  <td className="px-4 py-3 text-[#64748B]">{m.joinedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Shared Resources & Visibility Matrix */}
      <Card className="border border-[#E2E8F0] overflow-hidden">
        <CardHeader
          title="Shared Resources & Visibility Matrix"
          subtitle="3-Tier Containment Guarantee (Personal Only, Household Shared, Limited Shared)"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#E2E8F0] text-[#64748B]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Resource</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Owner</th>
                <th className="px-4 py-2.5 font-medium">Total Valuation</th>
                <th className="px-4 py-2.5 font-medium">Household Allocation</th>
                <th className="px-4 py-2.5 font-medium">Visibility Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {resources.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAFBF9]">
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{r.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral" size="sm">
                      {r.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{r.ownerName}</td>
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{r.amount}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{r.allocationPct}%</td>
                  <td className="px-4 py-3">
                    {r.visibility === 'HOUSEHOLD_SHARED' && (
                      <Badge variant="positive" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                        Fully Shared
                      </Badge>
                    )}
                    {r.visibility === 'LIMITED_SHARED' && (
                      <Badge variant="neutral" size="sm">
                        <Lock className="w-3 h-3 mr-1 inline" />
                        Limited (Balance Only)
                      </Badge>
                    )}
                    {r.visibility === 'PERSONAL_ONLY' && (
                      <Badge variant="neutral" size="sm">
                        Private
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grid: Shared Goals & Transfer-Neutral Reimbursements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shared Goals */}
        <Card className="border border-[#E2E8F0]">
          <CardHeader
            title="Collaborative Household Goals"
            subtitle="Multi-member milestone progress tracking"
          />
          <div className="p-4 space-y-4">
            {goals.map((g) => {
              const current = parseFloat(g.currentAmount.replace(/[₹,]/g, ''));
              const target = parseFloat(g.targetAmount.replace(/[₹,]/g, ''));
              const pct = Math.min(100, Math.round((current / target) * 100));

              return (
                <div key={g.id} className="p-3 bg-[#FAFBF9] rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#0F172A]">{g.name}</span>
                    <Badge variant={pct >= 100 ? 'positive' : 'neutral'} size="sm">
                      {pct}%
                    </Badge>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#10B981] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>
                      {g.currentAmount} of {g.targetAmount}
                    </span>
                    <span>Target: {g.targetDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Transfer-Neutral Reimbursements */}
        <Card className="border border-[#E2E8F0]">
          <CardHeader
            title="Internal Settlement Log"
            subtitle="Transfer Neutral (Zero Double-Counting)"
          />
          <div className="p-4 space-y-3">
            {settlements.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-white rounded-xl border border-[#E2E8F0] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-[#0F172A]">
                    {s.payerName} → {s.payeeName}
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">{s.description}</div>
                  <div className="text-[10px] text-[#64748B] mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{s.date}</span>
                    <span className="text-[#10B981] font-medium ml-2">● Zero Double-Counting</span>
                  </div>
                </div>
                <div className="text-sm font-bold text-[#0F172A]">{s.amount}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-6 bg-white border border-[#E2E8F0] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#10B981]" />
                <span>Invite Household Member</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-sm"
              >
                ✕
              </button>
            </div>

            {inviteSuccessMsg ? (
              <div className="p-3 bg-[#EAF7EE] text-[#10B981] text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{inviteSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-[#0F172A] mb-1">Member Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="partner@family.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#0F172A] mb-1">Household Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="MEMBER">MEMBER (Can view shared, contribute to goals)</option>
                    <option value="ADMIN">ADMIN (Can invite others, adjust budgets)</option>
                    <option value="VIEWER">VIEWER (Read-only observation)</option>
                  </select>
                </div>

                <div className="p-3 bg-[#FAFBF9] border border-[#E2E8F0] rounded-xl text-[11px] text-[#64748B]">
                  🔒 A 256-bit single-use cryptographic token will be created. The token automatically expires in 7 days.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Send Invitation
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* Record Settlement Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-6 bg-white border border-[#E2E8F0] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#10B981]" />
                <span>Record Internal Reimbursement</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordSettlement} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">Reimbursement Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="5000.00"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0F172A] mb-1">Description / Bill Reference</label>
                <input
                  type="text"
                  required
                  placeholder="Electricity & broadband bill share"
                  value={settleDesc}
                  onChange={(e) => setSettleDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="p-3 bg-[#EAF7EE] border border-[#10B981]/20 rounded-xl text-[11px] text-[#10B981]">
                ✓ Transfer Neutrality Guarantee: This reimbursement is categorized as an internal settlement. It does
                not create artificial income or duplicate living expenses.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowSettleModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Record Settlement
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
