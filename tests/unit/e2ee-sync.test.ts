import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupUserMasterKey,
  unlockMasterKeyWithPassphrase,
  unlockMasterKeyWithRecoveryKey,
  encryptDocument,
  decryptDocument,
  calculateSHA256,
  bufferToHex,
  hexToBuffer,
} from '@/lib/crypto/e2ee';
import { ResolveOneDB } from '@/lib/db/db';
import { DexieCaseRepository } from '@/lib/db/repositories/DexieCaseRepository';

describe('End-to-End Encryption (E2EE) Subsystem', () => {
  it('generates a User Master Key (UMK), wraps it with passphrase and recovery key', async () => {
    const passphrase = 'ConsumerMasterPassword@2026';
    const { masterKey, bundle } = await setupUserMasterKey(passphrase);

    expect(masterKey).toBeDefined();
    expect(bundle.wrappedMasterKeyHex).toBeDefined();
    expect(bundle.saltHex).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(bundle.ivHex).toHaveLength(24); // 12 bytes = 24 hex chars
    expect(bundle.recoveryKey).toMatch(/^RS-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(bundle.recoveryWrappedMasterKeyHex).toContain(':');
    expect(bundle.recoveryKeyHashHex).toHaveLength(64); // SHA-256 hex
  });

  it('unwraps Master Key successfully with correct passphrase and rejects incorrect passphrase', async () => {
    const passphrase = 'CorrectPassword#492';
    const { bundle } = await setupUserMasterKey(passphrase);

    // Unwrapping with correct passphrase
    const unlockedKey = await unlockMasterKeyWithPassphrase(
      passphrase,
      bundle.wrappedMasterKeyHex,
      bundle.saltHex,
      bundle.ivHex
    );
    expect(unlockedKey).toBeDefined();

    // Rejection on wrong passphrase
    await expect(
      unlockMasterKeyWithPassphrase(
        'WrongPassword#000',
        bundle.wrappedMasterKeyHex,
        bundle.saltHex,
        bundle.ivHex
      )
    ).rejects.toThrow();
  });

  it('unwraps Master Key successfully with Recovery Key', async () => {
    const passphrase = 'OriginalSecretPassphrase';
    const { bundle } = await setupUserMasterKey(passphrase);

    const recoveredKey = await unlockMasterKeyWithRecoveryKey(
      bundle.recoveryKey,
      bundle.recoveryWrappedMasterKeyHex
    );
    expect(recoveredKey).toBeDefined();

    // Rejection on tampered recovery key
    await expect(
      unlockMasterKeyWithRecoveryKey(
        'RS-0000-0000-0000-0000-0000-0000',
        bundle.recoveryWrappedMasterKeyHex
      )
    ).rejects.toThrow();
  });

  it('performs envelope encryption on document buffers and decrypts with integrity verification', async () => {
    const { masterKey } = await setupUserMasterKey('MyPassphrase@123');

    const enc = new TextEncoder();
    const invoiceContent = 'INVOICE: Flipkart Order OD-99482910 | Amount: ₹14,999 | Tax Invoice Verified';
    const plainBuffer = enc.encode(invoiceContent).buffer as ArrayBuffer;

    const encrypted = await encryptDocument(plainBuffer, masterKey);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);
    expect(encrypted.ivHex).toHaveLength(24);
    expect(encrypted.dekIvHex).toHaveLength(24);
    expect(encrypted.wrappedDekHex).toBeDefined();
    expect(encrypted.sha256Hex).toHaveLength(64);

    // Decrypt with master key and verify SHA-256 fingerprint
    const decryptedBuffer = await decryptDocument(
      encrypted.ciphertext,
      encrypted.wrappedDekHex,
      encrypted.ivHex,
      encrypted.dekIvHex,
      encrypted.sha256Hex,
      masterKey
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    expect(decryptedText).toBe(invoiceContent);
  });

  it('detects cryptographic tampering and throws an error on modified ciphertext or SHA-256', async () => {
    const { masterKey } = await setupUserMasterKey('SecureKey#1');
    const enc = new TextEncoder();
    const original = enc.encode('Medical invoice evidence').buffer as ArrayBuffer;

    const encrypted = await encryptDocument(original, masterKey);

    // Tamper with ciphertext
    const tamperedCipher = encrypted.ciphertext.slice(0);
    const view = new Uint8Array(tamperedCipher);
    view[0] = view[0] ^ 0xff; // flip bits

    await expect(
      decryptDocument(
        tamperedCipher,
        encrypted.wrappedDekHex,
        encrypted.ivHex,
        encrypted.dekIvHex,
        encrypted.sha256Hex,
        masterKey
      )
    ).rejects.toThrow();

    // Tamper with expected SHA-256
    const tamperedSha256 = '0000000000000000000000000000000000000000000000000000000000000000';
    await expect(
      decryptDocument(
        encrypted.ciphertext,
        encrypted.wrappedDekHex,
        encrypted.ivHex,
        encrypted.dekIvHex,
        tamperedSha256,
        masterKey
      )
    ).rejects.toThrow(/mismatch/);
  });
});

describe('IndexedDB Offline Queue & Repository Integration', () => {
  let testDb: ResolveOneDB;
  let caseRepo: DexieCaseRepository;

  beforeEach(async () => {
    testDb = new ResolveOneDB();
    await testDb.delete();
    await testDb.open();
    caseRepo = new DexieCaseRepository(testDb);
  });

  it('automatically enqueues created cases into syncQueue for offline resilience', async () => {
    const newCase = await caseRepo.create({
      id: 'RS-SYNC-01',
      title: 'Delayed Flight Refund',
      issueType: 'Flight cancellation',
      company: 'AeroIndia',
      amount: 4500,
      description: 'Flight cancelled without refund within statutory 48 hours.',
      status: 'action_required',
      timeline: [],
      evidence: [],
    });

    const queueItems = await testDb.syncQueue.toArray();
    expect(queueItems.length).toBe(1);
    expect(queueItems[0].entity).toBe('cases');
    expect(queueItems[0].operation).toBe('create');
    expect(queueItems[0].clientGeneratedId).toBe('RS-SYNC-01');
    expect(queueItems[0].status).toBe('pending');
  });

  it('automatically enqueues updates and deletions to syncQueue', async () => {
    await caseRepo.create({
      id: 'RS-SYNC-02',
      title: 'Damaged Blender',
      issueType: 'Damaged or defective',
      company: 'Appliance Hub',
      description: 'Cracked jar on delivery',
      status: 'action_required',
      timeline: [],
      evidence: [],
    });

    // Update
    await caseRepo.update('RS-SYNC-02', {
      status: 'waiting_company',
    });

    let queueItems = await testDb.syncQueue.toArray();
    expect(queueItems.length).toBe(2);
    expect(queueItems[1].operation).toBe('update');

    // Delete
    await caseRepo.delete('RS-SYNC-02');
    queueItems = await testDb.syncQueue.toArray();
    expect(queueItems.length).toBe(3);
    expect(queueItems[2].operation).toBe('delete');
  });
});

