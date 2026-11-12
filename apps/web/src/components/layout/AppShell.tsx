'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { NavProvider } from './NavContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth');

  if (isAuthRoute) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F8FAFC] text-[#0F172A]">
        {children}
      </main>
    );
  }

  return (
    <NavProvider>
      <div className="flex min-h-screen w-full bg-[#F8FAFC] text-[#0F172A]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </NavProvider>
  );
}
