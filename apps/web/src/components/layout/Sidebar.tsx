'use client';

import React, { useState } from 'react';
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
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavCluster {
  title: string;
  items: NavItem[];
}

const NAVIGATION_CLUSTERS: NavCluster[] = [
  {
    title: 'Core Wealth',
    items: [
      { label: 'Executive Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Net Worth Statement', href: '/net-worth', icon: Scale },
      { label: 'Accounts & Wallets', href: '/accounts', icon: Landmark },
      { label: 'Transaction Ledger', href: '/transactions', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Growth & Planning',
    items: [
      { label: 'Investment Portfolio', href: '/investments', icon: TrendingUp },
      { label: 'Expense & Cash Flow', href: '/analytics', icon: Wallet },
      { label: 'Budgets & Envelopes', href: '/budgets', icon: PieChart },
      { label: 'Financial Goals', href: '/goals', icon: Target },
    ],
  },
  {
    title: 'Intelligence & Vault',
    items: [
      { label: 'Financial Copilot', href: '/copilot', icon: Bot, badge: 'AI' },
      { label: 'Document Vault', href: '/documents', icon: FileText },
      { label: 'Security & Audit', href: '/settings/security', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Main Navigation"
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } flex-shrink-0 bg-white border-r border-[#E7ECE8] flex flex-col h-screen sticky top-0 transition-all duration-300 z-30 select-none shadow-[1px_0_3px_0_rgba(23,35,29,0.02)]`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#E7ECE8]">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#16A36A] to-[#087A50] flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0">
            W
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight text-[#17231D]">
                Wealth<span className="text-[#16A36A]">OS</span>
              </span>
              <span className="text-[10px] text-[#758078] font-medium tracking-wider uppercase">
                Enterprise Wealth
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg text-[#758078] hover:text-[#17231D] hover:bg-[#F0F4F1] flex items-center justify-center transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAVIGATION_CLUSTERS.map((cluster) => (
          <div key={cluster.title} className="space-y-1">
            {!collapsed && (
              <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#9BA39D]">
                {cluster.title}
              </h4>
            )}
            <div className="space-y-0.5 mt-1">
              {cluster.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#16A36A]/10 text-[#087A50] font-semibold border-l-2 border-[#16A36A]'
                        : 'text-[#758078] hover:text-[#17231D] hover:bg-[#F0F4F1]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-[#16A36A]' : 'text-[#758078]'
                      }`}
                    />
                    {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#16A36A]/15 text-[#087A50]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Tenant & Version Status */}
      <div className="p-4 border-t border-[#E7ECE8] text-[11px] text-[#758078] flex items-center justify-between bg-[#FAFCFA]">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-medium text-[#17231D]">WealthOS v1.0-rc1</span>
            <span className="text-[10px] text-[#758078]">Double-Entry Grounded</span>
          </div>
        )}
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#16A36A]/10 text-[#087A50] text-[10px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse"></span>
          ONLINE
        </span>
      </div>
    </aside>
  );
}
