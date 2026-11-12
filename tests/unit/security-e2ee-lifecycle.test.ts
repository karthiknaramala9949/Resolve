import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupUserMasterKey,
  unlockMasterKeyWithPassphrase,
  unlockMasterKeyWithRecoveryKey,
  rewrapMasterKeyOnPasswordChange,
  encryptDocument,
  decryptDocument,
  setActiveMasterKey,
  getActiveMasterKey,
  PBKDF2_ITERATIONS,
  E2EE_KEY_VERSION,
} from '@/lib/crypto/e2ee';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { NextRequest } from 'next/server';

describe('RESOLVE-ONE: Security, E2EE Lifecycle & Auth Consolidation', () => {
  beforeEach(() => {
    setActiveMasterKey(null);
  });

  describe('PHASE 3: E2EE Master Key Lifecycle, Restoration & Versioning', () => {
    const originalPassword = 'InitialUserSecret@2026';
    const newPassword = 'UpdatedUserPassword#999';

    it('preserves PBKDF2 100,000 iterations and version 1 for backward compatibility', () => {
      expect(PBKDF2_ITERATIONS).toBe(100000);
      expect(E2EE_KEY_VERSION).toBe(1);
    });

    it('First-Time User: generates a User Master Key, wraps it, and creates a 128-bit recovery key', async () => {
      const { masterKey, bundle } = await setupUserMasterKey(originalPassword);

      expect(masterKey).toBeDefined();
      expect(bundle.wrappedMasterKeyHex.length).toBeGreaterThan(32);
      expect(bundle.saltHex.length).toBe(32); // 16 bytes = 32 hex chars
      expect(bundle.ivHex.length).toBe(24); // 12 bytes = 24 hex chars
      // 128-bit entropy verified mathematically: 16 bytes * 8 bits/byte = 128 bits
      // Formatted as 8 groups of 4 hexadecimal characters = 32 hex digits
      expect(bundle.recoveryKey).toMatch(/^RS(-[0-9A-F]{4}){8}$/);
      const hexOnly = bundle.recoveryKey.replace(/RS-|-/g, '');
      expect(hexOnly.length).toBe(32); // 32 hex chars = 16 bytes = 128 bits entropy
      expect(bundle.recoveryWrappedMasterKeyHex.split(':')).toHaveLength(3);
      expect(bundle.recoveryKeyHashHex.length).toBe(64); // SHA-256
    });

    it('Device A Encrypts Document -> Device B Restores Master Key with Passphrase -> Decrypts Successfully', async () => {
      // Device A: First time setup
      const { masterKey: deviceAMasterKey, bundle } = await setupUserMasterKey(originalPassword);

      // Device A encrypts a confidential invoice
      const plaintext = new TextEncoder().encode('Invoice #INV-2026-9876: Total INR 45,999 for iPhone 15 Pro').buffer;
      const encrypted = await encryptDocument(plaintext, deviceAMasterKey);

      // Device B: completely new session (empty in-memory master key)
      setActiveMasterKey(null);
      expect(getActiveMasterKey()).toBeNull();

      // Device B: unlocks using user's password and stored bundle from Convex
      const deviceBMasterKey = await unlockMasterKeyWithPassphrase(
        originalPassword,
        bundle.wrappedMasterKeyHex,
        bundle.saltHex,
        bundle.ivHex
      );

      // Device B decrypts document uploaded by Device A
      const decrypted = await decryptDocument(
        encrypted.ciphertext,
        encrypted.wrappedDekHex,
        encrypted.ivHex,
        encrypted.dekIvHex,
        encrypted.sha256Hex,
        deviceBMasterKey
      );

      const decodedText = new TextDecoder().decode(decrypted);
      expect(decodedText).toBe('Invoice #INV-2026-9876: Total INR 45,999 for iPhone 15 Pro');
    });

    it('Device B Restores Master Key using 128-bit Recovery Key and Decrypts Existing Documents', async () => {
      // Device A creates key and encrypts
      const { masterKey: deviceAMasterKey, bundle } = await setupUserMasterKey(originalPassword);
      const plaintext = new TextEncoder().encode('Confidential Return Receipt #RR-991').buffer;
      const encrypted = await encryptDocument(plaintext, deviceAMasterKey);

      // Device B has forgotten password; restores using recovery key
      setActiveMasterKey(null);
      const recoveredKey = await unlockMasterKeyWithRecoveryKey(
        bundle.recoveryKey,
        bundle.recoveryWrappedMasterKeyHex
      );

      expect(recoveredKey).toBeDefined();

      // Verify document decrypts with recovered key
      const decrypted = await decryptDocument(
        encrypted.ciphertext,
        encrypted.wrappedDekHex,
        encrypted.ivHex,
        encrypted.dekIvHex,
        encrypted.sha256Hex,
        recoveredKey
      );

      expect(new TextDecoder().decode(decrypted)).toBe('Confidential Return Receipt #RR-991');
    });

    it('Password Change: rewraps existing Master Key without invalidating previously encrypted documents', async () => {
      // 1. Initial setup with original password
      const { masterKey, bundle: initialBundle } = await setupUserMasterKey(originalPassword);

      // 2. User encrypts documents with initial key
      const docPlaintext = new TextEncoder().encode('Document created before password change').buffer;
      const encryptedDoc = await encryptDocument(docPlaintext, masterKey);

      // 3. User changes account password
      const rewrapped = await rewrapMasterKeyOnPasswordChange(masterKey, newPassword);
      expect(rewrapped.wrappedMasterKeyHex).not.toBe(initialBundle.wrappedMasterKeyHex);
      expect(rewrapped.saltHex).not.toBe(initialBundle.saltHex);

      // 4. Simulate a new session unlocking with NEW password
      const restoredMasterKey = await unlockMasterKeyWithPassphrase(
        newPassword,
        rewrapped.wrappedMasterKeyHex,
        rewrapped.saltHex,
        rewrapped.ivHex
      );

      // 5. Existing documents MUST decrypt successfully!
      const decrypted = await decryptDocument(
        encryptedDoc.ciphertext,
        encryptedDoc.wrappedDekHex,
        encryptedDoc.ivHex,
        encryptedDoc.dekIvHex,
        encryptedDoc.sha256Hex,
        restoredMasterKey
      );

      expect(new TextDecoder().decode(decrypted)).toBe('Document created before password change');

      // 6. Old password must now fail to unlock the new bundle
      await expect(
        unlockMasterKeyWithPassphrase(
          originalPassword,
          rewrapped.wrappedMasterKeyHex,
          rewrapped.saltHex,
          rewrapped.ivHex
        )
      ).rejects.toThrow();
    });

    it('Incorrect Passphrase fails safely with cryptographic authentication error', async () => {
      const { bundle } = await setupUserMasterKey(originalPassword);

      await expect(
        unlockMasterKeyWithPassphrase(
          'WrongPassword#123',
          bundle.wrappedMasterKeyHex,
          bundle.saltHex,
          bundle.ivHex
        )
      ).rejects.toThrow();
    });

    it('Tampered ciphertext is immediately detected and rejected', async () => {
      const { masterKey } = await setupUserMasterKey(originalPassword);
      const plaintext = new TextEncoder().encode('Authentic Evidence File Content').buffer;
      const encrypted = await encryptDocument(plaintext, masterKey);

      // Tamper with ciphertext by flipping a single bit
      const tamperedBytes = new Uint8Array(encrypted.ciphertext);
      tamperedBytes[0] ^= 0x01;

      await expect(
        decryptDocument(
          tamperedBytes.buffer,
          encrypted.wrappedDekHex,
          encrypted.ivHex,
          encrypted.dekIvHex,
          encrypted.sha256Hex,
          masterKey
        )
      ).rejects.toThrow();
    });

    it('Envelope encryption with Authenticated Additional Data (AAD) binds metadata and rejects tampered AAD', async () => {
      const { masterKey } = await setupUserMasterKey(originalPassword);
      const plaintext = new TextEncoder().encode('Confidential dispute claim #49102').buffer;
      const aad = new TextEncoder().encode('userId:user_123|docId:doc_456').buffer;

      // Encrypt with AAD bound
      const encrypted = await encryptDocument(plaintext, masterKey, aad);

      // Decrypt with correct AAD succeeds
      const decrypted = await decryptDocument(
        encrypted.ciphertext,
        encrypted.wrappedDekHex,
        encrypted.ivHex,
        encrypted.dekIvHex,
        encrypted.sha256Hex,
        masterKey,
        aad
      );
      expect(new TextDecoder().decode(decrypted)).toBe('Confidential dispute claim #49102');

      // Decrypt with tampered AAD (e.g. attacker changing document/user ownership binding) fails
      const tamperedAad = new TextEncoder().encode('userId:attacker_999|docId:doc_456').buffer;
      await expect(
        decryptDocument(
          encrypted.ciphertext,
          encrypted.wrappedDekHex,
          encrypted.ivHex,
          encrypted.dekIvHex,
          encrypted.sha256Hex,
          masterKey,
          tamperedAad
        )
      ).rejects.toThrow();

      // Decrypt with missing AAD fails
      await expect(
        decryptDocument(
          encrypted.ciphertext,
          encrypted.wrappedDekHex,
          encrypted.ivHex,
          encrypted.dekIvHex,
          encrypted.sha256Hex,
          masterKey
        )
      ).rejects.toThrow();
    });
  });

  describe('PHASE 2 & 4: CSRF Protection & Guest Policy Isolation', () => {
    it('CSRF Protection: allows safe GET requests and same-origin JSON POST requests', () => {
      // Safe GET request
      const getReq = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      });
      expect(validateCsrf(getReq).valid).toBe(true);

      // Same-origin POST request
      const postReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
        },
      });
      expect(validateCsrf(postReq).valid).toBe(true);
    });

    it('CSRF Protection: rejects cross-site state-changing POST requests from untrusted origins', () => {
      const hostileReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'https://evil-phishing-site.com',
          'content-type': 'application/json',
        },
      });

      const check = validateCsrf(hostileReq);
      expect(check.valid).toBe(false);
      expect(check.errorResponse?.status).toBe(403);
    });
  });
});

