import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken } from '@/lib/server/security/turnstile';

describe('Cloudflare Turnstile Server-Side Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('passes with standard Cloudflare test key and valid token', async () => {
    process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';

    const result = await verifyTurnstileToken('mock-turnstile-response-token');
    expect(result.success).toBe(true);
  });

  it('rejects with test key when token is missing or empty', async () => {
    process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';

    const resultEmpty = await verifyTurnstileToken('');
    expect(resultEmpty.success).toBe(false);
    expect(resultEmpty.error).toContain('token is required');

    const resultNull = await verifyTurnstileToken(null);
    expect(resultNull.success).toBe(false);
  });

  it('fails safely in production when secret key is missing', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    (process.env as any).NODE_ENV = 'production';

    const result = await verifyTurnstileToken('any-token');
    expect(result.success).toBe(false);
    expect(result.error).toContain('server configuration missing');
  });

  it('verifies token via Cloudflare API and handles success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'custom-secret-key-12345';
    (process.env as any).NODE_ENV = 'production';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        hostname: 'resolve.one',
        challenge_ts: '2026-11-17T14:00:00Z',
      }),
    } as any);

    const result = await verifyTurnstileToken('valid-token', '192.0.2.1');
    expect(result.success).toBe(true);
    expect(result.hostname).toBe('resolve.one');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('rejects when Cloudflare API returns success: false', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'custom-secret-key-12345';
    (process.env as any).NODE_ENV = 'production';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    } as any);

    const result = await verifyTurnstileToken('invalid-expired-token');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Security challenge verification failed');
  });

  it('strictly blocks Cloudflare test keys when NODE_ENV is production', async () => {
    process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
    (process.env as any).NODE_ENV = 'production';

    const result = await verifyTurnstileToken('some-mock-token');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cloudflare test keys cannot be used in production');
  });
});

