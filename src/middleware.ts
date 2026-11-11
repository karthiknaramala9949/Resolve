import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const SESSION_COOKIE_NAME = 'resolve_session';

/**
 * Checks and cryptographically validates a Better Auth session cookie at the Edge.
 * When signed (`<token>.<signature>`), verifies HMAC-SHA256 against BETTER_AUTH_SECRET or AUTH_SECRET.
 * Rejects forged, malformed, or missing signatures.
 */
export async function hasBetterAuthSession(
  req: NextRequest | { headers: Headers },
  secret?: string
): Promise<boolean> {
  try {
    const token = getSessionCookie(req as any);
    if (!token || token.trim().length === 0) return false;

    // Better Auth signs cookies when secret is provided: `<token>.<signature>`
    if (token.includes('.')) {
      const authSecret =
        secret ||
        process.env.BETTER_AUTH_SECRET ||
        process.env.AUTH_SECRET;
      if (!authSecret || authSecret.length < 32) return false;
      return await verifySessionCookie(token, authSecret);
    }

    // In production, un-signed cookie tokens are strictly prohibited
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    // In dev without cookie signing, require minimum token entropy
    return token.length >= 16;
  } catch {
    return false;
  }
}

/**
 * Verifies the HMAC-SHA256 signature of a signed session cookie using WebCrypto.
 * Format: `<payload>.<signature>` (where signature is base64url-encoded HMAC-SHA256).
 * Note: Valid signature proves only that the cookie was not forged; active session
 * validity is still verified against the database by server API routes.
 * Preserved for backward compatibility until M2.3 migration is complete.
 */
export async function verifySessionCookie(
  cookieValue?: string | null,
  secret?: string
): Promise<boolean> {
  if (!cookieValue) return false;

  const authSecret = secret ?? process.env.AUTH_SECRET;
  if (!authSecret || authSecret.length < 32) {
    return false;
  }

  const lastDot = cookieValue.lastIndexOf('.');
  if (lastDot === -1) return false;

  const payload = cookieValue.slice(0, lastDot);
  const signature = cookieValue.slice(lastDot + 1);
  if (!payload || !signature) return false;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(authSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let base64 = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const binary = atob(base64);
    const sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i);
    }

    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(payload)
    );
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  
  // 1. Check for Better Auth session cookie (cryptographically verified)
  const isBetterAuthAuthenticated = await hasBetterAuthSession(req);

  // 2. Check for legacy signed session cookie (backward compatibility during M2.2)
  const legacySessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isLegacyAuthenticated = await verifySessionCookie(legacySessionCookie);

  const isAuthenticated = isBetterAuthAuthenticated || isLegacyAuthenticated;

  const isProtectedRoute = pathname.startsWith('/app');
  const isAuthPage =
    pathname.startsWith('/auth/signin') ||
    pathname.startsWith('/auth/signup') ||
    pathname === '/login' ||
    pathname === '/signup';

  // 1. Unauthenticated user trying to access protected workspace routes
  if (isProtectedRoute && !isAuthenticated) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    const redirectUrl = new URL(`/auth/signin?next=${returnUrl}`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Authenticated user trying to access sign-in or sign-up pages
  if (isAuthPage && isAuthenticated) {
    const nextParam = req.nextUrl.searchParams.get('next');
    const redirectTarget = nextParam || '/app/overview';
    return NextResponse.redirect(new URL(redirectTarget, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg
     * - public manifest or icons
     * - api routes
     */
    '/app/:path*',
    '/app',
    '/auth/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/verify-phone',
    '/account-setup',
  ],
};
