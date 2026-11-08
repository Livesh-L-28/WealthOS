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
} from 'lucide-react';
import { useNav } from './NavContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Accounts', href: '/accounts', icon: Landmark },
  { label: 'Control Centre', href: '/reconciliation', icon: ShieldCheck, badge: 'Recon' },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Investments', href: '/investments', icon: TrendingUp },
  { label: 'Cash Flow', href: '/analytics', icon: Wallet },
  { label: 'Budgets', href: '/budgets', icon: PieChart },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Household', href: '/household', icon: Users, badge: 'Shared' },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Reports', href: '/net-worth', icon: FileSpreadsheet },
  { label: 'Financial Copilot', href: '/copilot', icon: Bot, badge: 'AI' },
];

const SETTINGS_NAV_ITEMS: NavItem[] = [
  { label: 'Security & Audit', href: '/settings/security', icon: ShieldCheck },
  { label: 'Workspace Settings', href: '/settings/workspaces', icon: Settings },
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
                ? 'bg-[#16A36A]/10 text-[#087A50] font-semibold border-l-2 border-[#16A36A] shadow-xs'
                : 'text-[#505D54] hover:text-[#17231D] hover:bg-[#F0F4F1] focus-visible:ring-2 focus-visible:ring-[#16A36A]'
            }`}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${
                isActive ? 'text-[#16A36A]' : 'text-[#717D74]'
              }`}
            />
            {(!collapsed || isMobile) && (
              <span className="truncate flex-1 tracking-tight">{item.label}</span>
            )}
            {(!collapsed || isMobile) && item.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#16A36A]/15 text-[#087A50]">
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
        className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-30 select-none bg-white border-r border-[#E7ECE8] shadow-[1px_0_3px_0_rgba(23,35,29,0.02)] ${
          collapsed ? 'w-20' : 'w-64'
        }`}
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
                <span className="text-[10px] text-[#717D74] font-medium tracking-wider uppercase">
                  Personal Wealth
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg text-[#717D74] hover:text-[#17231D] hover:bg-[#F0F4F1] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#16A36A]"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          <div>
            {!collapsed && (
              <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#717D74] mb-2">
                Main Menu
              </h4>
            )}
            {renderNavLinks(PRIMARY_NAV_ITEMS)}
          </div>

          <div>
            {!collapsed && (
              <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#717D74] mb-2">
                Preferences
              </h4>
            )}
            {renderNavLinks(SETTINGS_NAV_ITEMS)}
          </div>
        </nav>

        {/* Bottom Status Indicator */}
        <div className="p-4 border-t border-[#E7ECE8] text-[11px] text-[#717D74] flex items-center justify-between bg-[#FAFCFA]">
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-medium text-[#17231D]">WealthOS</span>
              <span className="text-[10px] text-[#717D74]">Double-Entry Ledger</span>
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#16A36A]/10 text-[#087A50] text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse"></span>
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
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#E7ECE8]">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#16A36A] to-[#087A50] flex items-center justify-center font-bold text-white shadow-sm">
                  W
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-[#17231D]">
                    Wealth<span className="text-[#16A36A]">OS</span>
                  </span>
                  <span className="text-[10px] text-[#717D74] font-medium tracking-wider uppercase">
                    Personal Wealth
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="w-10 h-10 rounded-xl text-[#717D74] hover:text-[#17231D] hover:bg-[#F0F4F1] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#16A36A]"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
              <div>
                <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#717D74] mb-2">
                  Navigation
                </h4>
                {renderNavLinks(PRIMARY_NAV_ITEMS, true)}
              </div>

              <div>
                <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#717D74] mb-2">
                  Preferences
                </h4>
                {renderNavLinks(SETTINGS_NAV_ITEMS, true)}
              </div>
            </nav>

            {/* Mobile Bottom Footer */}
            <div className="p-4 border-t border-[#E7ECE8] bg-[#FAFCFA] flex items-center justify-between">
              <span className="text-xs font-medium text-[#17231D]">WealthOS Platform</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16A36A]/10 text-[#087A50] font-semibold">
                Online
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
