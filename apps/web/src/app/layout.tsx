import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WealthOS — Enterprise Personal Wealth Intelligence',
  description: 'Enterprise-grade multi-tenant personal wealth management and financial intelligence platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#0B0F17] text-slate-100 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
