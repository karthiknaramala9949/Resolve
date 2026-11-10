import crypto from 'node:crypto';

const ITERATIONS = 100000;
const KEY_LEN = 64; // 64 bytes = 512 bits
const DIGEST = 'sha512';
const SALT_BYTES = 32;

/**
 * Returns the secret key used for signing session cookies and tokens.
 * Falls back to a deterministic development key if not specified in environment.
 */
export function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    'resolve_default_secure_secret_at_least_32_characters_long_for_signing'
  );
}

/**
 * Hash a plain password using PBKDF2-HMAC-SHA512 with a cryptographically secure random salt.
 */
export function hashPassword(
  password: string,
  existingSalt?: string
): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(
    password,
    Buffer.from(salt, 'hex'),
    ITERATIONS,
    KEY_LEN,
    DIGEST
  );
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

/**
 * Verifies a plaintext password against the stored hash and salt using timing-safe comparison.
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  try {
    const { hash } = hashPassword(password, salt);
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

