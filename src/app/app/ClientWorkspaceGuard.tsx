'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { authService } from '@/services';

export function ClientWorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Whenever the client finds no valid session, call /api/auth/logout to clear the cookie before redirecting
      authService.logout().finally(() => {
        const returnUrl = encodeURIComponent(pathname || '/app/overview');
        router.replace(`/login?next=${returnUrl}`);
      });
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // While verifying session, show a neutral loading state at most.
  // The app shell (sidebar, guest dashboard) must not render at all for unauthenticated users.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-coral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}

