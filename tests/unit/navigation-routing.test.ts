import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { signPayload } from '@/lib/server/auth/crypto';
import { sanitizeRedirectUrl } from '@/lib/server/auth/redirect';

describe('RESOLVE-ONE: Landing Page & Authentication Navigation Routing', () => {
  const secret = 'test_secret_must_be_at_least_32_characters_long_for_security';
  const validToken = 'valid_session_token_1234567890abcdef';
  let validCookie: string;

  beforeEach(() => {
    process.env.AUTH_SECRET = secret;
    process.env.BETTER_AUTH_SECRET = secret;
    validCookie = signPayload(validToken, secret);
  });

  // Scenario 1: Unauthenticated visitor opens `/` → landing page
  it('Scenario 1: Unauthenticated visitor opens `/` → displays public landing page without redirect', async () => {
    const req = new NextRequest('http://localhost:3000/');
    const res = await middleware(req);

    // Must NOT redirect (status 200 / next)
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    // Security headers must be present
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Content-Security-Policy')).toBeDefined();
  });

  // Scenario 2: Visitor clicks Login → `/login` (route accessible to unauthenticated visitors)
  it('Scenario 2: Unauthenticated visitor opens `/login` → displays login page without redirect', async () => {
    const req = new NextRequest('http://localhost:3000/login');
    const res = await middleware(req);

    // Must NOT redirect
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  // Scenario 4: Unauthenticated visitor opens `/app/overview` directly → `/login`
  it('Scenario 4: Unauthenticated visitor opens `/app/overview` directly → redirects to `/login`', async () => {
    const req = new NextRequest('http://localhost:3000/app/overview');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?next=%2Fapp%2Foverview');
  });

  // Scenario 5: Unauthenticated visitor opens another `/app/*` route → `/login`
  it('Scenario 5: Unauthenticated visitor opens another `/app/*` route (e.g. `/app/cases`) → redirects to `/login`', async () => {
    const req = new NextRequest('http://localhost:3000/app/cases?status=open');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?next=%2Fapp%2Fcases%3Fstatus%3Dopen');
  });

  // Scenario 6: Authenticated visitor opens `/` → landing page (NO automatic redirect to dashboard)
  it('Scenario 6: Authenticated visitor opens `/` → displays landing page without redirecting to `/app/overview`', async () => {
    const req = new NextRequest('http://localhost:3000/', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const res = await middleware(req);

    // CRITICAL: Even if authenticated, visiting '/' MUST NOT redirect to /app/overview
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  // Scenario 7: Visitor opens `/login` with existing session -> displays login page without redirect
  it('Scenario 7: Visitor opens `/login` (even with existing session) → displays login page without redirect', async () => {
    const req = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const res = await middleware(req);

    // CRITICAL: Must show login page, NOT redirect to app
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  // Scenario 7b: Visitor opens `/signup` with existing session -> displays signup page without redirect
  it('Scenario 7b: Visitor opens `/signup` (even with existing session) → displays signup page without redirect', async () => {
    const req = new NextRequest('http://localhost:3000/signup', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const res = await middleware(req);

    // CRITICAL: Must show signup page, NOT redirect to app
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  // Scenario 8: Authenticated visitor refreshes `/app/overview` → remains authenticated
  it('Scenario 8: Authenticated visitor refreshes `/app/overview` → stays on `/app/overview`', async () => {
    const req = new NextRequest('http://localhost:3000/app/overview', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  // Scenario 10: Invalid callback URL → rejected safely
  it('Scenario 10: Malicious or open redirect callback URLs are safely rejected and sanitized', () => {
    const origin = 'http://localhost:3000';

    // Protocol-relative URLs
    expect(sanitizeRedirectUrl('//evil-attacker.com', origin)).toBe('/app/overview');
    expect(sanitizeRedirectUrl('///attacker.com', origin)).toBe('/app/overview');

    // Backslash tricks
    expect(sanitizeRedirectUrl('/\\evil.com', origin)).toBe('/app/overview');
    expect(sanitizeRedirectUrl('\\/evil.com', origin)).toBe('/app/overview');
    expect(sanitizeRedirectUrl('\\\\evil.com', origin)).toBe('/app/overview');

    // JavaScript pseudo-protocol
    expect(sanitizeRedirectUrl('javascript:alert(1)', origin)).toBe('/app/overview');
    expect(sanitizeRedirectUrl('data:text/html,<script>alert(1)</script>', origin)).toBe('/app/overview');

    // External origins
    expect(sanitizeRedirectUrl('https://evil-phishing-site.com/app/overview', origin)).toBe('/app/overview');

    // Valid relative paths must be accepted
    expect(sanitizeRedirectUrl('/app/cases?id=123', origin)).toBe('/app/cases?id=123');
    expect(sanitizeRedirectUrl('/app/documents', origin)).toBe('/app/documents');
    expect(sanitizeRedirectUrl('http://localhost:3000/app/profile', origin)).toBe('/app/profile');
  });

  // Scenario 11: No redirect loops between `/`, `/login`, and `/app/overview`
  it('Scenario 11: No redirect loops exist between `/`, `/login`, and `/app/overview`', async () => {
    // 1. Unauthenticated state:
    const unauthRoot = await middleware(new NextRequest('http://localhost:3000/'));
    expect(unauthRoot.status).toBe(200); // Does NOT redirect

    const unauthLogin = await middleware(new NextRequest('http://localhost:3000/login'));
    expect(unauthLogin.status).toBe(200); // Does NOT redirect

    const unauthApp = await middleware(new NextRequest('http://localhost:3000/app/overview'));
    expect(unauthApp.status).toBe(307); // Redirects to /login
    expect(unauthApp.headers.get('location')).toContain('/login');

    // 2. Authenticated state:
    const authHeaders = { headers: { cookie: `resolve_session=${validCookie}` } };

    const authRoot = await middleware(new NextRequest('http://localhost:3000/', authHeaders));
    expect(authRoot.status).toBe(200); // Does NOT redirect to /app/overview

    const authApp = await middleware(new NextRequest('http://localhost:3000/app/overview', authHeaders));
    expect(authApp.status).toBe(200); // Allowed through

    const authLogin = await middleware(new NextRequest('http://localhost:3000/login', authHeaders));
    expect(authLogin.status).toBe(200); // Renders login page directly (no auto-redirect)
    expect(authLogin.headers.get('location')).toBeNull();

    // Neither state forms a loop A -> B -> A
  });
});

