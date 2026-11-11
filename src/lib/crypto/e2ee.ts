/**
 * RESOLVE-ONE Client-Side End-to-End Encryption (E2EE) Subsystem
 *
 * Implements envelope encryption using WebCrypto AES-256-GCM and PBKDF2 (SHA-256).
 * Zero-Knowledge Architecture: Neither Convex nor any cloud storage provider
 * ever receives the User Master Key (UMK), Document Encryption Keys (DEKs),
 * or plaintext document content.
 */

const PBKDF2_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH_BYTES = 12; // 96 bits recommended for AES-GCM
const SALT_LENGTH_BYTES = 16;

export interface EncryptedPayload {
  ciphertext: ArrayBuffer;
  ivHex: string;
  wrappedDekHex: string;
  dekIvHex: string;
  sha256Hex: string;
  originalSize: number;
}

export interface MasterKeyBundle {
  wrappedMasterKeyHex: string;
  saltHex: string;
  ivHex: string;
  recoveryKey: string;
  recoveryWrappedMasterKeyHex: string;
  recoveryKeyHashHex: string;
}

/**
 * Utility: Convert byte array to hexadecimal string
 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Utility: Convert hexadecimal string to Uint8Array
 */
export function hexToBuffer(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0);
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

/**
 * Calculates SHA-256 checksum of an ArrayBuffer
 */
export async function calculateSHA256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Derives a Key Encryption Key (KEK) from a user passphrase and salt via PBKDF2
 */
async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Generates a human-readable 24-character recovery phrase in grouped format
 */
export function generateRecoveryKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = bufferToHex(bytes).toUpperCase();
  return `RS-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 24)}`;
}

/**
 * Initialize a brand new User Master Key (UMK) and wrap with passphrase & recovery key
 */
export async function setupUserMasterKey(passphrase: string): Promise<{
  masterKey: CryptoKey;
  bundle: MasterKeyBundle;
}> {
  // 1. Generate random 256-bit AES-GCM Master Key
  const masterKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true, // extractable for key wrapping
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  // 2. Derive KEK from user passphrase
  const salt = new Uint8Array(SALT_LENGTH_BYTES);
  crypto.getRandomValues(salt);
  const kek = await deriveKeyFromPassphrase(passphrase, salt);

  // 3. Wrap Master Key with passphrase KEK
  const iv = new Uint8Array(IV_LENGTH_BYTES);
  crypto.getRandomValues(iv);
  const wrappedMasterKey = await crypto.subtle.wrapKey('raw', masterKey, kek, {
    name: 'AES-GCM',
    iv: iv.buffer as ArrayBuffer,
  });

  // 4. Generate recovery key and derive recovery KEK
  const recoveryKey = generateRecoveryKey();
  const recoverySalt = new Uint8Array(SALT_LENGTH_BYTES);
  crypto.getRandomValues(recoverySalt);
  const recoveryKek = await deriveKeyFromPassphrase(recoveryKey, recoverySalt);

  const recoveryIv = new Uint8Array(IV_LENGTH_BYTES);
  crypto.getRandomValues(recoveryIv);
  const recoveryWrappedMasterKey = await crypto.subtle.wrapKey(
    'raw',
    masterKey,
    recoveryKek,
    { name: 'AES-GCM', iv: recoveryIv.buffer as ArrayBuffer }
  );

  const enc = new TextEncoder();
  const recoveryKeyHash = await calculateSHA256(enc.encode(recoveryKey).buffer as ArrayBuffer);

  return {
    masterKey,
    bundle: {
      wrappedMasterKeyHex: bufferToHex(wrappedMasterKey),
      saltHex: bufferToHex(salt),
      ivHex: bufferToHex(iv),
      recoveryKey,
      recoveryWrappedMasterKeyHex: `${bufferToHex(recoverySalt)}:${bufferToHex(recoveryIv)}:${bufferToHex(recoveryWrappedMasterKey)}`,
      recoveryKeyHashHex: recoveryKeyHash,
    },
  };
}

/**
 * Unwraps the User Master Key using the user's passphrase and stored salt/IV
 */
