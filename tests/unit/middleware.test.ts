import { describe, it, expect } from 'vitest';
import { verifySessionCookie } from '@/middleware';
import { signPayload } from '@/lib/server/auth/crypto';

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

    const originalSecret = process.env.AUTH_SECRET;
    try {
      delete process.env.AUTH_SECRET;
      expect(await verifySessionCookie(signed, '')).toBe(false);
      expect(await verifySessionCookie(signed, undefined)).toBe(false);
      expect(await verifySessionCookie(signed, 'short_secret')).toBe(false);
    } finally {
      process.env.AUTH_SECRET = originalSecret;
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
