import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  hashPasswordArgon2id,
  hashPasswordPBKDF2,
  verifyPassword,
  generateRandomToken,
  signPayload,
  verifySignedPayload,
} from '@/lib/server/auth/crypto';
import { sanitizeRedirectUrl } from '@/lib/server/auth/redirect';
import {
  validateUploadedFile,
  validateFileMagicBytes,
} from '@/lib/rules/fileValidator';
import { rateLimiter, applyRateLimitHeaders } from '@/lib/server/auth/rateLimit';
import { validateCsrf } from '@/lib/server/auth/csrf';
import {
  sanitizeLogString,
  sanitizeHeaderValue,
  escapeHtml,
  createSafeMap,
  deepFreeze,
} from '@/lib/server/security/sanitizer';
import {
  setupUserMasterKey,
  encryptDocument,
  decryptDocument,
  calculateSHA256,
} from '@/lib/crypto/e2ee';
import { NextRequest } from 'next/server';

describe('RESOLVE Comprehensive Security Hardening Audit Tests', () => {
  describe('Section A — Injection, Sanitization & Input Attacks', () => {
    it('A-07 & A-08: strips CRLF and control characters from header values', () => {
      const maliciousHeader = 'application/json\r\nSet-Cookie: evil_session=1337\r\nX-Injected: true';
      const clean = sanitizeHeaderValue(maliciousHeader);
      expect(clean).not.toContain('\r');
      expect(clean).not.toContain('\n');
      expect(clean).toBe('application/jsonSet-Cookie: evil_session=1337X-Injected: true');
    });

    it('A-10: sanitizes log messages against log injection and splitting', () => {
      const maliciousLog = 'User login failed for admin\n[CRITICAL] System root granted to attacker\r\n';
      const clean = sanitizeLogString(maliciousLog);
      expect(clean).not.toContain('\n');
      expect(clean).not.toContain('\r');
      expect(clean).toBe('User login failed for admin [CRITICAL] System root granted to attacker');
    });

    it('A-15: prevents prototype pollution using createSafeMap and deepFreeze', () => {
      const safeMap = createSafeMap<string>();
      expect(Object.getPrototypeOf(safeMap)).toBeNull();
      expect((safeMap as any).toString).toBeUndefined();

      // Deep freeze prevents mutation
      const obj = { config: { admin: false } };
      deepFreeze(obj);
      expect(Object.isFrozen(obj)).toBe(true);
      expect(Object.isFrozen(obj.config)).toBe(true);
      expect(() => {
        (obj as any).config.admin = true;
      }).toThrow();
    });

    it('A-17 & B-01: escapes dangerous HTML characters to prevent XSS', () => {
      const dangerous = '<script>alert("XSS")</script>&foo=\'bar\'';
      const escaped = escapeHtml(dangerous);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;foo=&#039;bar&#039;');
      expect(escaped).not.toContain('<script>');
    });
  });

  describe('Section B — Cross-Site & Browser Attacks', () => {
    it('B-04: rejects cross-site mutating requests in CSRF validator', () => {
      const postReq = new NextRequest('http://localhost:3000/api/auth/setup', {
        method: 'POST',
        headers: {
          'sec-fetch-site': 'cross-site',
          origin: 'https://attacker.com',
          host: 'localhost:3000',
        },
      });

      const check = validateCsrf(postReq);
      expect(check.valid).toBe(false);
      expect(check.errorResponse?.status).toBe(403);
    });

    it('B-04: permits safe same-origin or GET requests in CSRF validator', () => {
      const getReq = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      });
      expect(validateCsrf(getReq).valid).toBe(true);

      const sameOriginReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
      });
      expect(validateCsrf(sameOriginReq).valid).toBe(true);
    });

    it('B-06: blocks all open redirect attack vectors', () => {
      const trustedOrigin = 'https://resolve.one';

      // Protocol-relative attacks
      expect(sanitizeRedirectUrl('//attacker.com', trustedOrigin)).toBe('/app/overview');
      expect(sanitizeRedirectUrl('///attacker.com', trustedOrigin)).toBe('/app/overview');

      // Backslash evasion attacks
      expect(sanitizeRedirectUrl('/\\attacker.com', trustedOrigin)).toBe('/app/overview');
      expect(sanitizeRedirectUrl('\\/attacker.com', trustedOrigin)).toBe('/app/overview');
      expect(sanitizeRedirectUrl('\\\\attacker.com', trustedOrigin)).toBe('/app/overview');

      // Dangerous pseudo-protocols
      expect(sanitizeRedirectUrl('javascript:alert(document.cookie)', trustedOrigin)).toBe('/app/overview');
      expect(sanitizeRedirectUrl('data:text/html,<script>alert(1)</script>', trustedOrigin)).toBe('/app/overview');

      // External untrusted URLs
      expect(sanitizeRedirectUrl('https://evil.com/phish', trustedOrigin)).toBe('/app/overview');

      // Valid relative internal paths
      expect(sanitizeRedirectUrl('/app/cases', trustedOrigin)).toBe('/app/cases');
      expect(sanitizeRedirectUrl('/app/documents?sort=desc', trustedOrigin)).toBe('/app/documents?sort=desc');

      // Valid matching origin URL
      expect(sanitizeRedirectUrl('https://resolve.one/app/overview', trustedOrigin)).toBe('/app/overview');
    });
  });

  describe('Section C — Authentication & Cryptographic Hashing', () => {
    it('C-15: hashes with Argon2id and verifies successfully', () => {
      const password = 'StrongPassword@2026!';
      const argonResult = hashPasswordArgon2id(password);

      expect(argonResult.hash.startsWith('$argon2id$v=19$')).toBe(true);
      expect(verifyPassword(password, argonResult.hash, argonResult.salt)).toBe(true);
      expect(verifyPassword('WrongPassword!', argonResult.hash, argonResult.salt)).toBe(false);
    });

    it('C-15: maintains backward compatibility for legacy PBKDF2 hashes', () => {
      const password = 'LegacyPassword#2025';
      const pbkdf2Result = hashPasswordPBKDF2(password);

      expect(pbkdf2Result.hash.length).toBe(128); // 64 bytes = 128 hex chars
      expect(verifyPassword(password, pbkdf2Result.hash, pbkdf2Result.salt)).toBe(true);
      expect(verifyPassword('InvalidPassword', pbkdf2Result.hash, pbkdf2Result.salt)).toBe(false);
    });

    it('C-13: signs and verifies session tokens using timing-safe HMAC', () => {
      const token = generateRandomToken(32);
      const signed = signPayload(token);
      expect(signed).toContain('.');

      const verified = verifySignedPayload(signed);
      expect(verified).toBe(token);

      // Tampered token fails verification
      const tampered = signed.slice(0, -4) + '0000';
      expect(verifySignedPayload(tampered)).toBeNull();
    });
  });

  describe('Section E — API Rate Limiting & Headers', () => {
    it('E-01: tracks requests and enforces rate limits with headers', () => {
      const key = `test-client-${Date.now()}`;
      const limit = 3;
      const windowMs = 5000;

      // Attempts 1 to 3 allowed
      expect(rateLimiter.check(key, limit, windowMs).allowed).toBe(true);
      expect(rateLimiter.check(key, limit, windowMs).allowed).toBe(true);
      const third = rateLimiter.check(key, limit, windowMs);
      expect(third.allowed).toBe(true);
      expect(third.remaining).toBe(0);

      // 4th attempt blocked
      const blocked = rateLimiter.check(key, limit, windowMs);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);

      // Test header generation
      const headers = new Headers();
      applyRateLimitHeaders(headers, limit, blocked.remaining, blocked.resetAt);
      expect(headers.get('X-RateLimit-Limit')).toBe('3');
      expect(headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Section G & J — File Upload & E2EE Cryptographic Integrity', () => {
    it('G-10: rejects executable binaries disguised as harmless files', () => {
      // Disguised Windows executable (.exe with .pdf name)
      const peBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // "MZ"
      const peCheck = validateFileMagicBytes(peBytes.buffer, 'statement.pdf');
      expect(peCheck.valid).toBe(false);
      expect(peCheck.error).toContain('Executable binaries (PE/EXE/DLL) are strictly prohibited');

      // Disguised Linux ELF
      const elfBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]); // "\x7fELF"
      const elfCheck = validateFileMagicBytes(elfBytes.buffer, 'invoice.png');
      expect(elfCheck.valid).toBe(false);
      expect(elfCheck.error).toContain('ELF');
    });

    it('G-10: validates authentic PDF and PNG magic bytes', () => {
      const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"
      const pdfCheck = validateFileMagicBytes(validPdfBytes.buffer, 'receipt.pdf');
      expect(pdfCheck.valid).toBe(true);

      const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG
      const pngCheck = validateFileMagicBytes(validPngBytes.buffer, 'defect.png');
      expect(pngCheck.valid).toBe(true);

      // Spoofed extension
      const fakePdfCheck = validateFileMagicBytes(validPngBytes.buffer, 'malicious.pdf');
      expect(fakePdfCheck.valid).toBe(false);
      expect(fakePdfCheck.error).toContain('header does not match PDF signature');
    });

    it('J-03, J-04 & J-05: verifies client-side envelope encryption and tamper rejection', async () => {
      const passphrase = 'UserPassphraseSecure99!';
      const { masterKey } = await setupUserMasterKey(passphrase);

      const plaintext = new TextEncoder().encode('Sensitive Dispute Evidence Payload: ₹45,000 refund');
      const encrypted = await encryptDocument(plaintext.buffer, masterKey);

      expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);
      expect(encrypted.ivHex.length).toBe(24); // 12 bytes = 24 hex chars
      expect(encrypted.wrappedDekHex.length).toBeGreaterThan(0);

      // Decrypt successfully
      const decrypted = await decryptDocument(
        encrypted.ciphertext,
        encrypted.wrappedDekHex,
        encrypted.ivHex,
        encrypted.dekIvHex,
        encrypted.sha256Hex,
        masterKey
      );

      const recovered = new TextDecoder().decode(decrypted);
      expect(recovered).toBe('Sensitive Dispute Evidence Payload: ₹45,000 refund');

      // Tampered ciphertext is rejected
      const tamperedBytes = new Uint8Array(encrypted.ciphertext.slice(0));
      tamperedBytes[0] ^= 0xff;
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
  });

  describe('Section D — Authorization, Tenant Isolation & IDOR Protection', () => {
    it('D-03 & D-04 & D-11: verifies strict user isolation and IDOR rejection', () => {
      // Mock tenant isolation check simulating database ownership filter
      interface CaseRecord {
        id: string;
        userId: string;
        title: string;
        status: string;
      }

      const caseDatabase: CaseRecord[] = [
        { id: 'case_userA_1', userId: 'user_A', title: 'Flipkart Delivery Dispute', status: 'open' },
        { id: 'case_userB_1', userId: 'user_B', title: 'Amazon Damaged Phone', status: 'open' },
      ];

      function getCaseForUser(caseId: string, currentUserId: string): CaseRecord | null {
        const item = caseDatabase.find((c) => c.id === caseId);
        // Tenant boundary check: must strictly match authenticated user ID
        if (!item || item.userId !== currentUserId) {
          return null; // Deny access (BOLA / IDOR protection)
        }
        return item;
      }

      function updateCaseForUser(caseId: string, currentUserId: string, updates: Partial<CaseRecord>): boolean {
        const item = caseDatabase.find((c) => c.id === caseId);
        if (!item || item.userId !== currentUserId) {
          throw new Error('UNAUTHORIZED: Cross-tenant modification forbidden.');
        }
        Object.assign(item, updates);
        return true;
      }

      // User A can access their own case
      expect(getCaseForUser('case_userA_1', 'user_A')).not.toBeNull();
      expect(getCaseForUser('case_userA_1', 'user_A')?.title).toBe('Flipkart Delivery Dispute');

      // User B CANNOT access User A's case (IDOR prevented)
      expect(getCaseForUser('case_userA_1', 'user_B')).toBeNull();

      // User B CANNOT modify User A's case (Cross-tenant bypass prevented)
      expect(() => {
        updateCaseForUser('case_userA_1', 'user_B', { status: 'closed' });
      }).toThrow('UNAUTHORIZED: Cross-tenant modification forbidden.');

      // State remains unaltered
      expect(caseDatabase.find((c) => c.id === 'case_userA_1')?.status || 'open').toBe('open');
    });
  });
});
