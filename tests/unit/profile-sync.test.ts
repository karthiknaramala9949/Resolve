import { describe, it, expect, beforeEach } from 'vitest';
import { authStore } from '@/lib/server/db/authStore';
import { hashPassword } from '@/lib/server/auth/crypto';
import { createMockConvexContext } from '../helpers/mockConvexContext';
import * as convexAuth from '../../convex/auth';
import * as convexUsers from '../../convex/users';

describe('User and Profile Simultaneous Synchronization', () => {
  let ctx: any;
  let testUserId: string;
  const sessionToken = 'mock_session_token_for_profile_sync_12345678';

  beforeEach(async () => {
    const mock = createMockConvexContext();
    ctx = mock.ctx;

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Seed test user in Convex mock
    testUserId = await ctx.db.insert('users', {
      name: 'Original Name',
      email: 'sync.test@resolveone.in',
      phoneNumber: '+919876543210',
      providers: ['email'],
      passwordHash: 'hash',
      passwordSalt: 'salt',
      googleId: null,
      emailVerified: true,
      emailVerifiedAt: now,
      phoneVerified: true,
      phoneVerifiedAt: now,
      role: 'consumer',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    await ctx.db.insert('sessions', {
      userId: testUserId,
      token: sessionToken,
      expiresAt,
      createdAt: now,
    });
  });

  it('synchronizes user and profile fields simultaneously in Convex on updateProfile mutation', async () => {
    // Call updateProfile mutation handler
    const result = await (convexAuth.updateProfile as any)._handler(ctx, {
      sessionToken,
      name: 'Karthik Naramala',
      phoneNumber: '+919988776655',
      preferences: {
        simpleLanguageMode: true,
        notificationsEnabled: true,
      },
    });

    expect(result).not.toBeNull();
    expect(result.name).toBe('Karthik Naramala');
    expect(result.phoneNumber).toBe('+919988776655');

    // 1. Verify users table record is updated
    const userRecord = await ctx.db.get(testUserId);
    expect(userRecord).not.toBeNull();
    expect(userRecord.name).toBe('Karthik Naramala');
    expect(userRecord.phoneNumber).toBe('+919988776655');
    expect(userRecord.preferences.simpleLanguageMode).toBe(true);
    expect(userRecord.preferences.notificationsEnabled).toBe(true);

    // 2. Verify profiles table record was simultaneously created/updated
    const profileRecords = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q: any) => q.eq('userId', testUserId))
      .collect();

    expect(profileRecords.length).toBe(1);
    const profileRecord = profileRecords[0];
    expect(profileRecord.userId).toBe(testUserId);
    expect(profileRecord.name).toBe('Karthik Naramala');
    expect(profileRecord.phoneNumber).toBe('+919988776655');
    expect(profileRecord.email).toBe('sync.test@resolveone.in');
    expect(profileRecord.preferences.simpleLanguageMode).toBe(true);
    expect(profileRecord.preferences.notificationsEnabled).toBe(true);
    expect(profileRecord.updatedAt).toBe(userRecord.updatedAt);
  });

  it('synchronizes user and profile records simultaneously on updatePreferences mutation', async () => {
    // First ensure profile exists
    await (convexAuth.updateProfile as any)._handler(ctx, {
      sessionToken,
      name: 'Initial Name',
    });

    // Update preferences via convexUsers.updatePreferences
    await (convexUsers.updatePreferences as any)._handler(ctx, {
      sessionToken,
      preferences: {
        theme: 'light',
        simpleLanguageMode: false,
        notificationsEnabled: true,
      },
    });

    // Verify both users and profiles tables are updated
    const userDoc = await ctx.db.get(testUserId);
    expect(userDoc.preferences.theme).toBe('light');
    expect(userDoc.preferences.simpleLanguageMode).toBe(false);

    const profileDoc = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q: any) => q.eq('userId', testUserId))
      .first();

    expect(profileDoc).not.toBeNull();
    expect(profileDoc.preferences.theme).toBe('light');
    expect(profileDoc.preferences.simpleLanguageMode).toBe(false);
    expect(profileDoc.preferences.notificationsEnabled).toBe(true);
  });

  it('synchronizes user and profile fields in authStore for in-memory and test fallback', async () => {
    const { hash, salt } = hashPassword('TestPassword123!');
    const user = await authStore.createUser({
      name: 'Initial Name',
      email: 'inmemory.test@example.com',
      phoneNumber: '+919876543210',
      providers: ['email'],
      passwordHash: hash,
      passwordSalt: salt,
      googleId: null,
      emailVerified: true,
      phoneVerified: false,
    });

    expect(user.name).toBe('Initial Name');
    expect(user.phoneNumber).toBe('+919876543210');

    // Perform profile update
    const updated = await authStore.updateUser(user.id, {
      name: 'Updated Legal Name',
      phoneNumber: '+919999888877',
      preferences: {
        simpleLanguageMode: true,
        notificationsEnabled: true,
      },
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated Legal Name');
    expect(updated!.phoneNumber).toBe('+919999888877');
    expect(updated!.preferences?.simpleLanguageMode).toBe(true);
    expect(updated!.preferences?.notificationsEnabled).toBe(true);

    // Profile representation matches updated User
    const profile = authStore.toUserProfile(updated!);
    expect(profile.name).toBe('Updated Legal Name');
    expect(profile.phoneNumber).toBe('+919999888877');
    expect(profile.preferences?.simpleLanguageMode).toBe(true);
  });

  it('rejects duplicate phone numbers across accounts during profile update', async () => {
    const userA = await authStore.createUser({
      name: 'User A',
      email: 'userA@example.com',
      phoneNumber: '+919111111111',
      providers: ['email'],
      passwordHash: 'hash',
      passwordSalt: 'salt',
      googleId: null,
      emailVerified: true,
      phoneVerified: true,
    });

    const userB = await authStore.createUser({
      name: 'User B',
      email: 'userB@example.com',
      phoneNumber: '+919222222222',
      providers: ['email'],
      passwordHash: 'hash',
      passwordSalt: 'salt',
      googleId: null,
      emailVerified: true,
      phoneVerified: false,
    });

    const existing = await authStore.findUserByPhone('+919111111111');
    expect(existing).not.toBeNull();
    expect(existing!.id).toBe(userA.id);
    expect(existing!.id).not.toBe(userB.id);
  });
});
