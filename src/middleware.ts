import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { sanitizeRedirectUrl } from '@/lib/server/auth/redirect';

const SESSION_COOKIE_NAME = 'resolve_session';

/**
 * Checks and cryptographically validates a Better Auth session cookie at the Edge.
 * When signed (`<token>.<signature>`), verifies HMAC-SHA256 against BETTER_AUTH_SECRET.
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
    // Forged or un-signed cookies must NEVER be accepted in any environment
    if (!token.includes('.')) {
      return false;
    }

    const authSecret =
      secret ||
      process.env.BETTER_AUTH_SECRET;
    if (!authSecret || authSecret.length < 32) return false;
    return await verifySessionCookie(token, authSecret);
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

  const authSecret =
    secret ??
    process.env.BETTER_AUTH_SECRET;
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

    const isSigValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(payload)
    );
    if (!isSigValid) return false;

    // Unambiguous expiry parsing
    // 1. Structured JSON payload: {"t":"<token>","exp":<timestamp>}
    if (payload.startsWith('{') && payload.endsWith('}')) {
      try {
        const parsed = JSON.parse(payload);
        if (typeof parsed.exp === 'number' && parsed.exp < Date.now()) {
          return false; // Expired
        }
        return Boolean(parsed.t);
      } catch {
        return false;
      }
    }

    // 2. Delimited format: `<token>:<expiresAt>`
    if (payload.includes(':')) {
      const lastColon = payload.lastIndexOf(':');
      const expiryStr = payload.slice(lastColon + 1);
      const expiryNum = Number(expiryStr);
      if (!isNaN(expiryNum)) {
        if (expiryNum < Date.now()) {
          return false; // Expired
        }
      } else {
        const expiryDate = new Date(expiryStr).getTime();
        if (!isNaN(expiryDate) && expiryDate < Date.now()) {
          return false; // Expired
        }
      }
      return true;
    }

    // 3. Legacy cookies without embedded expiry:
    // In production, un-timestamped legacy cookies are invalidated to enforce transition to secure timestamped sessions.
    // In development/test, permitted if cryptographic signature is valid.
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates request origin against the authorized application URL, Host, and local development origins.
 */
