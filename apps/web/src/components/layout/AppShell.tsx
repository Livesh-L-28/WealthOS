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
      <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F7F9F7] text-[#17231D]">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F7F9F7] text-[#17231D]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
