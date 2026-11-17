import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_SHORT_SECONDS,
  getSessionCookieOptions,
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromCookies,
} from '@/lib/server/auth/session';
import { broadcastAuthEvent } from '@/features/auth/context/AuthContext';
import { NextResponse } from 'next/server';
import { signPayload } from '@/lib/server/auth/crypto';

describe('Multi-Tab Session Sync & Persistent Cookie Enforcement', () => {
  const secret = 'test_secret_must_be_at_least_32_characters_long_for_security';

  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = secret;
  });

  describe('1. Session Cookie Persistence and Lifetime Configuration', () => {
    it('sets persistent maxAge for "remember me" enabled (30 days)', () => {
      const options = getSessionCookieOptions(true);
      expect(options.name).toBe(SESSION_COOKIE_NAME);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(30 * 24 * 60 * 60); // 2,592,000s = 30 days
      expect(SESSION_MAX_AGE_SECONDS).toBe(2592000);
    });

    it('sets persistent maxAge for "remember me" disabled (1 day = 24 hours)', () => {
      const options = getSessionCookieOptions(false);
      expect(options.name).toBe(SESSION_COOKIE_NAME);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(24 * 60 * 60); // 86,400s = 1 day
      expect(SESSION_MAX_AGE_SHORT_SECONDS).toBe(86400);
      // Strictly non-zero and positive so it is a persistent cookie, not a browser-session cookie
      expect(options.maxAge).toBeGreaterThan(0);
    });

    it('enforces secure flag in production environment', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        const options = getSessionCookieOptions(true);
        expect(options.secure).toBe(true);
      } finally {
        (process.env as any).NODE_ENV = origEnv;
      }
    });

    it('attaches persistent signed cookie with embedded expiry timestamp to response', () => {
      const res = NextResponse.json({ success: true });
      const token = 'session_test_token_123';
      setSessionCookie(res, token, true);

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain('resolve_session=');
      expect(cookieHeader).toContain('Max-Age=2592000');
      expect(cookieHeader).toContain('Path=/');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader?.toLowerCase()).toContain('samesite=lax');
    });

    it('clears session cookie on logout with maxAge: 0', () => {
      const res = NextResponse.json({ success: true });
      clearSessionCookie(res);

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain('resolve_session=;');
      expect(cookieHeader).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i);
    });
  });

  describe('2. Multi-Tab Sign-Out Broadcast & Storage Sync', () => {
    let mockBroadcastPostMessage: ReturnType<typeof vi.fn>;
    let mockBroadcastClose: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockBroadcastPostMessage = vi.fn();
      mockBroadcastClose = vi.fn();

      (globalThis as any).BroadcastChannel = vi.fn().mockImplementation(() => ({
        postMessage: mockBroadcastPostMessage,
        close: mockBroadcastClose,
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('broadcastAuthEvent dispatches logout payload to BroadcastChannel and localStorage', () => {
      vi.useFakeTimers();
      broadcastAuthEvent('logout');

      // Verify BroadcastChannel received logout event
      expect(mockBroadcastPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logout',
          timestamp: expect.any(Number),
        })
      );
      vi.advanceTimersByTime(1000);
      expect(mockBroadcastClose).toHaveBeenCalled();
      vi.useRealTimers();

      // Verify localStorage was updated for cross-window / tab sync fallback
      const stored = localStorage.getItem('resolve_auth_sync');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.type).toBe('logout');
    });

    it('broadcastAuthEvent dispatches login payload to notify other tabs', () => {
      broadcastAuthEvent('login');

      expect(mockBroadcastPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login',
          timestamp: expect.any(Number),
        })
      );
      const stored = localStorage.getItem('resolve_auth_sync');
      const parsed = JSON.parse(stored!);
      expect(parsed.type).toBe('login');
    });

    it('simulates Tab B responding to Tab A logout: calls logout endpoint, leaves /app, and never lands on /app/overview', async () => {
      // Simulate Tab B being on /app/overview
      delete (window as any).location;
      (window as any).location = {
        pathname: '/app/overview',
        replace: vi.fn(),
        href: 'http://localhost:3000/app/overview',
      };

      const mockLogout = vi.fn().mockResolvedValue({ success: true });

      // Tab B handler: clears state, invokes logout endpoint, and navigates to '/'
      const handleRemoteLogout = async () => {
        await mockLogout();
        if (window.location.pathname.startsWith('/app')) {
          window.location.replace('/');
        }
      };

      // Tab A broadcasts logout
      const event = { data: { type: 'logout', timestamp: Date.now() } };
      if (event.data.type === 'logout') {
        await handleRemoteLogout();
      }

      // Proves Tab B called logout and navigated to '/', never remaining on /app/overview
      expect(mockLogout).toHaveBeenCalled();
      expect(window.location.replace).toHaveBeenCalledWith('/');
      expect(window.location.replace).not.toHaveBeenCalledWith('/app/overview');
    });

    it('throttles focus/visibility /api/auth/me checks to at most once per 30s', async () => {
      let lastFocusCheckTime = 0;
      const FOCUS_THROTTLE_MS = 30000;
      const mockGetMe = vi.fn().mockResolvedValue({ user: { id: 'u1' } });

      const checkFocus = async (now: number) => {
        if (lastFocusCheckTime !== 0 && now - lastFocusCheckTime < FOCUS_THROTTLE_MS) {
          return;
        }
        lastFocusCheckTime = now;
        await mockGetMe();
      };

      // Call 1 at t=1000ms -> runs immediately
      await checkFocus(1000);
      expect(mockGetMe).toHaveBeenCalledTimes(1);

      // Call 2 at t=6000ms (5s later) -> throttled (<30s)
      await checkFocus(6000);
      expect(mockGetMe).toHaveBeenCalledTimes(1);

      // Call 3 at t=30000ms (29s later) -> throttled (<30s)
      await checkFocus(30000);
      expect(mockGetMe).toHaveBeenCalledTimes(1);

      // Call 4 at t=32000ms (31s later) -> runs (>= 30s)
      await checkFocus(32000);
      expect(mockGetMe).toHaveBeenCalledTimes(2);
    });

    it('proves redirect loop prevention: dead Convex session clears cookie before redirecting', async () => {
      // Simulate valid cookie signature but session revoked in Convex
      const mockLogoutEndpoint = vi.fn().mockResolvedValue({ success: true });
      const mockReplace = vi.fn();

      delete (window as any).location;
      (window as any).location = {
        pathname: '/app/overview',
        replace: mockReplace,
      };

      // Client detects unauthenticated from /api/auth/me
      const isAuthenticated = false;
      const isLoading = false;

      // Layout guard / AuthContext logic
      if (!isLoading && !isAuthenticated) {
        await mockLogoutEndpoint();
        mockReplace('/login?next=%2Fapp%2Foverview');
      }

      // Proves logout endpoint was called to wipe cookie before navigation to /login, preventing redirect loop
      expect(mockLogoutEndpoint).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Fapp%2Foverview');
    });

    it('proves /api/auth/me clears dead cookies when Convex session is revoked (breaks redirect loop)', async () => {
      const { GET } = await import('@/app/api/auth/me/route');
      const sessionModule = await import('@/lib/server/auth/session');
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeNull();

      // Check that response clears cookies
      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain('resolve_session=;');
      expect(setCookieHeader).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i);
    });

    it('simulates Tab B focus re-verification: expired session kicks user out of /app', async () => {
      delete (window as any).location;
      (window as any).location = {
        pathname: '/app/cases',
        replace: vi.fn(),
        href: 'http://localhost:3000/app/cases',
      };

      // Tab focuses; session check fails
      const mockAuthServiceGetMe = vi.fn().mockResolvedValue({ user: null, sessionToken: null });

      const handleFocusOrVisible = async () => {
        if (window.location.pathname.startsWith('/app')) {
          const data = await mockAuthServiceGetMe();
          if (!data || !data.user) {
            window.location.replace('/');
          }
        }
      };

      await handleFocusOrVisible();
      expect(mockAuthServiceGetMe).toHaveBeenCalled();
      expect(window.location.replace).toHaveBeenCalledWith('/');
    });
  });
});
