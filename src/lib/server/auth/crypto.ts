import crypto from 'node:crypto';
import { argon2id } from '@noble/hashes/argon2.js';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LEN = 64; // 64 bytes = 512 bits
const PBKDF2_DIGEST = 'sha512';
const SALT_BYTES = 32;

export const ARGON2_PREFIX = '$argon2id$v=19$';

let devFallbackSecret: string | null = null;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Returns the secret key used for signing session cookies and tokens.
 * Throws in production if BETTER_AUTH_SECRET is missing or < 32 chars.
 * In development, generates a random per-process secret and logs a warning.
 */
export function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'BETTER_AUTH_SECRET environment variable is missing or shorter than 32 characters.'
      );
    }
    if (!devFallbackSecret) {
      devFallbackSecret = crypto.randomBytes(32).toString('hex');
      console.warn(
        '[RESOLVE-ONE AUTH WARNING] BETTER_AUTH_SECRET is not set or shorter than 32 characters. Generated a random per-process secret for development.'
      );
    }
    return devFallbackSecret;
  }
  return secret;
}

/**
 * Hash a plain password using Argon2id (OWASP recommended memory-hard hashing).
 */
export function hashPasswordArgon2id(
  password: string,
  existingSalt?: string
): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const saltBytes = hexToBytes(salt);
  const derived = argon2id(password, saltBytes, {
    t: 2,
    m: 16384,
    p: 1,
    dkLen: 32,
  });
  const hashHex = Buffer.from(derived).toString('hex');
  return {
    hash: `${ARGON2_PREFIX}m=16384,t=2,p=1$${hashHex}`,
    salt,
  };
}

/**
 * Hash a plain password using PBKDF2-HMAC-SHA512.
 */
export function hashPasswordPBKDF2(
  password: string,
  existingSalt?: string
): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(
    password,
    Buffer.from(salt, 'hex'),
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LEN,
    PBKDF2_DIGEST
  );
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

/**
 * Primary password hashing function.
 * Supports Argon2id and PBKDF2-HMAC-SHA512 algorithms.
 */
export function hashPassword(
  password: string,
  existingSalt?: string,
  algo: 'pbkdf2' | 'argon2id' = 'pbkdf2'
): { hash: string; salt: string } {
  if (algo === 'argon2id') {
    return hashPasswordArgon2id(password, existingSalt);
  }
  return hashPasswordPBKDF2(password, existingSalt);
}

/**
 * Verifies a plaintext password against the stored hash and salt using timing-safe comparison.
 * Seamlessly validates both Argon2id and PBKDF2-HMAC-SHA512 hashes.
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  try {
    if (storedHash.startsWith(ARGON2_PREFIX)) {
      const parts = storedHash.split('$');
      const expectedHex = parts[4] || parts[3];
      const saltBytes = hexToBytes(salt);
      const derived = argon2id(password, saltBytes, {
        t: 2,
        m: 16384,
        p: 1,
        dkLen: 32,
      });
      const hashBuffer = Buffer.from(derived);
      const storedBuffer = Buffer.from(expectedHex, 'hex');

      if (hashBuffer.length !== storedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(hashBuffer, storedBuffer);
    }

    // Standard PBKDF2-HMAC-SHA512 verification
    const { hash } = hashPasswordPBKDF2(password, salt);
    const hashBuffer = Buffer.from(hash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (hashBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure random hexadecimal token.
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateNumericOtp(digits = 6): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Sign a session token or identifier with HMAC-SHA256 to ensure authenticity.
 * Format: `<payload>.<signature>`
 */
export function signPayload(payload: string, secret = getAuthSecret()): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verifies a signed payload and extracts the original string if authentic.
 */
export function verifySignedPayload(
  signedValue: string,
  secret = getAuthSecret()
): string | null {
  const lastDot = signedValue.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = signedValue.slice(0, lastDot);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  const actualSignature = signedValue.slice(lastDot + 1);

  try {
    const expectedBuf = Buffer.from(expectedSignature);
    const actualBuf = Buffer.from(actualSignature);
    if (expectedBuf.length !== actualBuf.length) return null;

    if (crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return payload;
    }
  } catch {
    return null;
  }

  return null;
}
