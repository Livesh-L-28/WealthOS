'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  Shield,
  ChevronDown,
  Activity,
  LogOut,
  Settings,
  Users,
  Plus,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const pathname = usePathname();
  const { user, currentWorkspace, workspaces, switchWorkspace, logout } = useAuth();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    : 'WO';

  const userDisplayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : 'WealthOS User';

  // Format breadcrumb title
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Executive Dashboard';
    if (pathname === '/accounts') return 'Financial Accounts';
    if (pathname === '/transactions') return 'Transaction Ledger';
    if (pathname === '/investments') return 'Investments & Holdings';
    if (pathname === '/analytics') return 'Expense & Cash Flow';
    if (pathname === '/budgets') return 'Budgets & Envelopes';
    if (pathname === '/goals') return 'Financial Goals';
    if (pathname === '/documents') return 'Document Vault';
    if (pathname === '/copilot') return 'AI Financial Copilot';
    if (pathname === '/net-worth') return 'Net Worth Statement';
    if (pathname?.startsWith('/settings')) return 'Workspace Settings';
    return 'Wealth Intelligence';
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[#E7ECE8] px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_2px_0_rgba(23,35,29,0.02)]">
      {/* Left: Breadcrumbs / Title & Workspace Selector */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col">
          <span className="text-xs text-[#758078] font-medium">Overview &bull; WealthOS</span>
          <span className="text-sm font-semibold text-[#17231D] tracking-tight">{getPageTitle()}</span>
        </div>

        <div className="h-5 w-px bg-[#E7ECE8] hidden sm:block"></div>

        {/* Workspace Dropdown */}
        <div className="relative" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] text-xs text-[#17231D] hover:bg-[#F0F4F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A36A] transition-colors font-medium shadow-sm"
            aria-expanded={workspaceMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-2 h-2 rounded-full bg-[#16A36A]"></div>
            <span className="max-w-[170px] truncate">
              {currentWorkspace ? `${currentWorkspace.name}` : 'Select Workspace'}
            </span>
            <span className="text-[10px] text-[#758078] font-mono">
              ({currentWorkspace?.base_currency || 'INR'})
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#758078] transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {workspaceMenuOpen && (
            <div className="absolute left-0 top-11 w-64 bg-white border border-[#E7ECE8] rounded-xl shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#758078] border-b border-[#E7ECE8]">
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
                          ? 'bg-[#16A36A]/10 text-[#087A50] font-semibold'
                          : 'text-[#17231D] hover:bg-[#F7F9F7]'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate">{ws.name}</span>
                        <span className="text-[10px] text-[#758078]">{ws.type} &bull; {ws.base_currency}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#16A36A] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-[#E7ECE8] pt-1 mt-1 px-1">
                <Link
                  href="/settings/workspaces"
                  onClick={() => setWorkspaceMenuOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#16A36A] hover:bg-[#16A36A]/10 rounded-lg transition-colors font-medium"
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
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <div className={`relative w-full rounded-xl transition-all ${
          searchFocused ? 'ring-2 ring-[#16A36A] bg-white' : 'bg-[#F7F9F7]'
        }`}>
          <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions, accounts, holdings... (⌘K)"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-9 pr-12 py-1.5 text-xs bg-transparent border border-[#E7ECE8] rounded-xl text-[#17231D] placeholder-[#9BA39D] focus:outline-none"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#758078] bg-white px-1.5 py-0.5 rounded border border-[#E7ECE8]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Date-Range, Status, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Core API Status */}
        <Badge variant="positive" size="sm" className="hidden lg:inline-flex gap-1.5 items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse"></span>
          <span>Core API Connected</span>
        </Badge>

        {/* Date Selector Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F7F9F7] border border-[#E7ECE8] text-xs text-[#17231D]">
          <Calendar className="w-3.5 h-3.5 text-[#758078]" />
          <span className="font-medium">Nov 2026</span>
        </div>

        {/* Notifications Icon */}
        <button
          className="relative w-8 h-8 rounded-xl text-[#758078] hover:text-[#17231D] hover:bg-[#F0F4F1] flex items-center justify-center transition-colors border border-transparent hover:border-[#E7ECE8]"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#16A36A] ring-2 ring-white"></span>
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-[#F0F4F1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A36A]"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#16A36A] to-[#087A50] text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {initials}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[#758078] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-56 bg-white border border-[#E7ECE8] rounded-xl shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-[#E7ECE8]">
                <p className="text-xs font-semibold text-[#17231D] truncate">{userDisplayName}</p>
                <p className="text-[11px] text-[#758078] truncate mt-0.5">{user?.email || 'user@example.com'}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/settings/security"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#17231D] hover:bg-[#F7F9F7] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[#758078]" />
                  <span>Security & MFA</span>
                </Link>
                <Link
                  href="/settings/members"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#17231D] hover:bg-[#F7F9F7] transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-[#758078]" />
                  <span>Workspace Members</span>
                </Link>
              </div>

              <div className="border-t border-[#E7ECE8] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#DC5B5B] hover:bg-[#DC5B5B]/10 transition-colors font-medium text-left"
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
