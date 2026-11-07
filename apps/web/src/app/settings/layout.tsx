'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Building2, Users, FileCheck2 } from 'lucide-react';

const SETTINGS_TABS = [
  { label: 'Security & Sessions', href: '/settings/security', icon: Shield },
  { label: 'Workspaces', href: '/settings/workspaces', icon: Building2 },
  { label: 'Team & Collaborators', href: '/settings/members', icon: Users },
  { label: 'Security Audit Log', href: '/settings/audit', icon: FileCheck2 },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Settings & Security</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your identity, authentication credentials, workspace tenants, and access controls
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
        {SETTINGS_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">{children}</div>
    </div>
  );
}
