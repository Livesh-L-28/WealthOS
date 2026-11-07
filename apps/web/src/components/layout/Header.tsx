'use client';

import React from 'react';
import { Search, Bell, Shield, ChevronDown, Activity } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function Header() {
  return (
    <header className="h-16 bg-[#111827]/80 backdrop-blur-sm border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Left: Tenant / Workspace Selector */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
          <span className="font-medium">Primary Household (INR)</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

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
        {/* Security Shield */}
        <button
          type="button"
          aria-label="Security Status"
          className="p-2 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800/60"
        >
          <Shield className="w-4 h-4 text-indigo-400" />
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="p-2 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800/60 relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5"></span>
        </button>

        <div className="h-6 w-px bg-slate-800 mx-1"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-medium text-xs text-slate-200">
            LL
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-200">Livesh L</span>
            <span className="text-[10px] text-slate-400">Owner</span>
          </div>
        </div>
      </div>
    </header>
  );
}

