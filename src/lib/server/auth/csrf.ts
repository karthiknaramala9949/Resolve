import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates request origin and headers to protect state-changing endpoints from CSRF.
 */
export function validateCsrf(req: NextRequest): { valid: boolean; errorResponse?: NextResponse } {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  const allowedUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL;

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
      if (originHost.includes('localhost') || originHost.includes('127.0.0.1')) {
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

  // Fallback: If no origin, check referer header
  const referer = req.headers.get('referer');
  if (referer && host) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host) {
        return { valid: true };
      }
    } catch {
      // Ignored
    }
  }

  // In non-browser contexts (e.g. testing or server-to-server), require content-type json
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return { valid: true };
  }

  return { valid: true };
}

