import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  signPayload,
  verifySignedPayload,
  generateRandomToken,
  generateNumericOtp,
  getAuthSecret,
} from '@/lib/server/auth/crypto';
import { rateLimiter, RATE_LIMITS } from '@/lib/server/auth/rateLimit';
import { authStore } from '@/lib/server/db/authStore';

describe('RESOLVE-ONE Authentication Engine', () => {
  describe('Cryptographic Security & Password Hashing', () => {
    it('hashes passwords with PBKDF2-HMAC-SHA512 and unique salts', () => {
      const pass = 'CustomerSecret@2026';
      const result1 = hashPassword(pass);
      const result2 = hashPassword(pass);

      expect(result1.hash).toBeDefined();
      expect(result1.salt).toBeDefined();
      expect(result1.hash.length).toBe(128); // 64 bytes = 128 hex chars
      expect(result1.salt.length).toBe(64); // 32 bytes = 64 hex chars

      // Different unique salts must yield different hashes
      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('verifies valid password and rejects invalid or tampered passwords', () => {
      const pass = 'Priya@Secure#91';
      const { hash, salt } = hashPassword(pass);

      // Valid
      expect(verifyPassword(pass, hash, salt)).toBe(true);

      // Wrong password
      expect(verifyPassword('WrongPassword#91', hash, salt)).toBe(false);

      // Tampered salt
      const tamperedSalt = salt.slice(0, -2) + 'aa';
      expect(verifyPassword(pass, hash, tamperedSalt)).toBe(false);

      // Tampered hash
      const tamperedHash = hash.slice(0, -2) + '00';
      expect(verifyPassword(pass, tamperedHash, salt)).toBe(false);
    });

    it('signs and verifies session tokens securely with HMAC-SHA256', () => {
      const token = generateRandomToken(32);
      const signed = signPayload(token);

      expect(signed).toContain('.');
      const extracted = verifySignedPayload(signed);
      expect(extracted).toBe(token);

      // Tampering with payload
      const tampered = 'evil_token.' + signed.split('.')[1];
      expect(verifySignedPayload(tampered)).toBeNull();

      // Tampering with signature
      const tamperedSig = signed.slice(0, -3) + 'xyz';
      expect(verifySignedPayload(tamperedSig)).toBeNull();
    });

    it('generates 6-digit numeric OTPs securely', () => {
      const otp = generateNumericOtp(6);
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('enforces AUTH_SECRET constraints in production and development', () => {
      const originalSecret = process.env.AUTH_SECRET;
      const originalEnv = process.env.NODE_ENV;

      try {
        // Missing secret in production throws
        (process.env as any).NODE_ENV = 'production';
        delete process.env.AUTH_SECRET;
        expect(() => getAuthSecret()).toThrow(/AUTH_SECRET environment variable is missing/);

        // Short secret (< 32 chars) in production throws
        process.env.AUTH_SECRET = 'short_secret';
        expect(() => getAuthSecret()).toThrow(/AUTH_SECRET environment variable is missing/);

        // Valid secret in production works
        process.env.AUTH_SECRET = 'a_very_long_production_secret_with_more_than_32_characters';
        expect(getAuthSecret()).toBe('a_very_long_production_secret_with_more_than_32_characters');

        // Development fallback generates a random per-process secret
        (process.env as any).NODE_ENV = 'development';
        delete process.env.AUTH_SECRET;
        const fallback = getAuthSecret();
        expect(fallback).toBeDefined();
        expect(fallback.length).toBeGreaterThanOrEqual(32);
      } finally {
        process.env.AUTH_SECRET = originalSecret;
        (process.env as any).NODE_ENV = originalEnv;
      }
    });
  });

  describe('Rate Limiter & Brute-Force Defense', () => {
    beforeEach(() => {
      rateLimiter.reset('test-ip-1');
    });

    it('allows requests within limit and throttles excess attempts', () => {
      const key = 'test-ip-1';
      const max = 3;
      const windowMs = 5000;

      // 1st
      let res = rateLimiter.check(key, max, windowMs);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(2);

      // 2nd
      res = rateLimiter.check(key, max, windowMs);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(1);

      // 3rd
      res = rateLimiter.check(key, max, windowMs);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(0);

      // 4th (exceeded)
      res = rateLimiter.check(key, max, windowMs);
      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.retryAfterSec).toBeGreaterThan(0);

      // Reset
      rateLimiter.reset(key);
      res = rateLimiter.check(key, max, windowMs);
      expect(res.allowed).toBe(true);
    });
  });

  describe('User Account Persistence & Multi-Provider Linking', () => {
    it('creates an email user and retrieves it by email and id', async () => {
      const testEmail = `user_${Date.now()}@consumer.in`;
      const pass = 'Karthik@123!';
      const { hash, salt } = hashPassword(pass);

      const user = await authStore.createUser({
        name: 'Karthik User',
        email: testEmail,
        phoneNumber: null,
        passwordHash: hash,
        passwordSalt: salt,
        providers: ['email'],
        emailVerified: false,
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.name).toBe('Karthik User');
      expect(user.providers).toContain('email');

      // Find by email
      const foundByEmail = await authStore.findUserByEmail(testEmail);
      expect(foundByEmail?.id).toBe(user.id);

      // Find by id
      const foundById = await authStore.findUserById(user.id);
      expect(foundById?.email).toBe(testEmail);

      // Sanitized profile should NOT expose password hash or salt
      const profile = authStore.toUserProfile(user);
      expect((profile as any).passwordHash).toBeUndefined();
      expect((profile as any).passwordSalt).toBeUndefined();
    });

    it('creates a phone user and retrieves it by phone number', async () => {
      const testPhone = `+9198765${Math.floor(10000 + Math.random() * 90000)}`;
      const pass = 'ConsumerPhone@2026';
      const { hash, salt } = hashPassword(pass);

      const user = await authStore.createUser({
        name: 'Phone Consumer',
        phoneNumber: testPhone,
        passwordHash: hash,
        passwordSalt: salt,
        providers: ['phone'],
        phoneVerified: false,
      });

      expect(user.phoneNumber).toBe(testPhone);
      const found = await authStore.findUserByPhone(testPhone);
      expect(found?.id).toBe(user.id);
    });

    it('links Google account to an existing email account without creating duplicate accounts', async () => {
      const commonEmail = `link_test_${Date.now()}@consumer.org`;

      // 1. User registers with email & password first
      const emailUser = await authStore.createUser({
        name: 'Alice Original',
        email: commonEmail,
        phoneNumber: null,
        passwordHash: 'hash_placeholder',
        passwordSalt: 'salt_placeholder',
        providers: ['email'],
        emailVerified: false,
      });

      // 2. Later, user signs in with Google using the same verified email
      const googleSub = `google_sub_${Date.now()}`;
      const linkedUser = await authStore.linkProvider(emailUser.id, 'google', {
        googleId: googleSub,
        image: 'https://example.com/avatar.jpg',
      });

      expect(linkedUser).not.toBeNull();
      expect(linkedUser?.id).toBe(emailUser.id);
      expect(linkedUser?.providers).toContain('email');
      expect(linkedUser?.providers).toContain('google');
      expect(linkedUser?.googleId).toBe(googleSub);
      expect(linkedUser?.emailVerified).toBe(true);

      // Searching by Google ID should return the exact same user account
      const foundByGoogle = await authStore.findUserByGoogleId(googleSub);
      expect(foundByGoogle?.id).toBe(emailUser.id);
    });

    it('manages sessions and invalidates on logout', async () => {
      const dummyId = `user_${Date.now()}`;
      const session = await authStore.createSession(dummyId, {
        userAgent: 'Vitest/2.0',
        ipAddress: '127.0.0.1',
      });

      expect(session.token).toBeDefined();
      expect(session.userId).toBe(dummyId);

      // Find session
      const found = await authStore.findSessionByToken(session.token);
      expect(found?.userId).toBe(dummyId);

      // Delete session (logout)
      await authStore.deleteSession(session.token);
      const afterLogout = await authStore.findSessionByToken(session.token);
      expect(afterLogout).toBeNull();
    });

    it('creates, verifies, and consumes verification tokens and OTPs', async () => {
      const phone = '+919999988888';
      const otp = '456789';

      // Create OTP token
      const tokenRecord = await authStore.createToken(phone, otp, 'phone_otp', 10);
      expect(tokenRecord.token).toBe(otp);

      // Find valid token
      const found = await authStore.findToken(phone, otp, 'phone_otp');
      expect(found?.id).toBe(tokenRecord.id);

      // Consume token
      await authStore.consumeToken(tokenRecord.id);
      const afterConsume = await authStore.findToken(phone, otp, 'phone_otp');
      expect(afterConsume).toBeNull();
    });
  });
});

