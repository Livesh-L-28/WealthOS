'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth');

  if (isAuthRoute) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0B0F17] text-slate-100">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#0B0F17] text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
