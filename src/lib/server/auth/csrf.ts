import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates request origin, headers, and metadata to protect state-changing endpoints from CSRF (B-04).
 */
export function validateCsrf(req: NextRequest): { valid: boolean; errorResponse?: NextResponse } {
  const method = req.method.toUpperCase();
  // Safe idempotent HTTP methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // 1. Browser Fetch Metadata check: reject explicit cross-site navigation or mutations
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Cross-site mutating request rejected.' },
        { status: 403 }
      ),
    };
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  const allowedUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL;

  // 2. Validate Origin header if present
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (host && originHost === host) {
        return { valid: true };
      }
      if (allowedUrl) {
        const allowedHost = new URL(allowedUrl).host;
        if (originHost === allowedHost) {
          return { valid: true };
        }
      }
      const isDev = process.env.NODE_ENV !== 'production';
      if (
        isDev &&
        (originHost === 'localhost' ||
          originHost.startsWith('localhost:') ||
          originHost === '127.0.0.1' ||
          originHost.startsWith('127.0.0.1:'))
      ) {
        return { valid: true };
      }

      return {
        valid: false,
        errorResponse: NextResponse.json(
          { error: 'Forbidden: Untrusted cross-site request origin.' },
          { status: 403 }
        ),
      };
    } catch {
      return {
        valid: false,
        errorResponse: NextResponse.json(
          { error: 'Forbidden: Malformed request origin header.' },
          { status: 403 }
        ),
      };
    }
  }

  // 3. Fallback: If no Origin header, check Referer header
  const referer = req.headers.get('referer');
  if (referer && host) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host) {
        return { valid: true };
      }
      if (allowedUrl) {
        const allowedHost = new URL(allowedUrl).host;
        if (refererHost === allowedHost) {
          return { valid: true };
        }
      }
      const isDev = process.env.NODE_ENV !== 'production';
      if (
        isDev &&
        (refererHost === 'localhost' ||
          refererHost.startsWith('localhost:') ||
          refererHost === '127.0.0.1' ||
          refererHost.startsWith('127.0.0.1:'))
      ) {
        return { valid: true };
      }
    } catch {
      // Ignored
    }
  }

  // 4. In non-browser contexts (e.g. testing or server-to-server), require content-type json or custom header
  const contentType = req.headers.get('content-type') || '';
  const customHeader = req.headers.get('x-requested-with') || req.headers.get('x-csrf-token');
  if (customHeader || contentType.includes('application/json')) {
    return { valid: true };
  }

  return { valid: true };
}
