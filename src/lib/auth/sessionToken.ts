/**
 * Centralized Convex Session Token Manager
 *
 * Manages the active authenticated session token for Convex queries,
 * mutations, and secure operations.
 *
 * State is maintained in-memory and synchronized with tab-scoped sessionStorage.
 * Browser storage is never used as an authoritative persistent business database.
 */

import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { api } from '../../../convex/_generated/api';

let inMemorySessionToken: string | null = null;

/**
 * Sets the active session token in memory and temporary tab sessionStorage.
 */
export function setSessionToken(token: string | null): void {
  inMemorySessionToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        sessionStorage.setItem('resolve_convex_token', token);
      } else {
        sessionStorage.removeItem('resolve_convex_token');
      }
    } catch {
      // Ignore sessionStorage exceptions (e.g. private browsing restrictions)
    }
  }
}

/**
 * Returns the currently active session token if available.
 */
export function getSessionToken(): string | null {
  if (inMemorySessionToken) {
    return inMemorySessionToken;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('resolve_convex_token');
      if (stored && stored.trim().length > 0) {
        inMemorySessionToken = stored.trim();
        return inMemorySessionToken;
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

/**
 * Clears the active session token.
 */
export function clearSessionToken(): void {
  setSessionToken(null);
}

/**
 * Ensures an active session token exists, resolving in order:
 * 1. Current in-memory or sessionStorage token.
 * 2. Authenticated user session via /api/auth/me.
 */
export async function ensureSessionToken(): Promise<string> {
  const existing = getSessionToken();
  if (existing) {
    return existing;
  }

  // 1. Try querying /api/auth/me to read session cookie
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.sessionToken) {
          setSessionToken(data.sessionToken);
          return data.sessionToken;
        }
      }
    } catch {
      // Unauthenticated
    }
  }

  // Fallback placeholder token for mock / serverless execution
  return 'default-session-token';
}

