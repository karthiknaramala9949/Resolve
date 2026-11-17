import { describe, it, expect, beforeEach } from 'vitest';
import { verifySessionCookie, isOriginAllowed, middleware } from '@/middleware';
import { signPayload } from '@/lib/server/auth/crypto';
import { NextRequest } from 'next/server';

describe('Middleware Session Cookie Verification (WebCrypto HMAC-SHA256)', () => {
  const secret = 'test_secret_must_be_at_least_32_characters_long_for_security';

  it('passes a valid signed cookie', async () => {
    const token = 'valid_session_token_1234567890abcdef';
    const signed = signPayload(token, secret);

    const isValid = await verifySessionCookie(signed, secret);
    expect(isValid).toBe(true);
  });

  it('fails with malformed or arbitrary format like a.b', async () => {
    const isValid = await verifySessionCookie('a.b', secret);
    expect(isValid).toBe(false);
  });

  it('fails when payload is tampered', async () => {
    const token = 'valid_session_token_1234567890abcdef';
    const signed = signPayload(token, secret);
    const signature = signed.split('.')[1];
    const tampered = `attacker_token.${signature}`;

    const isValid = await verifySessionCookie(tampered, secret);
    expect(isValid).toBe(false);
  });

  it('fails when cookie is empty, undefined, or missing', async () => {
    expect(await verifySessionCookie('', secret)).toBe(false);
    expect(await verifySessionCookie(null, secret)).toBe(false);
    expect(await verifySessionCookie(undefined, secret)).toBe(false);
    expect(await verifySessionCookie('no_dot_cookie', secret)).toBe(false);
  });

  it('fails when secret is missing or shorter than 32 characters', async () => {
    const token = 'valid_session_token_1234567890abcdef';
    const signed = signPayload(token, secret);

    const originalSecret = process.env.BETTER_AUTH_SECRET;
    try {
      delete process.env.BETTER_AUTH_SECRET;
      expect(await verifySessionCookie(signed, '')).toBe(false);
      expect(await verifySessionCookie(signed, undefined)).toBe(false);
      expect(await verifySessionCookie(signed, 'short_secret')).toBe(false);
    } finally {
      process.env.BETTER_AUTH_SECRET = originalSecret;
    }
  });

  it('fails when signature is tampered', async () => {
    const token = 'valid_session_token_1234567890abcdef';
    const signed = signPayload(token, secret);
    const tamperedSig = signed.slice(0, -4) + 'zzzz';

    const isValid = await verifySessionCookie(tamperedSig, secret);
    expect(isValid).toBe(false);
  });
});

describe('Middleware CORS, Origin Allowlist & HTTPS Hardening', () => {
  it('correctly matches same-origin host and trusted app URLs', () => {
    expect(isOriginAllowed('http://localhost:3000', 'localhost:3000')).toBe(true);
    expect(isOriginAllowed('https://resolve.one', 'resolve.one')).toBe(true);
    expect(isOriginAllowed('https://attacker.evil.com', 'resolve.one')).toBe(false);
  });

  it('handles OPTIONS preflight safely and rejects untrusted origins with 403', async () => {
    // 1. Untrusted origin -> 403
    const badPreflight = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://attacker.evil.com',
        host: 'localhost:3000',
      },
    });
    const resBad = await middleware(badPreflight);
    expect(resBad.status).toBe(403);

    // 2. Trusted origin -> 204 with explicit origin headers
    const goodPreflight = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
    });
    const resGood = await middleware(goodPreflight);
    expect(resGood.status).toBe(204);
    expect(resGood.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(resGood.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('rejects cross-site state-changing API requests', async () => {
    // Cross-site fetch metadata
    const crossSiteReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'cross-site',
        host: 'localhost:3000',
      },
    });
    const resCrossSite = await middleware(crossSiteReq);
    expect(resCrossSite.status).toBe(403);

    // Mismatched origin
    const badOriginReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        origin: 'https://attacker.evil.com',
        host: 'localhost:3000',
      },
    });
    const resBadOrigin = await middleware(badOriginReq);
    expect(resBadOrigin.status).toBe(403);
  });

  it('permits requests with no Origin header (same-origin GET/POST, mobile apps, curl)', async () => {
    const noOriginReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
      },
    });
    const res = await middleware(noOriginReq);
    expect(res.status).not.toBe(403);
  });

  it('permits OAuth and Better Auth callbacks with POST, but blocks PUT/DELETE or webhooks', async () => {
    // 1. Legitimate OAuth POST callback is allowed
    const oauthCallbackReq = new NextRequest('http://localhost:3000/api/auth/callback/google', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'cross-site',
        origin: 'https://accounts.google.com',
        host: 'localhost:3000',
      },
    });
    const res = await middleware(oauthCallbackReq);
    expect(res.status).not.toBe(403);

    // 2. Disallowed methods (DELETE, PUT) on callback path are blocked
    const deleteCallbackReq = new NextRequest('http://localhost:3000/api/auth/callback/google', {
      method: 'DELETE',
      headers: {
        'sec-fetch-site': 'cross-site',
        origin: 'https://accounts.google.com',
        host: 'localhost:3000',
      },
    });
    const resDelete = await middleware(deleteCallbackReq);
    expect(resDelete.status).toBe(403);

    // 3. Webhook endpoints have zero exemption and are blocked on untrusted cross-origin
    const webhookReq = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'cross-site',
        origin: 'https://attacker.evil.com',
        host: 'localhost:3000',
      },
    });
    const resWebhook = await middleware(webhookReq);
    expect(resWebhook.status).toBe(403);
  });

  it('redirects HTTP to HTTPS in production', async () => {
    const origEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      const httpReq = new NextRequest('http://resolve.one/app/overview', {
        headers: {
          'x-forwarded-proto': 'http',
          host: 'resolve.one',
        },
      });
      const res = await middleware(httpReq);
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe('https://resolve.one/app/overview');
    } finally {
      (process.env as any).NODE_ENV = origEnv;
    }
  });
});

