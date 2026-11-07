'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PieChart,
  Landmark,
  Scale,
  FileText,
  Bot,
  Target,
  FileCheck2,
  FileSpreadsheet,
  Settings,
  Bell,
  CheckCheck,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavCluster {
  title: string;
  items: NavItem[];
}

const NAVIGATION_CLUSTERS: NavCluster[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Executive Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Net Worth Statement', href: '/net-worth', icon: Scale },
    ],
  },
  {
    title: 'Banking & Cash',
    items: [
      { label: 'Accounts & Wallets', href: '/accounts', icon: Landmark },
      { label: 'Transaction Ledger', href: '/transactions', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Cashflow & Budgets',
    items: [
      { label: 'Income & Cash Flow', href: '/cashflow', icon: Wallet },
      { label: 'Budgets & Envelopes', href: '/budgets', icon: PieChart },
    ],
  },
  {
    title: 'Investments',
    items: [
      { label: 'Portfolio Analytics', href: '/investments', icon: PieChart },
      { label: 'Dividends & Interest', href: '/dividends', icon: Wallet },
    ],
  },
  {
    title: 'Documents & Audit',
    items: [
      { label: 'Document Vault (OCR)', href: '/documents', icon: FileText },
      { label: 'Ledger Reconciliation', href: '/reconciliation', icon: CheckCheck },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'Financial Copilot', href: '/copilot', icon: Bot },
      { label: 'Goals & Projections', href: '/goals', icon: Target },
    ],
  },
  {
    title: 'Reports & Settings',
    items: [
      { label: 'Tax & Compliance', href: '/reports/tax', icon: FileSpreadsheet },
      { label: 'Audit Trail & Export', href: '/reports/audit', icon: FileCheck2 },
      { label: 'System Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Main Navigation"
      className="w-64 flex-shrink-0 bg-[#0E131F] border-r border-slate-800 flex flex-col h-screen sticky top-0 overflow-y-auto"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            W
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wide text-slate-100">WEALTH<span className="text-indigo-400">OS</span></span>
            <span className="text-[10px] text-slate-400 font-mono">ENTERPRISE SAAS</span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {NAVIGATION_CLUSTERS.map((cluster) => (
          <div key={cluster.title} className="space-y-1">
            <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {cluster.title}
            </h4>
            <div className="space-y-0.5 mt-1">
              {cluster.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Tenant & Version Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>WealthOS v0.2.0</span>
        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono">ONLINE</span>
      </div>
    </aside>
  );
}

