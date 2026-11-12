/**
 * Security Sanitization & Injection Prevention Utilities
 * Covers A-07 (CRLF), A-08 (Header Injection), A-10 (Log Injection),
 * A-15 (Prototype Pollution), and A-17 (Client-Side Injection).
 */

/**
 * Strips carriage returns and newlines from log inputs to prevent Log Forgery / Log Injection (A-10).
 */
export function sanitizeLogString(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  return str.replace(/[\r\n\x00-\x1f\x7f]/g, ' ').trim();
}

/**
 * Sanitizes header values to prevent HTTP Response Splitting and CRLF Injection (A-07, A-08, E-26).
 */
export function sanitizeHeaderValue(value: string): string {
  if (!value) return '';
  return value.replace(/[\r\n\x00-\x1f]/g, '').trim();
}

/**
 * HTML-encodes user content to prevent Stored and Reflected XSS (B-01, B-02, A-17).
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates a prototype-less object dictionary to prevent Prototype Pollution (A-15).
 */
export function createSafeMap<T = unknown>(): Record<string, T> {
  return Object.create(null);
}

/**
 * Deep freezes an object recursively to prevent tampering or prototype modification (A-15).
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = (obj as any)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