describe('Routing and Session Behavior: Landing Page vs App Shell', () => {
  const secret = 'test_secret_must_be_at_least_32_characters_long_for_security';
  const validToken = 'valid_session_token_1234567890abcdef';
  let validCookie: string;

  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = secret;
    // Embed future expiration timestamp
    const futureExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    validCookie = signPayload(`${validToken}:${futureExpiry}`, secret);
  });

  it('Valid session + GET / → redirect to /app/overview', async () => {
    const req = new NextRequest('http://localhost:3000/', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/app/overview');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('Valid session + GET /app/cases → allowed', async () => {
    const req = new NextRequest('http://localhost:3000/app/cases', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('No session + GET /app/overview → redirect to sign-in or landing', async () => {
    const req = new NextRequest('http://localhost:3000/app/overview');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?next=%2Fapp%2Foverview');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('Expired cookie + GET /app/* → redirect and cookie cleared', async () => {
    const pastExpiry = Date.now() - 60 * 1000; // 1 minute ago
    const expiredCookie = signPayload(`${validToken}:${pastExpiry}`, secret);

    const req = new NextRequest('http://localhost:3000/app/cases', {
      headers: {
        cookie: `resolve_session=${expiredCookie}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fapp%2Fcases');

    // Cookie must be cleared
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('resolve_session=;');
    expect(setCookie).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i);
  });

  it('Tampered cookie + GET /app/* → redirect and cookie cleared', async () => {
    const tamperedCookie = 'attacker_token.forged_signature_123456';
    const req = new NextRequest('http://localhost:3000/app/overview', {
      headers: {
        cookie: `resolve_session=${tamperedCookie}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fapp%2Foverview');

    // Cookie must be cleared
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('resolve_session=;');
    expect(setCookie).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i);
  });

  it('Valid session + GET /auth/signin → redirect to /app/overview', async () => {
    const req = new NextRequest('http://localhost:3000/auth/signin', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/app/overview');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('next param with an external URL is ignored and falls back safely', async () => {
    // 1. Signed-in user hitting /login with external open redirect target
    const reqAuth = new NextRequest('http://localhost:3000/login?next=https://attacker.evil.com/phish', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const resAuth = await middleware(reqAuth);
    expect(resAuth.status).toBe(307);
    expect(resAuth.headers.get('location')).toBe('http://localhost:3000/app/overview');

    // 2. Unauthenticated user hitting /app/cases with external open redirect query
    const reqUnauth = new NextRequest('http://localhost:3000/app/cases?next=//attacker.com');
    const resUnauth = await middleware(reqUnauth);
    expect(resUnauth.status).toBe(307);
    const location = resUnauth.headers.get('location');
    expect(location).toContain('/login?next=');
    expect(location).not.toContain('//attacker.com');
  });

  it('Sends Cache-Control: no-store on all /app/* and redirect responses', async () => {
    // 1. /app/* response
    const appReq = new NextRequest('http://localhost:3000/app/documents', {
      headers: {
        cookie: `resolve_session=${validCookie}`,
      },
    });
    const appRes = await middleware(appReq);
    expect(appRes.headers.get('Cache-Control')).toContain('no-store');
    expect(appRes.headers.get('Pragma')).toBe('no-cache');

    // 2. Redirect response
    const unauthReq = new NextRequest('http://localhost:3000/app/overview');
    const unauthRes = await middleware(unauthReq);
    expect(unauthRes.headers.get('Cache-Control')).toContain('no-store');
    expect(unauthRes.headers.get('Pragma')).toBe('no-cache');
  });

  it('a forged cookie named better-auth.session_token must not be treated as signed in', async () => {
    // Forged high-entropy unsigned cookie
    const forgedReq = new NextRequest('http://localhost:3000/app/overview', {
      headers: {
        cookie: 'better-auth.session_token=forged_unsigned_token_1234567890abcdef',
      },
    });
    const res = await middleware(forgedReq);

    // Must be rejected and redirected to login, NOT allowed through
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?next=');
  });

  it('parses structured JSON session cookies unambiguously', async () => {
    const futureExpiry = Date.now() + 60000;
    const jsonPayload = JSON.stringify({ t: 'json_token_456', exp: futureExpiry });
    const signedJson = signPayload(jsonPayload, secret);

    const validJsonReq = new NextRequest('http://localhost:3000/app/cases', {
      headers: {
        cookie: `resolve_session=${signedJson}`,
      },
    });
    const res = await middleware(validJsonReq);
    expect(res.status).toBe(200);

    // Expired JSON session
    const pastExpiry = Date.now() - 60000;
    const expiredJsonPayload = JSON.stringify({ t: 'json_token_456', exp: pastExpiry });
    const signedExpiredJson = signPayload(expiredJsonPayload, secret);

    const expiredJsonReq = new NextRequest('http://localhost:3000/app/cases', {
      headers: {
        cookie: `resolve_session=${signedExpiredJson}`,
      },
    });
    const expRes = await middleware(expiredJsonReq);
    expect(expRes.status).toBe(307);
    expect(expRes.headers.get('location')).toContain('/login?next=');
  });
});


