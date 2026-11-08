import { describe, it, expect } from 'vitest';
import { encryptBuffer, decryptBuffer } from '@/lib/crypto/encryption';

describe('WebCrypto AES-GCM Client-Side Encryption (Signature Feature #10)', () => {
  it('encrypts and successfully decrypts data with correct passphrase', async () => {
    const enc = new TextEncoder();
    const originalText = 'Sensitive consumer dispute evidence and receipts';
    const plainBuffer = enc.encode(originalText).buffer;
    const passphrase = 'my-secure-dispute-key-2026';

    const { cipher, salt, iv } = await encryptBuffer(plainBuffer, passphrase);

    expect(cipher).toBeDefined();
    expect(salt).toHaveLength(32); // 16 bytes in hex
    expect(iv).toHaveLength(24); // 12 bytes in hex

    // Decrypt with correct passphrase
    const decryptedBuffer = await decryptBuffer(cipher, passphrase, salt, iv);
    const decryptedText = new TextDecoder().decode(decryptedBuffer);

    expect(decryptedText).toBe(originalText);
  });

  it('fails decryption when provided an invalid passphrase', async () => {
    const enc = new TextEncoder();
    const plainBuffer = enc.encode('Confidential bank record').buffer;

    const { cipher, salt, iv } = await encryptBuffer(plainBuffer, 'correct-passphrase');

    // Attempt decryption with wrong passphrase
    await expect(
      decryptBuffer(cipher, 'wrong-passphrase', salt, iv)
    ).rejects.toThrow();
  });
});

