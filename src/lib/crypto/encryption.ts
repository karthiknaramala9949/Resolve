/**
 * Client-Side WebCrypto AES-GCM Local Encryption
 * Stored strictly on the consumer's device. No key is ever sent to any server.
 */

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBuffer(
  data: ArrayBuffer,
  passphrase: string
): Promise<{ cipher: ArrayBuffer; salt: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    cipher,
    salt: Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join(''),
    iv: Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join(''),
  };
}

export async function decryptBuffer(
  cipher: ArrayBuffer,
  passphrase: string,
  saltHex: string,
  ivHex: string
): Promise<ArrayBuffer> {
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const key = await deriveKey(passphrase, salt);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher
  );
}

