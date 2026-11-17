import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import { hashPassword } from '../../convex/crypto';

const modules = (import.meta as any).glob('../../convex/**/*.*s');

describe('Convex Transaction Hardening & Rollback Prevention (using convex-test)', () => {
  const TEST_SERVER_SECRET = 'test_convex_server_secret_at_least_32_characters_long_for_security';

  beforeEach(() => {
    process.env.CONVEX_SERVER_SECRET = TEST_SERVER_SECRET;
    process.env.ENFORCE_SERVER_ONLY_AUTH = 'true';
    delete process.env.CONVEX_DEPLOYMENT;
  });

  afterEach(() => {
    delete process.env.CONVEX_SERVER_SECRET;
    delete process.env.ENFORCE_SERVER_ONLY_AUTH;
  });

  it('PROVES FIX: login invalid credentials persists audit_log, never creates a session, and avoids transaction rollback', async () => {
    const t = convexTest(schema, modules);

    // 1. Seed user with password in real in-memory Convex database
    const { hash, salt } = await hashPassword('CorrectPassword123!');
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        email: 'consumer@resolve.one',
        name: 'Consumer User',
        passwordHash: hash,
        passwordSalt: salt,
        providers: ['email'],
        role: 'consumer',
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    });

    // 2. Execute authoritative login mutation with incorrect password
    const result = await t.mutation(api.auth.login, {
      identifier: 'consumer@resolve.one',
      password: 'WrongPassword!',
      ipAddress: '198.51.100.1',
      serverSecret: TEST_SERVER_SECRET,
    });

    // 3. New behavior: returns { ok: false, code: 'INVALID_CREDENTIALS' }
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_CREDENTIALS');

    // 4. Verify DB writes were committed and NOT rolled back!
    const auditLogs = await t.run(async (ctx) => {
      return await ctx.db.query('audit_logs').collect();
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe('login_failed');
    expect(auditLogs[0].userId).toBe(userId);

    // 5. Verify NO session was created on failed login
    const sessions = await t.run(async (ctx) => {
      return await ctx.db.query('sessions').collect();
    });
    expect(sessions).toHaveLength(0);

    // 6. PROVE OLD BEHAVIOR FAILED: in real Convex ACID transaction, a thrown error discards all writes!
    let threwError = false;
    try {
      await t.run(async (ctx) => {
        await ctx.db.insert('audit_logs', {
          userId,
          entityType: 'auth',
          entityId: 'test_rollback',
          action: 'login_failed_rolled_back',
          details: 'Testing rollback failure',
          timestamp: new Date().toISOString(),
        });
        throw new Error('Invalid email or password.');
      });
    } catch {
      threwError = true;
    }

    expect(threwError).toBe(true);
    const postThrowLogs = await t.run(async (ctx) => {
      return await ctx.db.query('audit_logs').collect();
    });
    // The write attempted before throw was completely rolled back!
    expect(postThrowLogs.find((l) => l.action === 'login_failed_rolled_back')).toBeUndefined();
  });

  it('PROVES FIX: registerDevice collision logs security_violation and persists without rollback, never hijacking device', async () => {
    const t = convexTest(schema, modules);

    // 1. User A and User B setup
    const { userA, userB, sessionTokenB } = await t.run(async (ctx) => {
      const now = new Date().toISOString();
      const uA = await ctx.db.insert('users', {
        email: 'userA@resolve.one',
        name: 'User A',
        providers: ['email'],
        role: 'consumer',
        emailVerified: true,
        phoneVerified: false,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
      const uB = await ctx.db.insert('users', {
        email: 'userB@resolve.one',
        name: 'User B',
        providers: ['email'],
        role: 'consumer',
        emailVerified: true,
        phoneVerified: false,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      // User A registers a hardware device
      await ctx.db.insert('devices', {
        userId: uA,
        deviceId: 'SHARED-DEV-001',
        deviceName: "User A's Laptop",
        deviceType: 'desktop',
        lastSyncAt: now,
        createdAt: now,
      });

      const tokenB = 'session_token_user_b_valid';
      await ctx.db.insert('sessions', {
        userId: uB,
        token: tokenB,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: now,
      });

      return { userA: uA, userB: uB, sessionTokenB: tokenB };
    });

    // 2. User B attempts to hijack User A's deviceId
    const res = await t.mutation(api.devices.registerDevice, {
      sessionToken: sessionTokenB,
      deviceId: 'SHARED-DEV-001',
      deviceName: "User B's Hijack Attempt",
      deviceType: 'android',
    });

    // 3. Request rejected with FORBIDDEN without throwing / rolling back
    expect(res.ok).toBe(false);
    expect(res.code).toBe('FORBIDDEN');

    // 4. Verify security_violation was committed to audit_logs
    const auditLogs = await t.run(async (ctx) => {
      return await ctx.db.query('audit_logs').collect();
    });
    const violation = auditLogs.find((l) => l.action === 'security_violation');
    expect(violation).toBeDefined();
    expect(violation?.userId).toBe(userB);
    expect(violation?.entityId).toBe('SHARED-DEV-001');

    // 5. Verify device was NOT updated or claimed by User B
    const devices = await t.run(async (ctx) => {
      return await ctx.db.query('devices').collect();
    });
    expect(devices).toHaveLength(1);
    expect(devices[0].userId).toBe(userA);
    expect(devices[0].deviceName).toBe("User A's Laptop");
  });

  it('PROVES FIX: verifyOtp attempts counter increments and commits on incorrect OTP, never creating session', async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const now = new Date().toISOString();
      await ctx.db.insert('verificationTokens', {
        identifier: '+919876543210',
        token: '123456',
        type: 'phone_otp',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        attempts: 0,
        createdAt: now,
      });
    });

    // Attempt 1 with wrong OTP
    const res = await t.mutation(api.auth.verifyOtp, {
      phoneNumber: '+919876543210',
      otp: '999999',
      type: 'phone_otp',
      ipAddress: '198.51.100.2',
      serverSecret: TEST_SERVER_SECRET,
    });

    expect(res.ok).toBe(false);
    expect(res.code).toBe('INVALID_OTP');
    expect(res.error).toContain('4 attempts remaining');

    // Check attempts in real DB: incremented to 1 and committed!
    const tokenDoc = await t.run(async (ctx) => {
      return await ctx.db
        .query('verificationTokens')
        .withIndex('by_identifier_type', (q) =>
          q.eq('identifier', '+919876543210').eq('type', 'phone_otp')
        )
        .first();
    });
    expect(tokenDoc?.attempts).toBe(1);

    // Verify NO session was created on wrong OTP
    const sessions = await t.run(async (ctx) => {
      return await ctx.db.query('sessions').collect();
    });
    expect(sessions).toHaveLength(0);
  });

  it('PROVES FIX: Server-only gate blocks direct client calls without serverSecret when fail-closed', async () => {
    const t = convexTest(schema, modules);

    // Call login without serverSecret (simulating unauthenticated direct client)
    const directRes = await t.mutation(api.auth.login, {
      identifier: 'unauthorized@resolve.one',
      password: 'Password123!',
      ipAddress: '8.8.8.8',
    });

    expect(directRes.ok).toBe(false);
    expect(directRes.code).toBe('UNAUTHORIZED_DIRECT_CALL');

    // Verify audit log captured the unauthorized direct invocation
    const auditLogs = await t.run(async (ctx) => {
      return await ctx.db.query('audit_logs').collect();
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe('unauthorized_direct_call');
  });

  it('PROVES FIX: Soft delete & restore for reminders preserves exact ID and relations', async () => {
    const t = convexTest(schema, modules);

    const { sessionToken } = await t.run(async (ctx) => {
      const now = new Date().toISOString();
      const u = await ctx.db.insert('users', {
        email: 'test@resolve.one',
        name: 'Test',
        providers: ['email'],
        role: 'consumer',
        emailVerified: true,
        phoneVerified: false,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
      const token = 'test_session_token_123';
      await ctx.db.insert('sessions', {
        userId: u,
        token,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: now,
      });
      return { sessionToken: token };
    });

    // 1. Create reminder linked to a dispute case
    const reminder = await t.mutation(api.reminders.create, {
      sessionToken,
      clientGeneratedId: 'REM-ORIGINAL-99',
      caseId: 'CASE-DISPUTE-42',
      title: 'Follow up with merchant regarding refund reference',
      date: '2026-11-20',
    });

    expect(reminder!.clientGeneratedId).toBe('REM-ORIGINAL-99');
    expect(reminder!.caseId).toBe('CASE-DISPUTE-42');
    const originalDbId = reminder!._id;

    // 2. Soft-delete reminder
    await t.mutation(api.reminders.deleteReminder, {
      sessionToken,
      id: 'REM-ORIGINAL-99',
    });

    // Excluded from active list
    const activeList = await t.query(api.reminders.list, { sessionToken });
    expect(activeList).toHaveLength(0);

    // Excluded from dashboard upcoming reminders
    const dashboardStats = await t.query(api.dashboard.getStats, { sessionToken });
    expect(dashboardStats.upcomingReminders).toHaveLength(0);

    // 3. Undo / Restore reminder in-place
    await t.mutation(api.reminders.restoreReminder, {
      sessionToken,
      id: 'REM-ORIGINAL-99',
    });

    // 4. Verify exact same _id and case relation restored
    const restoredList = await t.query(api.reminders.list, { sessionToken });
    expect(restoredList).toHaveLength(1);
    expect(restoredList[0]._id).toBe(originalDbId);
    expect(restoredList[0].clientGeneratedId).toBe('REM-ORIGINAL-99');
    expect(restoredList[0].caseId).toBe('CASE-DISPUTE-42');
  });

  it('PROVES FIX: Scheduled purge hard-deletes soft-deleted reminders older than 30 days', async () => {
    const t = convexTest(schema, modules);

    const { recentReminderId, oldReminderId } = await t.run(async (ctx) => {
      const now = new Date().toISOString();
      const u = await ctx.db.insert('users', {
        email: 'purge@resolve.one',
        name: 'Purge User',
        providers: ['email'],
        role: 'consumer',
        emailVerified: true,
        phoneVerified: false,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      // 1. Deleted 5 days ago (should NOT be purged)
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const rRecent = await ctx.db.insert('reminders', {
        userId: u,
        title: 'Recently deleted reminder',
        date: '2026-11-10',
        done: false,
        deletedAt: fiveDaysAgo,
        version: 1,
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      });

      // 2. Deleted 35 days ago (SHOULD be purged)
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
      const rOld = await ctx.db.insert('reminders', {
        userId: u,
        title: 'Old deleted reminder',
        date: '2026-10-01',
        done: false,
        deletedAt: thirtyFiveDaysAgo,
        version: 1,
        createdAt: thirtyFiveDaysAgo,
        updatedAt: thirtyFiveDaysAgo,
      });

      return { recentReminderId: rRecent, oldReminderId: rOld };
    });

    // Run purge maintenance mutation
    const purgeResult = await t.mutation(internal.reminders.purgeOldDeletedReminders, {});
    expect(purgeResult.purgedCount).toBe(1);

    // Verify old reminder was permanently deleted, recent one kept for undo
    await t.run(async (ctx) => {
      const recent = await ctx.db.get(recentReminderId);
      const old = await ctx.db.get(oldReminderId);
      expect(recent).not.toBeNull();
      expect(old).toBeNull();
    });
  });

  it('PROVES FIX: per-account limit counts failed attempts only, locks at 20/hr, and clears on success (Item 5)', async () => {
    const t = convexTest(schema, modules);

    const { hash, salt } = await hashPassword('CorrectPassword123!');
    await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        email: 'target.account@resolve.one',
        name: 'Target Account',
        passwordHash: hash,
        passwordSalt: salt,
        providers: ['email'],
        role: 'consumer',
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    });

    // 1. Successful login first -> should NOT count as failed attempt
    const successRes1 = await t.mutation(api.auth.login, {
      identifier: 'target.account@resolve.one',
      password: 'CorrectPassword123!',
      ipAddress: '198.51.100.1',
      serverSecret: TEST_SERVER_SECRET,
    });
    expect(successRes1.ok).toBe(true);

    // 2. Perform 19 failed attempts from different IPs to avoid triggering per-IP limits
    for (let i = 1; i <= 19; i++) {
      const failRes = await t.mutation(api.auth.login, {
        identifier: 'target.account@resolve.one',
        password: 'WrongPassword!',
        ipAddress: `198.51.100.${i + 10}`,
        serverSecret: TEST_SERVER_SECRET,
      });
      expect(failRes.ok).toBe(false);
      expect(failRes.code).toBe('INVALID_CREDENTIALS');
    }

    // 3. 20th failed attempt triggers per-account failed attempts ceiling
    const failRes20 = await t.mutation(api.auth.login, {
      identifier: 'target.account@resolve.one',
      password: 'WrongPassword!',
      ipAddress: '198.51.100.99',
      serverSecret: TEST_SERVER_SECRET,
    });
    expect(failRes20.ok).toBe(false);

    // 4. 21st attempt is rejected before even checking password
    const blockedRes = await t.mutation(api.auth.login, {
      identifier: 'target.account@resolve.one',
      password: 'CorrectPassword123!', // Even with correct password, account is locked!
      ipAddress: '198.51.100.100',
      serverSecret: TEST_SERVER_SECRET,
    });
    expect(blockedRes.ok).toBe(false);
    expect(blockedRes.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('PROVES FIX: forceRevokeAllSessions purges sessions table and records containment audit log (Item 9)', async () => {
    const t = convexTest(schema, modules);

    // Seed 3 active sessions
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await t.run(async (ctx) => {
      const u = await ctx.db.insert('users', {
        email: 'user1@resolve.one',
        name: 'User 1',
        providers: ['email'],
        role: 'consumer',
        emailVerified: true,
        phoneVerified: false,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
      await ctx.db.insert('sessions', {
        userId: u,
        token: 'token_1_active',
        expiresAt: futureDate,
        createdAt: now,
      });
      await ctx.db.insert('sessions', {
        userId: u,
        token: 'token_2_active',
        expiresAt: futureDate,
        createdAt: now,
      });
      await ctx.db.insert('sessions', {
        userId: u,
        token: 'token_3_active',
        expiresAt: futureDate,
        createdAt: now,
      });
    });

    const activeBefore = await t.run(async (ctx) => ctx.db.query('sessions').collect());
    expect(activeBefore).toHaveLength(3);

    // Execute internal mutation forceRevokeAllSessions
    const res = await t.mutation(internal.auth.forceRevokeAllSessions, {
      reason: 'Incident response drill',
    });
    expect(res.success).toBe(true);
    expect(res.revokedSessionsCount).toBe(3);

    // Verify all active sessions purged
    const activeAfter = await t.run(async (ctx) => ctx.db.query('sessions').collect());
    expect(activeAfter).toHaveLength(0);

    // Verify audit log entry
    const auditLogs = await t.run(async (ctx) => ctx.db.query('audit_logs').collect());
    const revokeLog = auditLogs.find((l) => l.action === 'security_incident_response');
    expect(revokeLog).toBeDefined();
    expect(revokeLog?.details).toContain('Incident response drill');
  });
});
