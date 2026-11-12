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
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Workspace Settings & Security</h1>
        <p className="text-xs text-[#475569] mt-1">
          Manage your identity, authentication credentials, workspace tenants, and access controls.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-1 overflow-x-auto">
        {SETTINGS_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-[#10B981] text-[#059669] bg-[#10B981]/5 font-semibold'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A] hover:border-[#E2E8F0]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#10B981]' : 'text-[#475569]'}`} />
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
