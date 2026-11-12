/**
 * Secure Redirect URL Sanitizer & Allowlist Validator (B-06 Open Redirect Prevention)
 *
 * Strictly prevents open redirect attacks by:
 * 1. Rejecting protocol-relative URLs (`//attacker.com`).
 * 2. Rejecting backslash tricks (`/\attacker.com`, `\/attacker.com`).
 * 3. Rejecting non-HTTP protocols (`javascript:`, `data:`, `vbscript:`).
 * 4. Ensuring destination is either an internal relative path or matches the trusted application origin.
 */

export function sanitizeRedirectUrl(
  targetUrl: string | null | undefined,
  trustedOrigin?: string,
  fallback = '/app/overview'
): string {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return fallback;
  }

  const trimmed = targetUrl.trim();

  // Reject empty string
  if (!trimmed) {
    return fallback;
  }

  // Reject protocol-relative URLs (`//`) and backslash prefixes (`/\`, `\/`, `\\`)
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('\\/') ||
    trimmed.startsWith('\\\\') ||
    trimmed.startsWith('/_')
  ) {
    return fallback;
  }

  // Reject dangerous pseudo-protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.includes('\r') ||
    lower.includes('\n')
  ) {
    return fallback;
  }

  // Valid internal relative path (must start with `/` and not have a host)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    // Extra safety: parse with dummy base to verify pathname
    try {
      const parsed = new URL(trimmed, 'https://internal.resolve.one');
      if (parsed.origin !== 'https://internal.resolve.one') {
        return fallback;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return fallback;
    }
  }

  // If absolute URL provided, verify exact origin match
  if (trustedOrigin) {
    try {
      const parsedTarget = new URL(trimmed);
      const parsedTrusted = new URL(trustedOrigin);

      if (parsedTarget.origin === parsedTrusted.origin) {
        return `${parsedTarget.pathname}${parsedTarget.search}${parsedTarget.hash}`;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

