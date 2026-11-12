'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  Wallet,
  PieChart,
  Target,
  FileText,
  FileSpreadsheet,
  Bot,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Users,
  Coins,
  FileCheck,
  Link2,
} from 'lucide-react';
import { useNav } from './NavContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Cockpit & Control',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Control Centre', href: '/reconciliation', icon: ShieldCheck, badge: 'Recon' },
    ],
  },
  {
    title: 'Cash & Money',
    items: [
      { label: 'Accounts', href: '/accounts', icon: Landmark },
      { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
      { label: 'Cash Flow', href: '/analytics', icon: Wallet },
      { label: 'Budgets', href: '/budgets', icon: PieChart },
    ],
  },
  {
    title: 'Investments & Reports',
    items: [
      { label: 'Investments', href: '/investments', icon: TrendingUp },
      { label: 'Dividends', href: '/dividends', icon: Coins, badge: 'Sec 194' },
      { label: 'Net Worth', href: '/net-worth', icon: FileSpreadsheet },
      { label: 'Certified Reports', href: '/reports', icon: FileCheck },
    ],
  },
  {
    title: 'Planning & Intelligence',
    items: [
      { label: 'Goals', href: '/goals', icon: Target },
      { label: 'Financial Copilot', href: '/copilot', icon: Bot, badge: 'AI' },
      { label: 'Household', href: '/household', icon: Users, badge: 'Shared' },
      { label: 'Documents', href: '/documents', icon: FileText },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Security & Audit', href: '/settings/security', icon: ShieldCheck },
      { label: 'Connected Providers', href: '/settings/providers', icon: Link2, badge: 'DPDP' },
      { label: 'Workspace Settings', href: '/settings/workspaces', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, isMobileOpen, setIsMobileOpen } = useNav();

  const renderNavLinks = (items: NavItem[], isMobile = false) => (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (isMobile) setIsMobileOpen(false);
            }}
            title={collapsed && !isMobile ? item.label : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 min-h-[44px] ${
              isActive
                ? 'bg-[#10B981]/10 text-[#059669] font-semibold border-l-2 border-[#10B981] shadow-xs'
                : 'text-[#334155] hover:text-[#0F172A] hover:bg-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#10B981]'
            }`}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${
                isActive ? 'text-[#10B981]' : 'text-[#64748B]'
              }`}
            />
            {(!collapsed || isMobile) && (
              <span className="truncate flex-1 tracking-tight">{item.label}</span>
            )}
            {(!collapsed || isMobile) && item.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#10B981]/15 text-[#059669]">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        aria-label="Main Navigation"
        className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-30 select-none bg-white border-r border-[#E2E8F0] shadow-[1px_0_3px_0_rgba(23,35,29,0.02)] ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#E2E8F0]">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0">
              W
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-[#0F172A]">
                  Wealth<span className="text-[#10B981]">OS</span>
                </span>
                <span className="text-[10px] text-[#64748B] font-medium tracking-wider uppercase">
                  Personal Wealth
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#10B981]"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                  {section.title}
                </h4>
              )}
              {renderNavLinks(section.items)}
            </div>
          ))}
        </nav>

        {/* Bottom Status Indicator */}
        <div className="p-4 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between bg-[#F8FAFC]">
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-medium text-[#0F172A]">WealthOS</span>
              <span className="text-[10px] text-[#64748B]">Double-Entry Ledger</span>
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#059669] text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            SYNCED
          </span>
        </div>
      </aside>

      {/* 2. Mobile Slide-Over Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Off-canvas panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#E2E8F0]">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center font-bold text-white shadow-sm">
                  W
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-[#0F172A]">
                    Wealth<span className="text-[#10B981]">OS</span>
                  </span>
                  <span className="text-[10px] text-[#64748B] font-medium tracking-wider uppercase">
                    Personal Wealth
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="w-10 h-10 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#10B981]"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-1">
                  <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                    {section.title}
                  </h4>
                  {renderNavLinks(section.items, true)}
                </div>
              ))}
            </nav>

            {/* Mobile Bottom Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-xs font-medium text-[#0F172A]">WealthOS Platform</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#059669] font-semibold">
                Online
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