export function isOriginAllowed(origin: string, host: string | null): boolean {
  try {
    const originHost = new URL(origin).host;
    if (host && originHost === host) return true;

    const allowedUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL;
    if (allowedUrl) {
      const allowedHost = new URL(allowedUrl).host;
      if (originHost === allowedHost) return true;
    }

    if (process.env.NODE_ENV !== 'production') {
      if (
        originHost === 'localhost' ||
        originHost.startsWith('localhost:') ||
        originHost === '127.0.0.1' ||
        originHost.startsWith('127.0.0.1:')
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  // 0. Canonical HTTPS redirect in production
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers.get('x-forwarded-proto');
    if (proto === 'http') {
      const httpsUrl = new URL(req.url);
      httpsUrl.protocol = 'https:';
      return NextResponse.redirect(httpsUrl, 301);
    }
  }

  const { pathname, search } = req.nextUrl;
  
  // 1. Check for Better Auth session cookie (cryptographically verified)
  const isBetterAuthAuthenticated = await hasBetterAuthSession(req);

  // 2. Check for legacy signed session cookie (backward compatibility during M2.2)
  const legacySessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isLegacyAuthenticated = await verifySessionCookie(legacySessionCookie);

  // Guest Mode is completely removed: only authentic sessions are permitted
  const isAuthenticated = isBetterAuthAuthenticated || isLegacyAuthenticated;

  const hasSessionCookie =
    req.cookies.has(SESSION_COOKIE_NAME) ||
    req.cookies.has('better-auth.session_token') ||
    req.cookies.has('__Secure-better-auth.session_token');

  const isInvalidOrExpiredCookie = hasSessionCookie && !isAuthenticated;

  const isProtectedRoute =
    pathname.startsWith('/app') ||
    pathname === '/auth/setup' ||
    pathname.startsWith('/auth/setup') ||
    pathname === '/account-setup';

  const isAuthPage =
    pathname.startsWith('/auth/signin') ||
    pathname.startsWith('/auth/signup') ||
    pathname === '/login' ||
    pathname === '/signup';

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  function clearAuthCookies(res: NextResponse) {
    res.cookies.delete(SESSION_COOKIE_NAME);
    res.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0, expires: new Date(0) });
    res.cookies.delete('better-auth.session_token');
    res.cookies.set('better-auth.session_token', '', { path: '/', maxAge: 0, expires: new Date(0) });
    res.cookies.delete('__Secure-better-auth.session_token');
    res.cookies.set('__Secure-better-auth.session_token', '', { path: '/', maxAge: 0, expires: new Date(0) });
    res.cookies.delete('resolve_guest');
    res.cookies.set('resolve_guest', '', { path: '/', maxAge: 0, expires: new Date(0) });
  }

  function applySecurityHeaders(res: NextResponse): NextResponse {
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=()');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc = isDev
      ? `'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.convex.cloud https://challenges.cloudflare.com`
      : `'self' 'unsafe-inline' 'wasm-unsafe-eval' https://accounts.google.com https://*.convex.cloud https://challenges.cloudflare.com`;

    const connectSrc = isDev
      ? `'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://accounts.google.com https://challenges.cloudflare.com ws: wss:`
      : `'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://accounts.google.com https://challenges.cloudflare.com`;

    const csp = `
      default-src 'self';
      script-src ${scriptSrc};
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' data: https://fonts.gstatic.com;
      img-src 'self' data: blob: https:;
      connect-src ${connectSrc};
      frame-src 'self' https://accounts.google.com https://challenges.cloudflare.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim();

    res.headers.set('Content-Security-Policy', csp);
    return res;
  }

  // Handle /api routes: CORS lockdown, safe OPTIONS preflight, and state-changing cross-origin rejection
  if (pathname.startsWith('/api')) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    // 1. Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      if (!origin || isOriginAllowed(origin, host)) {
        const preflightHeaders = new Headers();
        if (origin) {
          preflightHeaders.set('Access-Control-Allow-Origin', origin);
          preflightHeaders.set('Vary', 'Origin');
          preflightHeaders.set('Access-Control-Allow-Credentials', 'true');
        }
        preflightHeaders.set(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        );
        preflightHeaders.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, x-nonce'
        );
        preflightHeaders.set('Access-Control-Max-Age', '86400');
        return applySecurityHeaders(
          new NextResponse(null, { status: 204, headers: preflightHeaders })
        );
      }
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Forbidden: Untrusted cross-origin preflight request.' },
          { status: 403 }
        )
      );
    }

    // 2. State-changing requests: reject cross-site mutations
    // OAuth 2.0 / OpenID Connect callbacks legitimately need only POST (e.g. form_post) and GET.
    // Restrict callback exemption strictly to POST; reject PUT, PATCH, DELETE across all endpoints.
    // Note: No webhook endpoints exist in the application, so zero webhook exemptions are granted.
    const method = req.method.toUpperCase();
    const isAllowedOAuthMethod = method === 'POST';
    const isAuthCallback = pathname.startsWith('/api/auth/callback') && isAllowedOAuthMethod;
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const secFetchSite = req.headers.get('sec-fetch-site');
      if (secFetchSite === 'cross-site' && !isAuthCallback) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: 'Forbidden: Cross-site mutation rejected.' },
            { status: 403 }
          )
        );
      }

      if (origin && !isOriginAllowed(origin, host) && !isAuthCallback) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: 'Forbidden: Untrusted request origin.' },
            { status: 403 }
          )
        );
      }
    }

    // Pass through API request with security headers and reflected origin
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    if (origin && isOriginAllowed(origin, host)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Vary', 'Origin');
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return applySecurityHeaders(res);
  }

  // 1. Unauthenticated user trying to access protected workspace routes or profile
  // Redirect to sign-in page with safe, same-origin-only `next` param.
  if (isProtectedRoute && !isAuthenticated) {
    const rawNext = `${pathname}${search}`;
    const safeNext = sanitizeRedirectUrl(rawNext, req.nextUrl.origin, '/app/overview');
    const redirectUrl = new URL(`/login?next=${encodeURIComponent(safeNext)}`, req.url);
    const response = NextResponse.redirect(redirectUrl, 307);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // If an invalid, expired, or tampered cookie was provided, clear it on redirect
    if (isInvalidOrExpiredCookie || req.cookies.has('resolve_guest')) {
      clearAuthCookies(response);
    }
    return applySecurityHeaders(response);
  }

  // 2. Authenticated user opening the site root ("/") or any auth page (/auth/signin, /auth/signup, /login, /signup)
  // Redirect straight to /app/overview (or safe `next` param if present). They never see landing or auth pages.
  if (isAuthenticated && (pathname === '/' || isAuthPage)) {
    let target = '/app/overview';
    if (isAuthPage) {
      const rawNext = req.nextUrl.searchParams.get('next');
      target = sanitizeRedirectUrl(rawNext, req.nextUrl.origin, '/app/overview');
    }
    const redirectUrl = new URL(target, req.url);
    const response = NextResponse.redirect(redirectUrl, 307);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return applySecurityHeaders(response);
  }

  // 3. Authenticated user opening /app base route -> redirect straight to /app/overview
  if (isAuthenticated && (pathname === '/app' || pathname === '/app/')) {
    const redirectUrl = new URL('/app/overview', req.url);
    const response = NextResponse.redirect(redirectUrl, 307);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return applySecurityHeaders(response);
  }

  // 4. Authenticated user accessing /app/* -> allow access with no-store cache control headers
  // Pressing Back after sign-out must not show cached app pages.
  if (isAuthenticated && pathname.startsWith('/app')) {
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return applySecurityHeaders(res);
  }

  // 5. Unauthenticated user accessing public pages (/ or auth pages)
  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (isInvalidOrExpiredCookie || req.cookies.has('resolve_guest')) {
    clearAuthCookies(res);
  }

  return applySecurityHeaders(res);
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
    '/',
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
    '/api/:path*',
  ],
};
