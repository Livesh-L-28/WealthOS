'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, Shield, ChevronDown, Activity, LogOut, Settings, Users, Plus, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const { user, currentWorkspace, workspaces, switchWorkspace, logout } = useAuth();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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

  return (
    <header className="h-16 bg-[#111827]/80 backdrop-blur-sm border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Tenant / Workspace Selector */}
      <div className="flex items-center gap-4 relative" ref={workspaceRef}>
        <button
          type="button"
          onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          aria-expanded={workspaceMenuOpen}
          aria-haspopup="true"
        >
          <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
          <span className="font-medium max-w-[180px] truncate">
            {currentWorkspace ? `${currentWorkspace.name} (${currentWorkspace.base_currency})` : 'Select Workspace'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {workspaceMenuOpen && (
          <div className="absolute left-0 top-12 w-64 bg-[#161F30] border border-slate-700/80 rounded-lg shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
                      isSelected ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-medium truncate">{ws.name}</span>
                      <span className="text-[10px] text-slate-400">{ws.type} • {ws.base_currency}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-800 pt-1 mt-1 px-1">
              <Link
                href="/settings/workspaces"
                onClick={() => setWorkspaceMenuOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/50 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage & Create Workspaces</span>
              </Link>
            </div>
          </div>
        )}

        <Badge variant="positive" size="sm" className="hidden sm:inline-flex gap-1.5 items-center">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>Core API Connected</span>
        </Badge>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            readOnly
            placeholder="Search accounts, ledgers, transactions... (⌘K)"
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-4 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Right: Actions & User Profile */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings/security"
          aria-label="Security Status"
          className="p-2 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800/60 transition-colors"
        >
          <Shield className="w-4 h-4 text-indigo-400" />
        </Link>

        <button
          type="button"
          aria-label="Notifications"
          className="p-2 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800/60 relative transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5"></span>
        </button>

        <div className="h-6 w-px bg-slate-800 mx-1"></div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 pl-2 py-1 rounded-md hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center font-medium text-xs text-indigo-200">
              {initials}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 max-w-[120px] truncate">{userDisplayName}</span>
              <span className="text-[10px] text-slate-400 capitalize">{currentWorkspace?.role || 'Member'}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-[#161F30] border border-slate-700/80 rounded-lg shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-xs font-medium text-slate-200 truncate">{userDisplayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/settings/security"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Security & MFA</span>
                </Link>

                <Link
                  href="/settings/members"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Team & Collaborators</span>
                </Link>

                <Link
                  href="/settings/workspaces"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Workspace Settings</span>
                </Link>
              </div>

              <div className="border-t border-slate-800 pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
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
