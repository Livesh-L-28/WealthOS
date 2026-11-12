'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  LogOut,
  Settings,
  Users,
  Plus,
  Check,
  Calendar,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '@/lib/auth-context';
import { useNav } from './NavContext';

export function Header() {
  const pathname = usePathname();
  const { user, currentWorkspace, workspaces, switchWorkspace, logout } = useAuth();
  const { toggleMobileNav } = useNav();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Initialize privacy mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wealthos_privacy_mode') === 'true';
      setPrivacyMode(saved);
      if (saved) {
        document.documentElement.classList.add('privacy-mode');
      }
    } catch {
      // localStorage may be unavailable in restricted contexts
    }
  }, []);

  const togglePrivacyMode = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    try {
      localStorage.setItem('wealthos_privacy_mode', String(next));
    } catch {
      // ignore
    }
    if (next) {
      document.documentElement.classList.add('privacy-mode');
    } else {
      document.documentElement.classList.remove('privacy-mode');
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase()
    : 'LJ';

  const userDisplayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : 'Livesh J';

  // Simplified, user-friendly page titles
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname === '/accounts') return 'Accounts';
    if (pathname === '/transactions') return 'Transactions';
    if (pathname === '/investments') return 'Investments';
    if (pathname === '/analytics') return 'Cash Flow';
    if (pathname === '/budgets') return 'Budgets';
    if (pathname === '/goals') return 'Goals';
    if (pathname === '/dividends') return 'Dividends & Passive Income';
    if (pathname === '/reports') return 'Certified Reports & Tax Schedules';
    if (pathname === '/documents') return 'Documents';
    if (pathname === '/copilot') return 'Financial Copilot';
    if (pathname === '/net-worth') return 'Net Worth';
    if (pathname === '/settings/providers') return 'Connected Providers & Consents';
    if (pathname?.startsWith('/settings')) return 'Settings';
    return 'Wealth Intelligence';
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_2px_0_rgba(23,35,29,0.02)]">
      {/* Left: Mobile Hamburger & Page Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={toggleMobileNav}
          className="md:hidden w-11 h-11 rounded-xl text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#10B981]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex flex-col">
          <span className="text-[10px] text-[#64748B] font-medium tracking-wide uppercase">
            WealthOS
          </span>
          <span className="text-sm font-semibold text-[#0F172A] tracking-tight">
            {getPageTitle()}
          </span>
        </div>

        <div className="h-5 w-px bg-[#E2E8F0] hidden sm:block"></div>

        {/* Workspace Dropdown */}
        <div className="relative hidden sm:block" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] hover:bg-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-colors font-medium shadow-xs"
            aria-expanded={workspaceMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
            <span className="max-w-[170px] truncate">
              {currentWorkspace ? currentWorkspace.name : 'Select Workspace'}
            </span>
            <span className="text-[10px] text-[#64748B] font-mono">
              ({currentWorkspace?.base_currency || 'INR'})
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${
                workspaceMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {workspaceMenuOpen && (
            <div className="absolute left-0 top-11 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0]">
                Your Workspaces
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {workspaces.map((ws) => {
                  const isSelected = ws.id === currentWorkspace?.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        switchWorkspace(ws.id);
                        setWorkspaceMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#10B981]/10 text-[#059669] font-semibold'
                          : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate">{ws.name}</span>
                        <span className="text-[10px] text-[#64748B]">
                          {ws.type} &bull; {ws.base_currency}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-[#E2E8F0] pt-1 mt-1 px-1">
                <Link
                  href="/settings/workspaces"
                  onClick={() => setWorkspaceMenuOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#10B981] hover:bg-[#10B981]/10 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Workspaces</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-sm mx-6">
        <div
          className={`relative w-full rounded-xl transition-all ${
            searchFocused ? 'ring-2 ring-[#10B981] bg-white' : 'bg-[#F8FAFC]'
          }`}
        >
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions, accounts, categories..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-9 pr-12 py-1.5 text-xs bg-transparent border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#64748B] focus:outline-none"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#64748B] bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Status, Help, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date Selector Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A]">
          <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="font-medium">Nov 2026</span>
        </div>

        {/* Privacy Mode Toggle */}
        <button
          type="button"
          onClick={togglePrivacyMode}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
            privacyMode
              ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/40'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-transparent hover:border-[#E2E8F0]'
          } focus-visible:ring-2 focus-visible:ring-[#10B981]`}
          title={privacyMode ? 'Privacy Mode Active (Tap to reveal balances)' : 'Privacy Mode: Hide Balances in Public'}
          aria-label={privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
        >
          {privacyMode ? <EyeOff className="w-4 h-4 text-[#059669]" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Notifications Icon */}
        <button
          className="relative w-10 h-10 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors border border-transparent hover:border-[#E2E8F0] focus-visible:ring-2 focus-visible:ring-[#10B981]"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#10B981] ring-2 ring-white"></span>
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-[#F1F5F9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] min-h-[44px]"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            aria-label="User Account Menu"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {initials}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${
                userMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-[#E2E8F0]">
                <p className="text-xs font-semibold text-[#0F172A] truncate">{userDisplayName}</p>
                <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                  {user?.email || 'user@example.com'}
                </p>
              </div>

              <div className="py-1">
                <Link
                  href="/settings/security"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Security & MFA</span>
                </Link>
                <Link
                  href="/settings/members"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Workspace Members</span>
                </Link>
              </div>

              <div className="border-t border-[#E2E8F0] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors font-medium text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