export async function unlockMasterKeyWithPassphrase(
  passphrase: string,
  wrappedMasterKeyHex: string,
  saltHex: string,
  ivHex: string
): Promise<CryptoKey> {
  const salt = hexToBuffer(saltHex);
  const iv = hexToBuffer(ivHex);
  const wrappedKeyBytes = hexToBuffer(wrappedMasterKeyHex);

  const kek = await deriveKeyFromPassphrase(passphrase, salt);

  return await crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBytes.buffer as ArrayBuffer,
    kek,
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Unwraps the User Master Key using the user's recovery key
 */
export async function unlockMasterKeyWithRecoveryKey(
  recoveryKey: string,
  recoveryWrappedBundleHex: string
): Promise<CryptoKey> {
  const parts = recoveryWrappedBundleHex.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid recovery key bundle format.');
  }

  const salt = hexToBuffer(parts[0]);
  const iv = hexToBuffer(parts[1]);
  const wrappedKeyBytes = hexToBuffer(parts[2]);

  const recoveryKek = await deriveKeyFromPassphrase(recoveryKey.trim(), salt);

  return await crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBytes.buffer as ArrayBuffer,
    recoveryKek,
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * In-memory active Master Key session cache
 */
let inMemoryMasterKey: CryptoKey | null = null;

export function setActiveMasterKey(key: CryptoKey | null): void {
  inMemoryMasterKey = key;
}

export function getActiveMasterKey(): CryptoKey | null {
  return inMemoryMasterKey;
}

/**
 * Encrypt a file or ArrayBuffer using Envelope Encryption with AES-256-GCM.
 * Generates a random Document Encryption Key (DEK), encrypts the data,
 * and wraps the DEK with the user's Master Key.
 */
export async function encryptDocument(
  data: ArrayBuffer,
  masterKey: CryptoKey
): Promise<EncryptedPayload> {
  // 1. Calculate SHA-256 fingerprint of plaintext file
  const sha256Hex = await calculateSHA256(data);

  // 2. Generate unique random 256-bit DEK
  const dek = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true, // extractable for wrapping
    ['encrypt', 'decrypt']
  );

  // 3. Encrypt data with DEK and unique 12-byte IV
  const iv = new Uint8Array(IV_LENGTH_BYTES);
  crypto.getRandomValues(iv);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    dek,
    data
  );

  // 4. Wrap DEK with User Master Key (UMK)
  const dekIv = new Uint8Array(IV_LENGTH_BYTES);
  crypto.getRandomValues(dekIv);

  const wrappedDek = await crypto.subtle.wrapKey('raw', dek, masterKey, {
    name: 'AES-GCM',
    iv: dekIv.buffer as ArrayBuffer,
  });

  return {
    ciphertext,
    ivHex: bufferToHex(iv),
    wrappedDekHex: bufferToHex(wrappedDek),
    dekIvHex: bufferToHex(dekIv),
    sha256Hex,
    originalSize: data.byteLength,
  };
}

/**
 * Decrypt an encrypted document buffer using the user's Master Key.
 * Unwraps the DEK, decrypts the ciphertext, and verifies the SHA-256 fingerprint.
 */
export async function decryptDocument(
  ciphertext: ArrayBuffer,
  wrappedDekHex: string,
  ivHex: string,
  dekIvHex: string,
  expectedSha256Hex?: string,
  masterKey?: CryptoKey
): Promise<ArrayBuffer> {
  const activeKey = masterKey || inMemoryMasterKey;
  if (!activeKey) {
    throw new Error('E2EE Master Key is not unlocked. Please provide your passphrase.');
  }

  // 1. Unwrap DEK using Master Key
  const wrappedDek = hexToBuffer(wrappedDekHex);
  const dekIv = hexToBuffer(dekIvHex);

  const dek = await crypto.subtle.unwrapKey(
    'raw',
    wrappedDek.buffer as ArrayBuffer,
    activeKey,
    { name: 'AES-GCM', iv: dekIv.buffer as ArrayBuffer },
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['decrypt']
  );

  // 2. Decrypt ciphertext with DEK and IV
  const iv = hexToBuffer(ivHex);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    dek,
    ciphertext
  );

  // 3. Verify SHA-256 fingerprint
  if (expectedSha256Hex) {
    const actualSha256 = await calculateSHA256(decrypted);
    if (actualSha256.toLowerCase() !== expectedSha256Hex.toLowerCase()) {
      throw new Error(
        `Cryptographic integrity error: SHA-256 mismatch! Expected ${expectedSha256Hex}, got ${actualSha256}`
      );
    }
  }

  return decrypted;
}
