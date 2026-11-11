import { describe, it, expect, beforeEach, vi } from 'vitest';
import { betterAuth } from 'better-auth';
import { getSessionCookie } from 'better-auth/cookies';
import { hasBetterAuthSession } from '@/middleware';
import authConfig from '../../convex/auth.config';
import { validateAuthConfig } from '../../convex/auth';

describe('Milestone 2.2: Better Auth & Convex Backend Authentication Integration', () => {
  const secret = 'test_better_auth_secret_must_be_32_characters_long_min_len!';

  // Helper to construct a deterministic in-memory adapter for testing core Better Auth flows
  function createTestAuth(options: { enableGoogle?: boolean } = {}) {
    const users: any[] = [];
    const sessions: any[] = [];
    const accounts: any[] = [];
    const verifications: any[] = [];

    const auth = betterAuth({
      baseURL: 'http://localhost:3000',
      secret,
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        requireEmailVerification: false,
      },
      socialProviders: {
        google: {
          clientId: options.enableGoogle ? 'google-client-id-123' : '',
          clientSecret: options.enableGoogle ? 'google-client-secret-xyz' : '',
          enabled: Boolean(options.enableGoogle),
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // 1 day
      },
      account: {
        accountLinking: {
          enabled: true,
          trustedProviders: ['google'],
        },
      },
      database: () => ({
        id: 'in-memory-test-adapter',
        create: async ({ model, data }: any) => {
          const id = `${model}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
          if (model === 'user') users.push(record);
          else if (model === 'session') sessions.push(record);
          else if (model === 'account') accounts.push(record);
          else if (model === 'verification') verifications.push(record);
          return record;
        },
        findOne: async ({ model, where }: any) => {
          const list =
            model === 'user'
              ? users
              : model === 'session'
              ? sessions
              : model === 'account'
              ? accounts
              : verifications;
          return list.find((item: any) => where.every((w: any) => item[w.field] === w.value)) || null;
        },
        findMany: async ({ model, where }: any) => {
          const list =
            model === 'user'
              ? users
              : model === 'session'
              ? sessions
              : model === 'account'
              ? accounts
              : verifications;
          if (!where) return list;
          return list.filter((item: any) => where.every((w: any) => item[w.field] === w.value));
        },
        updateOne: async ({ model, where, update }: any) => {
          const list =
            model === 'user'
              ? users
              : model === 'session'
              ? sessions
              : model === 'account'
              ? accounts
              : verifications;
          const item = list.find((it: any) => where.every((w: any) => it[w.field] === w.value));
          if (item) Object.assign(item, update, { updatedAt: new Date() });
          return item || null;
        },
        updateMany: async () => {},
        delete: async ({ model, where }: any) => {
          const list =
            model === 'user'
              ? users
              : model === 'session'
              ? sessions
              : model === 'account'
              ? accounts
              : verifications;
          const idx = list.findIndex((it: any) => where.every((w: any) => it[w.field] === w.value));
          if (idx !== -1) list.splice(idx, 1);
          return true;
        },
        deleteOne: async ({ model, where }: any) => {
          const list =
            model === 'user'
              ? users
              : model === 'session'
              ? sessions
              : model === 'account'
              ? accounts
              : verifications;
          const idx = list.findIndex((it: any) => where.every((w: any) => it[w.field] === w.value));
          if (idx !== -1) list.splice(idx, 1);
          return true;
        },
        deleteMany: async ({ model, where }: any) => {
          const list =
            model === 'user'
              ? users
              : model === 'session'
              ? sessions
              : model === 'account'
              ? accounts
              : verifications;
          let count = 0;
          for (let i = list.length - 1; i >= 0; i--) {
            const it = list[i];
            if (!where || where.every((w: any) => it[w.field] === w.value)) {
              list.splice(i, 1);
              count++;
            }
          }
          return count;
        },
      }),
    });

    return { auth, users, sessions, accounts, verifications };
  }

  describe('1. Registration & Password Security', () => {
    it('successfully registers a user with valid email and strong password', async () => {
      const { auth, users } = createTestAuth();

      const result = await auth.api.signUpEmail({
        body: {
          name: 'Karthik Naramala',
          email: 'karthik@example.com',
          password: 'SecurePassword123!',
        },
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('karthik@example.com');
      expect(result.user.name).toBe('Karthik Naramala');
      expect(users.length).toBe(1);
    });

    it('rejects duplicate registration for an already registered email', async () => {
      const { auth } = createTestAuth();

      await auth.api.signUpEmail({
        body: {
          name: 'First User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        },
      });

      await expect(
        auth.api.signUpEmail({
          body: {
            name: 'Second User',
            email: 'duplicate@example.com',
            password: 'DifferentPassword123!',
          },
        })
      ).rejects.toThrow();
    });

    it('enforces minimum password length of 8 characters', async () => {
      const { auth } = createTestAuth();

      await expect(
        auth.api.signUpEmail({
          body: {
            name: 'Short Password User',
            email: 'short@example.com',
            password: 'short',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Authentication, Session Retrieval & Revocation', () => {
    it('rejects login with incorrect password', async () => {
      const { auth } = createTestAuth();

      await auth.api.signUpEmail({
        body: {
          name: 'Login Test',
          email: 'logintest@example.com',
          password: 'CorrectPassword123!',
        },
      });

      await expect(
        auth.api.signInEmail({
          body: {
            email: 'logintest@example.com',
            password: 'WrongPassword999!',
          },
        })
      ).rejects.toThrow();
    });

    it('creates active session with 30-day expiration on successful authentication', async () => {
      const { auth, sessions } = createTestAuth();

      await auth.api.signUpEmail({
        body: {
          name: 'Session Test',
          email: 'session@example.com',
          password: 'ValidPassword123!',
        },
      });

      expect(sessions.length).toBeGreaterThan(0);
      const session = sessions[0];
      expect(session.userId).toBeDefined();
      expect(session.expiresAt).toBeDefined();

      // Verify expiration is ~30 days in the future
      const expires = new Date(session.expiresAt).getTime();
      const now = Date.now();
      const diffDays = (expires - now) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(28);
      expect(diffDays).toBeLessThanOrEqual(31);
    });

    it('revokes session on sign out', async () => {
      const { auth, sessions } = createTestAuth();

      const signUpResponse = await auth.api.signUpEmail({
        body: {
          name: 'Sign Out Test',
          email: 'signout@example.com',
          password: 'ValidPassword123!',
        },
        asResponse: true,
      });

      expect(sessions.length).toBe(1);
      const setCookie = signUpResponse.headers.get('set-cookie') || '';

      // Sign out using session cookie
      await auth.api.signOut({
        headers: new Headers({
          cookie: setCookie,
        }),
      });

      // Session should be removed or invalidated
      expect(sessions.length).toBe(0);
    });
  });

  describe('3. Google OAuth Configuration & Account Linking Security', () => {
    it('enables Google OAuth provider when credentials are present', () => {
      const { auth } = createTestAuth({ enableGoogle: true });
      expect(auth.options.socialProviders?.google).toBeDefined();
      expect(auth.options.socialProviders?.google?.clientId).toBe('google-client-id-123');
    });

    it('safely disables Google OAuth provider when credentials are empty', () => {
      const { auth } = createTestAuth({ enableGoogle: false });
      expect(auth.options.socialProviders?.google?.enabled).toBe(false);
    });

    it('configures safe account linking for trusted providers', () => {
      const { auth } = createTestAuth({ enableGoogle: true });
      expect(auth.options.account?.accountLinking?.enabled).toBe(true);
      expect(auth.options.account?.accountLinking?.trustedProviders).toContain('google');
    });
  });

  describe('4. Middleware Route Protection & Better Auth Cookie Handling', () => {
    it('detects valid Better Auth session cookie in request in development mode', async () => {
      const req = {
        headers: new Headers({
          cookie: 'better-auth.session_token=test_session_token_12345',
        }),
      };
      expect(await hasBetterAuthSession(req as any)).toBe(true);
    });

    it('detects secure HTTPS Better Auth session cookie in development mode', async () => {
      const req = {
        headers: new Headers({
          cookie: '__Secure-better-auth.session_token=secure_session_token_abcde',
        }),
      };
      expect(await hasBetterAuthSession(req as any)).toBe(true);
    });

    it('rejects empty or whitespace-only Better Auth session cookie', async () => {
      const req = {
        headers: new Headers({
          cookie: 'better-auth.session_token=   ',
        }),
      };
      expect(await hasBetterAuthSession(req as any)).toBe(false);
    });

    it('rejects when no cookie header is supplied', async () => {
      const req = {
        headers: new Headers(),
      };
      expect(await hasBetterAuthSession(req as any)).toBe(false);
    });

    it('rejects forged signed session cookie with invalid signature', async () => {
      const req = {
        headers: new Headers({
          cookie: 'better-auth.session_token=session_token_xyz.forged_signature_here',
        }),
      };
      expect(await hasBetterAuthSession(req as any, secret)).toBe(false);
    });

    it('accepts authentic signed session cookie with valid HMAC signature', async () => {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const token = 'valid_session_token_4567';
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(token));
      const b64 = Buffer.from(sig).toString('base64');
      const validCookie = `${token}.${b64}`;

      const req = {
        headers: new Headers({
          cookie: `better-auth.session_token=${validCookie}`,
        }),
      };
      expect(await hasBetterAuthSession(req as any, secret)).toBe(true);
    });

    it('rejects unsigned cookie tokens in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        const req = {
          headers: new Headers({
            cookie: 'better-auth.session_token=unsigned_token_12345',
          }),
        };
        expect(await hasBetterAuthSession(req as any, secret)).toBe(false);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });
  });

  describe('5. Convex Better Auth Provider Configuration & JWKS', () => {
    it('configures Convex JWT auth provider with custom RS256 JWKS endpoint', () => {
      expect(authConfig.providers).toBeDefined();
      expect(authConfig.providers.length).toBe(1);

      const provider = authConfig.providers[0];
      expect(provider.applicationID).toBe('convex');
      expect(provider.algorithm).toBe('RS256');
      expect(provider.type).toBe('customJwt');
      expect(provider.jwks).toContain('/api/auth/convex/jwks');
    });
  });

  describe('6. Environment Variables & Fail-Safe Defaults', () => {
    it('fails safely when secret is shorter than 32 characters in production', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        expect(() =>
          validateAuthConfig({
            secret: 'short',
          })
        ).toThrow(/32 characters/);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });

    it('validates secret successfully in production when secret is 32+ characters', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        const res = validateAuthConfig({
          secret: 'a_very_secure_32_character_long_secret_for_production',
        });
        expect(res.secret).toBe('a_very_secure_32_character_long_secret_for_production');
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });
  });
});
