import React from 'react';
import { getCurrentUser } from '@/lib/server/auth/session';
import { ClientWorkspaceGuard } from './ClientWorkspaceGuard';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative server-side Convex session check on /app/*
  // Ensures a dead session never reaches the app shell or client DOM
  const auth = await getCurrentUser();
  if (!auth) {
    return <ClientWorkspaceGuard>{null}</ClientWorkspaceGuard>;
  }

  return <ClientWorkspaceGuard>{children}</ClientWorkspaceGuard>;
}
