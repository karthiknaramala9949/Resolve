import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateOtp,
  timingSafeEqual,
} from '../../convex/crypto';
import { toSafeUserProfile } from '../../convex/authHelper';
import { Doc } from '../../convex/_generated/dataModel';

describe('Convex Backend Engine & Cryptographic Subsystem', () => {
  it('hashes passwords using WebCrypto PBKDF2 with SHA-512 and verifies correctly', async () => {
    const password = 'KarthikSecurePassword@2026';
    const { hash, salt } = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(salt).toHaveLength(64); // 32 bytes in hex = 64 characters
    expect(hash).toHaveLength(128); // 64 bytes = 128 characters

    // Verify correct password
    const isCorrect = await verifyPassword(password, hash, salt);
    expect(isCorrect).toBe(true);

    // Verify wrong password
    const isWrong = await verifyPassword('IncorrectPassword#1', hash, salt);
    expect(isWrong).toBe(false);

    // Verify tampered salt
    const tamperedSalt = salt.slice(0, -2) + 'ff';
    const isTampered = await verifyPassword(password, hash, tamperedSalt);
    expect(isTampered).toBe(false);
  });

  it('performs timing-safe string comparison to protect against side-channel timing attacks', () => {
    const secret = 'a3f89e2c45b78d10';
    expect(timingSafeEqual(secret, secret)).toBe(true);
    expect(timingSafeEqual(secret, 'a3f89e2c45b78d11')).toBe(false);
    expect(timingSafeEqual(secret, 'short')).toBe(false);
  });

  it('generates cryptographic session tokens and 6-digit numeric OTPs', () => {
    const token = generateToken(32);
    expect(token).toHaveLength(64); // 32 bytes hex = 64 chars

    const otp = generateOtp(6);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('sanitizes user documents and never exposes passwordHash or passwordSalt', () => {
    const mockUserDoc: any = {
      _id: 'user_mock_123',
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      phoneNumber: '+919876543210',
      image: null,
      providers: ['email', 'phone'],
      passwordHash: 'secret_hash_value_that_must_never_leak',
      passwordSalt: 'secret_salt_value',
      googleId: null,
      emailVerified: true,
      emailVerifiedAt: '2026-11-10T10:00:00Z',
      phoneVerified: true,
      phoneVerifiedAt: '2026-11-10T10:05:00Z',
      role: 'consumer',
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:05:00Z',
      lastLoginAt: '2026-11-11T08:00:00Z',
    };

    const safeProfile = toSafeUserProfile(mockUserDoc);

    expect(safeProfile.id).toBe('user_mock_123');
    expect(safeProfile.name).toBe('Rohan Sharma');
    expect(safeProfile.email).toBe('rohan@example.com');
    expect((safeProfile as any).passwordHash).toBeUndefined();
    expect((safeProfile as any).passwordSalt).toBeUndefined();
  });
});

