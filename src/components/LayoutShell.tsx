'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdminDashboard = pathname.startsWith('/admin/dashboard');

  if (isAdminDashboard) {
    return <div className="min-h-screen bg-slate-50 flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <Header />
      <main className="flex-grow pt-20 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
