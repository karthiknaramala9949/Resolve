import { describe, it, expect, beforeEach } from 'vitest';
import { createMockConvexContext } from '../helpers/mockConvexContext';
import * as cases from '../../convex/cases';
import * as documents from '../../convex/documents';
import * as purchases from '../../convex/purchases';
import * as reminders from '../../convex/reminders';
import * as devices from '../../convex/devices';
import * as auth from '../../convex/auth';
import * as rateLimits from '../../convex/rateLimits';

describe('RESOLVE-ONE: Production Multi-Tenant Isolation & Backend Ownership Security', () => {
  let ctx: any;
  let storageHelper: any;
  let userAId: string;
  let userBId: string;
  const tokenA = 'session_token_user_a_secure_1234567890abcdef';
  const tokenB = 'session_token_user_b_secure_abcdef1234567890';
  const expiredToken = 'session_token_expired_999999';

  beforeEach(async () => {
    process.env.ENFORCE_SERVER_ONLY_AUTH = 'false';
    const mock = createMockConvexContext();
    ctx = mock.ctx;
    storageHelper = mock.storageHelper;

    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Seed User A
    userAId = await ctx.db.insert('users', {
      name: 'Priya Sharma (Tenant A)',
      email: 'priya.sharma@example.com',
      phoneNumber: '+919876543210',
      providers: ['email'],
      passwordHash: 'hash_a',
      passwordSalt: 'salt_a',
      role: 'consumer',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    await ctx.db.insert('sessions', {
      userId: userAId,
      token: tokenA,
      expiresAt: futureDate,
      createdAt: now,
    });

    // Seed User B (independent tenant)
    userBId = await ctx.db.insert('users', {
      name: 'Rohan Verma (Tenant B)',
      email: 'rohan.verma@example.com',
      phoneNumber: '+919123456780',
      providers: ['email'],
      passwordHash: 'hash_b',
      passwordSalt: 'salt_b',
      role: 'consumer',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    await ctx.db.insert('sessions', {
      userId: userBId,
      token: tokenB,
      expiresAt: futureDate,
      createdAt: now,
    });

    // Seed Expired Session
    await ctx.db.insert('sessions', {
      userId: userAId,
      token: expiredToken,
      expiresAt: pastDate,
      createdAt: pastDate,
    });
  });

  describe('Session Token & Authentication Verification', () => {
    it('fails when session token is missing or empty', async () => {
      await expect(
        (cases.list as any)._handler(ctx, { sessionToken: '' })
      ).rejects.toThrow('UNAUTHORIZED: Missing session token');
    });

    it('fails when session token does not exist in the database', async () => {
      await expect(
        (cases.list as any)._handler(ctx, { sessionToken: 'non_existent_token_777' })
      ).rejects.toThrow('UNAUTHORIZED: Invalid session');
    });

    it('fails when session has expired', async () => {
      await expect(
        (cases.list as any)._handler(ctx, { sessionToken: expiredToken })
      ).rejects.toThrow('UNAUTHORIZED: Session expired');
    });
  });

  describe('Dispute Cases Multi-Tenant Boundary', () => {
    it('isolates case creation, listing, reading, updating, and deletion across tenants', async () => {
      // 1. User A creates a confidential dispute case
      const caseA = await (cases.create as any)._handler(ctx, {
        sessionToken: tokenA,
        title: 'Flipkart iPhone 15 Pro Max Defective Display',
        issueType: 'damaged_item',
        company: 'Flipkart India Pvt Ltd',
        orderRef: 'OD-9928172648',
        amount: 134999,
        description: 'Screen green tint defect out of box; return rejected.',
      });

      expect(caseA).toBeDefined();
      expect(caseA.userId).toBe(userAId);

      // 2. User B creates their own case
      const caseB = await (cases.create as any)._handler(ctx, {
        sessionToken: tokenB,
        title: 'Amazon Echo Dot Not Delivered',
        issueType: 'delivery_delay',
        company: 'Amazon India',
        orderRef: 'OD-402-1234567-8901234',
        amount: 3499,
        description: 'Package marked delivered but never arrived.',
      });

      expect(caseB).toBeDefined();
      expect(caseB.userId).toBe(userBId);

      // 3. User B lists cases: must NOT see User A's case
      const userBCases = await (cases.list as any)._handler(ctx, { sessionToken: tokenB });
      expect(userBCases).toHaveLength(1);
      expect(userBCases[0]._id).toBe(caseB._id);
      expect(userBCases.some((c: any) => c._id === caseA._id)).toBe(false);

      // 4. User B attempts IDOR read on User A's case -> returns null
      const userBReadCaseA = await (cases.getById as any)._handler(ctx, {
        sessionToken: tokenB,
        id: caseA._id,
      });
      expect(userBReadCaseA).toBeNull();

      // 5. User B attempts cross-tenant update on User A's case -> rejected
      await expect(
        (cases.update as any)._handler(ctx, {
          sessionToken: tokenB,
          id: caseA._id,
          title: 'Hacked by Tenant B',
        })
      ).rejects.toThrow('Case not found or permission denied.');

      // 6. User B attempts cross-tenant deletion on User A's case -> rejected
      await expect(
        (cases.deleteCase as any)._handler(ctx, {
          sessionToken: tokenB,
          id: caseA._id,
        })
      ).rejects.toThrow('Case not found or permission denied.');

      // 7. Verify User A's case remains intact and unaffected
      const userAReadCaseA = await (cases.getById as any)._handler(ctx, {
        sessionToken: tokenA,
        id: caseA._id,
      });
      expect(userAReadCaseA).not.toBeNull();
      expect(userAReadCaseA?.title).toBe('Flipkart iPhone 15 Pro Max Defective Display');
      expect(userAReadCaseA?.deletedAt).toBeUndefined();
    });
  });

  describe('Document & Storage Multi-Tenant Isolation', () => {
    it('prevents cross-tenant document attachment, download URL leakage, and deletion', async () => {
      // 1. User A creates a case
      const caseA = await (cases.create as any)._handler(ctx, {
        sessionToken: tokenA,
        title: 'Medical Claim Rejection Dispute',
        issueType: 'service_quality',
        company: 'Star Health Insurance',
        amount: 85000,
        description: 'Cashless claim arbitrarily denied.',
      });

      // 2. User A registers an encrypted document attached to Case A
      const storageIdA = 'storage_doc_userA_confidential_report_99';
      storageHelper.registerStorage(storageIdA);

      const docA = await (documents.registerDocument as any)._handler(ctx, {
        sessionToken: tokenA,
        caseId: caseA._id,
        name: 'Discharge_Summary_Confidential.pdf',
        mime: 'application/pdf',
        size: 2048500,
        sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        storageId: storageIdA,
        isEncrypted: true,
        encryptedKey: 'enc_dek_hex_123',
        iv: 'iv_hex_123',
        salt: 'salt_hex_123',
      });

      expect(docA).toBeDefined();
      expect(docA.userId).toBe(userAId);
      expect(docA.name).toBe('Discharge_Summary_Confidential.pdf');

      // 3. User B attempts to attach a document to User A's Case A -> rejected server-side
      await expect(
        (documents.registerDocument as any)._handler(ctx, {
          sessionToken: tokenB,
          caseId: caseA._id,
          name: 'Malicious_Injected_Evidence.pdf',
          mime: 'application/pdf',
          size: 1024,
          sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          storageId: 'storage_malicious_123',
          isEncrypted: true,
          encryptedKey: 'key',
          iv: 'iv',
          salt: 'salt',
        })
      ).rejects.toThrow('Case not found or permission denied.');

      // 4. User B attempts to obtain download URL for User A's document -> rejected
      await expect(
        (documents.getDownloadUrl as any)._handler(ctx, {
          sessionToken: tokenB,
          documentId: docA._id,
        })
      ).rejects.toThrow('Document not found or permission denied.');

      // 5. User B attempts to obtain download URL via storageId query parameter -> rejected
      await expect(
        (documents.getDownloadUrl as any)._handler(ctx, {
          sessionToken: tokenB,
          documentId: storageIdA,
        })
      ).rejects.toThrow('Document not found or permission denied.');

      // 6. User B attempts to delete User A's document -> rejected
      await expect(
        (documents.deleteDocument as any)._handler(ctx, {
          sessionToken: tokenB,
          id: docA._id,
        })
      ).rejects.toThrow('Document not found or permission denied.');

      // 7. User A can safely obtain download URL
      const userADownload = await (documents.getDownloadUrl as any)._handler(ctx, {
        sessionToken: tokenA,
        documentId: docA._id,
      });
      expect(userADownload.downloadUrl).toBeDefined();
      expect(userADownload.document.name).toBe('Discharge_Summary_Confidential.pdf');
    });
  });

  describe('Purchases & Reminders Multi-Tenant Isolation', () => {
    it('prevents cross-tenant viewing, modifying, or deleting of customer purchases', async () => {
      // User A creates a purchase
      const purchaseA = await (purchases.create as any)._handler(ctx, {
        sessionToken: tokenA,
        store: 'Croma Retail',
        product: 'MacBook Pro M3 Max 36GB',
        orderRef: 'CRO-77291',
        amount: 299900,
        returnWindowDays: 14,
        warrantyMonths: 12,
      });

      // User B lists purchases: should be empty for User B
      const userBPurchases = await (purchases.list as any)._handler(ctx, { sessionToken: tokenB });
      expect(userBPurchases).toHaveLength(0);

      // User B attempts to modify User A's purchase -> rejected
      await expect(
        (purchases.update as any)._handler(ctx, {
          sessionToken: tokenB,
          id: purchaseA._id,
          product: 'Modified by User B',
        })
      ).rejects.toThrow('Purchase not found or permission denied.');

      // User B attempts to delete User A's purchase -> rejected
      await expect(
        (purchases.deletePurchase as any)._handler(ctx, {
          sessionToken: tokenB,
          id: purchaseA._id,
        })
      ).rejects.toThrow('Purchase not found or permission denied.');
    });

    it('prevents cross-tenant viewing, toggling, or deleting of customer reminders', async () => {
      // User A creates a reminder
      const reminderA = await (reminders.create as any)._handler(ctx, {
        sessionToken: tokenA,
        title: 'File Consumer Court Complaint (National Consumer Helpline)',
        date: '2026-11-20T10:00:00Z',
        done: false,
      });

      // User B lists reminders: should be empty for User B
      const userBReminders = await (reminders.list as any)._handler(ctx, { sessionToken: tokenB });
      expect(userBReminders).toHaveLength(0);

      // User B attempts to toggle done on User A's reminder -> rejected
      await expect(
        (reminders.toggleDone as any)._handler(ctx, {
          sessionToken: tokenB,
          id: reminderA._id,
          done: true,
        })
      ).rejects.toThrow('Reminder not found or permission denied.');

      // User B attempts to delete User A's reminder -> rejected
      await expect(
        (reminders.deleteReminder as any)._handler(ctx, {
          sessionToken: tokenB,
          id: reminderA._id,
        })
      ).rejects.toThrow('Reminder not found or permission denied.');
    });
  });

  describe('User Profile & E2EE Key Bundle Isolation', () => {
    it('prevents User B from updating User A profile or overwriting E2EE keys', async () => {
      // User A saves E2EE keys
      await (auth.updateE2EEKeys as any)._handler(ctx, {
        sessionToken: tokenA,
        encryptedMasterKey: 'master_key_user_a_hex',
        masterKeySalt: 'salt_user_a_hex',
        masterKeyIv: 'iv_user_a_hex',
        recoveryKeyHash: 'hash_user_a_hex',
      });

      // User B tries to update keys using token B
      await (auth.updateE2EEKeys as any)._handler(ctx, {
        sessionToken: tokenB,
        encryptedMasterKey: 'master_key_user_b_hex',
        masterKeySalt: 'salt_user_b_hex',
        masterKeyIv: 'iv_user_b_hex',
        recoveryKeyHash: 'hash_user_b_hex',
      });

      // Verify User A's user document in DB was never overwritten
      const userADoc = await ctx.db.get(userAId);
      expect(userADoc.encryptedMasterKey).toBe('master_key_user_a_hex');
      expect(userADoc.masterKeySalt).toBe('salt_user_a_hex');

      const userBDoc = await ctx.db.get(userBId);
      expect(userBDoc.encryptedMasterKey).toBe('master_key_user_b_hex');
    });
  });

  describe('Distributed Rate Limiting Atomic State', () => {
    it('accurately enforces atomic counter limits and retry-after windows', async () => {
      const key = 'test_ip_rate_limit:192.168.1.1';
      const maxAttempts = 3;
      const windowMs = 60000;

      // Attempt 1
      const res1 = await (rateLimits.checkRateLimit as any)._handler(ctx, { key, maxAttempts, windowMs });
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      // Attempt 2
      const res2 = await (rateLimits.checkRateLimit as any)._handler(ctx, { key, maxAttempts, windowMs });
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      // Attempt 3
      const res3 = await (rateLimits.checkRateLimit as any)._handler(ctx, { key, maxAttempts, windowMs });
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // Attempt 4: Exceeded!
      const res4 = await (rateLimits.checkRateLimit as any)._handler(ctx, { key, maxAttempts, windowMs });
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.retryAfterSec).toBeGreaterThan(0);

      // Reset
      await (rateLimits.resetRateLimit as any)._handler(ctx, { key });
      const res5 = await (rateLimits.checkRateLimit as any)._handler(ctx, { key, maxAttempts, windowMs });
      expect(res5.allowed).toBe(true);
      expect(res5.remaining).toBe(2);
    });
  });

  describe('Device Registration & Multi-Device Isolation', () => {
    it('prevents User B from claiming or modifying User A device, and prevents cross-user device hijacking', async () => {
      const deviceId = 'macbook-pro-m3-hardware-uuid-999';

      // 1. User A registers device
      const regResA = await (devices.registerDevice as any)._handler(ctx, {
        sessionToken: tokenA,
        deviceId,
        deviceName: "Priya's MacBook",
        deviceType: 'desktop',
      });
      expect(regResA.ok).toBe(true);
      const devA = regResA.device;
      expect(devA).toBeDefined();
      expect(devA.userId).toBe(userAId);
      expect(devA.deviceId).toBe(deviceId);

      // 2. User B tries to register the same deviceId -> REJECTED (returns { ok: false, code: 'FORBIDDEN' })
      const hijackRes = await (devices.registerDevice as any)._handler(ctx, {
        sessionToken: tokenB,
        deviceId,
        deviceName: "Rohan's Attempted Hijack",
        deviceType: 'desktop',
      });
      expect(hijackRes.ok).toBe(false);
      expect(hijackRes.code).toBe('FORBIDDEN');

      // 3. User B tries to remove User A's device -> REJECTED (returns { ok: false, code: 'FORBIDDEN' })
      const removeFailRes = await (devices.removeDevice as any)._handler(ctx, {
        sessionToken: tokenB,
        deviceId,
      });
      expect(removeFailRes.ok).toBe(false);
      expect(removeFailRes.code).toBe('FORBIDDEN');

      // 4. User A updates their own device -> ALLOWED
      const updatedResA = await (devices.registerDevice as any)._handler(ctx, {
        sessionToken: tokenA,
        deviceId,
        deviceName: "Priya's MacBook Pro (Renamed)",
        deviceType: 'desktop',
      });
      expect(updatedResA.ok).toBe(true);
      expect(updatedResA.device.deviceName).toBe("Priya's MacBook Pro (Renamed)");

      // 5. User A removes their own device -> ALLOWED
      const removeRes = await (devices.removeDevice as any)._handler(ctx, {
        sessionToken: tokenA,
        deviceId,
      });
      expect(removeRes.ok).toBe(true);
      expect(removeRes.success).toBe(true);
    });
  });

  describe('Convex-Layer Rate Limiting on Direct Mutations', () => {
    it('enforces rate limit on login attempts and triggers RATE_LIMIT_EXCEEDED on abuse', async () => {
      const targetIdentifier = 'priya.sharma@example.com';

      // 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const res = await (auth.login as any)._handler(ctx, {
          identifier: targetIdentifier,
          password: 'WrongPassword#123',
        });
        expect(res.ok).toBe(false);
        expect(res.code).toBe('INVALID_CREDENTIALS');
      }

      // 6th attempt -> rejected by rate limiter
      const blockedRes = await (auth.login as any)._handler(ctx, {
        identifier: targetIdentifier,
        password: 'WrongPassword#123',
      });
      expect(blockedRes.ok).toBe(false);
      expect(blockedRes.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('enforces rate limit on upload URL generation to protect storage quotas', async () => {
      // User A requests upload URLs up to the limit (30)
      for (let i = 0; i < 30; i++) {
        const url = await (documents.generateUploadUrl as any)._handler(ctx, {
          sessionToken: tokenA,
        });
        expect(url).toBeDefined();
      }

      // 31st attempt -> rejected by rate limiter
      await expect(
        (documents.generateUploadUrl as any)._handler(ctx, {
          sessionToken: tokenA,
        })
      ).rejects.toThrow(/RATE_LIMIT_EXCEEDED/);
    });
  });

  describe('Security Audit Logging for Sensitive Events', () => {
    it('records failed logins, device registrations, and security violations in audit_logs', async () => {
      // 1. Trigger failed login
      const failLogin = await (auth.login as any)._handler(ctx, {
        identifier: 'priya.sharma@example.com',
        password: 'IncorrectPassword!999',
        ipAddress: '203.0.113.42',
      });
      expect(failLogin.ok).toBe(false);

      // 2. Trigger device registration
      await (devices.registerDevice as any)._handler(ctx, {
        sessionToken: tokenA,
        deviceId: 'macbook-pro-audit-test',
        deviceName: "Priya's Work Laptop",
        deviceType: 'desktop',
      });

      // 3. Trigger device hijack attempt (security violation)
      const hijackAttempt = await (devices.registerDevice as any)._handler(ctx, {
        sessionToken: tokenB,
        deviceId: 'macbook-pro-audit-test',
        deviceName: "Rohan's Hijack",
        deviceType: 'desktop',
      });
      expect(hijackAttempt.ok).toBe(false);
      expect(hijackAttempt.code).toBe('FORBIDDEN');

      // Verify audit_logs table has entries
      const logs = await ctx.db.query('audit_logs').collect();
      expect(logs.length).toBeGreaterThanOrEqual(3);

      // Should have login_failed entry
      const failedLoginLog = logs.find((l: any) => l.action === 'login_failed');
      expect(failedLoginLog).toBeDefined();
      expect(failedLoginLog.ipAddress).toBe('unverified:203.0.113.42');

      // Should have create entry for device registration
      const deviceRegLog = logs.find((l: any) => l.action === 'create' && l.entityId === 'macbook-pro-audit-test');
      expect(deviceRegLog).toBeDefined();

      // Should have security_violation entry from device hijack attempt
      const violationLog = logs.find((l: any) => l.action === 'security_violation');
      expect(violationLog).toBeDefined();
      expect(violationLog.details).toContain('macbook-pro-audit-test');
    });
  });

  describe('Server-Side Validation & File Upload Guards (Group 2 Hardening)', () => {
    it('enforces bounds and enums on case creation and updates', async () => {
      // 1. Rejects invalid status
      await expect(
        (cases.create as any)._handler(ctx, {
          sessionToken: tokenA,
          title: 'Defective Television',
          issueType: 'Damaged or defective',
          company: 'Sony India',
          description: 'Display panel has lines across the screen.',
          status: 'invalid_status_value',
        })
      ).rejects.toThrow(/Invalid status/);

      // 2. Rejects invalid issueType
      await expect(
        (cases.create as any)._handler(ctx, {
          sessionToken: tokenA,
          title: 'Defective Television',
          issueType: 'completely_unknown_issue_type',
          company: 'Sony India',
          description: 'Display panel has lines across the screen.',
        })
      ).rejects.toThrow(/Invalid issueType/);

      // 3. Rejects negative amount
      await expect(
        (cases.create as any)._handler(ctx, {
          sessionToken: tokenA,
          title: 'Defective Television',
          issueType: 'Damaged or defective',
          company: 'Sony India',
          description: 'Display panel has lines across the screen.',
          amount: -500,
        })
      ).rejects.toThrow(/non-negative number up to ₹100,000,000/);

      // 4. Rejects amount exceeding 100M
      await expect(
        (cases.create as any)._handler(ctx, {
          sessionToken: tokenA,
          title: 'Defective Television',
          issueType: 'Damaged or defective',
          company: 'Sony India',
          description: 'Display panel has lines across the screen.',
          amount: 200000000,
        })
      ).rejects.toThrow(/non-negative number up to ₹100,000,000/);

      // 5. Rejects too short title
      await expect(
        (cases.create as any)._handler(ctx, {
          sessionToken: tokenA,
          title: 'Hi',
          issueType: 'Damaged or defective',
          company: 'Sony India',
          description: 'Valid description text here.',
        })
      ).rejects.toThrow(/Title must be at least 3 characters/);
    });

    it('enforces numeric bounds and constraints on purchases', async () => {
      // 1. Rejects negative amount
      await expect(
        (purchases.create as any)._handler(ctx, {
          sessionToken: tokenA,
          store: 'Amazon India',
          product: 'Wireless Earbuds',
          amount: -100,
          returnWindowDays: 10,
          warrantyMonths: 12,
        })
      ).rejects.toThrow(/non-negative number up to ₹100,000,000/);

      // 2. Rejects returnWindowDays > 365
      await expect(
        (purchases.create as any)._handler(ctx, {
          sessionToken: tokenA,
          store: 'Amazon India',
          product: 'Wireless Earbuds',
          amount: 1999,
          returnWindowDays: 400,
          warrantyMonths: 12,
        })
      ).rejects.toThrow(/Return window must be between 0 and 365 days/);

      // 3. Rejects warrantyMonths > 120
      await expect(
        (purchases.create as any)._handler(ctx, {
          sessionToken: tokenA,
          store: 'Amazon India',
          product: 'Wireless Earbuds',
          amount: 1999,
          returnWindowDays: 15,
          warrantyMonths: 150,
        })
      ).rejects.toThrow(/Warranty period must be between 0 and 120 months/);
    });

    it('enforces MIME allowlist, extension allowlist, 15MB limit, and SHA-256 format on documents', async () => {
      const validStorageId = 'valid_storage_blob_doc_1';
      storageHelper.registerStorage(validStorageId);

      // 1. Rejects unlisted extension (.exe)
      await expect(
        (documents.registerDocument as any)._handler(ctx, {
          sessionToken: tokenA,
          storageId: validStorageId,
          name: 'malware.exe',
          mime: 'application/octet-stream',
          size: 1024,
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
          isEncrypted: true,
        })
      ).rejects.toThrow(/File extension '\.exe' is not permitted/);

      // 2. Rejects unlisted MIME type
      await expect(
        (documents.registerDocument as any)._handler(ctx, {
          sessionToken: tokenA,
          storageId: validStorageId,
          name: 'invoice.pdf',
          mime: 'application/x-executable',
          size: 1024,
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
          isEncrypted: true,
        })
      ).rejects.toThrow(/MIME type 'application\/x-executable' is not permitted/);

      // 3. Rejects size exceeding 15MB
      await expect(
        (documents.registerDocument as any)._handler(ctx, {
          sessionToken: tokenA,
          storageId: validStorageId,
          name: 'large_video.mp4',
          mime: 'application/octet-stream',
          size: 16 * 1024 * 1024, // 16MB
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
          isEncrypted: true,
        })
      ).rejects.toThrow(/at most 15MB/);

      // 4. Rejects zero or negative size
      await expect(
        (documents.registerDocument as any)._handler(ctx, {
          sessionToken: tokenA,
          storageId: validStorageId,
          name: 'zero.pdf',
          mime: 'application/pdf',
          size: 0,
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
          isEncrypted: true,
        })
      ).rejects.toThrow(/greater than 0 and at most 15MB/);

      // 5. Rejects invalid SHA-256 hash format
      await expect(
        (documents.registerDocument as any)._handler(ctx, {
          sessionToken: tokenA,
          storageId: validStorageId,
          name: 'invoice.pdf',
          mime: 'application/pdf',
          size: 1024,
          sha256: 'not-a-valid-sha256-hash',
          isEncrypted: true,
        })
      ).rejects.toThrow(/Invalid SHA-256 hash fingerprint/);
    });
  });
});
