import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getConvexServerSecret, checkGateError } from '@/lib/server/auth/serverSecret';
import { getClientIp } from '@/lib/server/auth/ip';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as verifyOtpRoute } from '@/app/api/auth/otp/verify/route';

describe('Auth Routes Security: Gate Error Mapping, IP Resolution & Secret Enforcement', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.CONVEX_SERVER_SECRET = 'valid_test_convex_server_secret_at_least_32_chars_long';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('CONVEX_SERVER_SECRET Resolution (Item 1)', () => {
    it('returns secret when present and valid', () => {
      process.env.CONVEX_SERVER_SECRET = 'my_super_secret_server_token_1234567890';
      expect(getConvexServerSecret()).toBe('my_super_secret_server_token_1234567890');
    });

    it('throws clear error when CONVEX_SERVER_SECRET is missing or empty', () => {
      delete process.env.CONVEX_SERVER_SECRET;
      expect(() => getConvexServerSecret()).toThrow(/CONVEX_SERVER_SECRET environment variable is missing or empty/);

      process.env.CONVEX_SERVER_SECRET = '   ';
      expect(() => getConvexServerSecret()).toThrow(/CONVEX_SERVER_SECRET environment variable is missing or empty/);
    });

    it('throws in production if secret is shorter than 32 characters', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.CONVEX_SERVER_SECRET = 'short_secret';
      expect(() => getConvexServerSecret()).toThrow(/CONVEX_SERVER_SECRET must be at least 32 characters long in production/);
    });
  });

  describe('Edge IP Provenance & Anti-Spoofing (Item 2)', () => {
    it('reads x-real-ip set and overwritten by Vercel edge proxy', () => {
      const req = new NextRequest('https://resolve.one/api/auth/login', {
        headers: {
          'x-real-ip': '203.0.113.195',
        },
      });
      const res = getClientIp(req);
      expect(res.ip).toBe('203.0.113.195');
      expect(res.isTrusted).toBe(true);
    });

    it('reads cf-connecting-ip only when Cloudflare proxy headers (cf-ray) are present', () => {
      // 1. With cf-ray: trusted
      const cfReq = new NextRequest('https://resolve.one/api/auth/login', {
        headers: {
          'cf-ray': '8f1234567890abcd-IAD',
          'cf-connecting-ip': '198.51.100.42',
        },
      });
      const cfRes = getClientIp(cfReq);
      expect(cfRes.ip).toBe('198.51.100.42');
      expect(cfRes.isTrusted).toBe(true);

      // 2. Without cf-ray and no TRUST_CLOUDFLARE_PROXY: untrusted, falls to x-real-ip or unique key
      const spoofedReq = new NextRequest('https://resolve.one/api/auth/login', {
        headers: {
          'cf-connecting-ip': '198.51.100.42', // spoofed client header
          'x-real-ip': '203.0.113.1', // authentic Vercel edge header
        },
      });
      const spoofedRes = getClientIp(spoofedReq);
      expect(spoofedRes.ip).toBe('203.0.113.1');
    });

    it('generates unique per-request key and NEVER falls back to 127.0.0.1 when no trusted header exists', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
      const req = new NextRequest('https://resolve.one/api/auth/login', {
        headers: {},
      });
      const res = getClientIp(req);
      expect(res.ip).toMatch(/^untrusted_req_/);
      expect(res.ip).not.toBe('127.0.0.1');
      expect(res.isTrusted).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY WARNING]'));
    });
  });

  describe('Convex Server Gate Error Mapping to HTTP 500 (Item 4)', () => {
    it('maps SERVER_GATE_MISCONFIGURED to HTTP 500 with generic message and logs at error level', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const gateRes = checkGateError({
        ok: false,
        code: 'SERVER_GATE_MISCONFIGURED',
        error: 'Convex server-only auth gate is misconfigured: CONVEX_SERVER_SECRET is missing or too short.',
      });

      expect(gateRes).not.toBeNull();
      expect(gateRes?.status).toBe(500);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('[AUTH SECURITY ERROR]'));
    });

    it('maps UNAUTHORIZED_DIRECT_CALL to HTTP 500 with generic message and logs at error level', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const gateRes = checkGateError({
        ok: false,
        code: 'UNAUTHORIZED_DIRECT_CALL',
        error: 'Direct client authentication calls are forbidden. Authenticate via https://resolve.one.',
      });

      expect(gateRes).not.toBeNull();
      expect(gateRes?.status).toBe(500);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('[AUTH SECURITY ERROR]'));
    });

    it('returns null for legitimate business rejections like INVALID_CREDENTIALS', () => {
      const normalRes = checkGateError({
        ok: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Invalid email, phone number, or password.',
      });
      expect(normalRes).toBeNull();
    });
  });
});
