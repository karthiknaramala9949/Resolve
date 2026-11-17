import { NextResponse } from 'next/server';

/**
 * Resolves the dedicated CONVEX_SERVER_SECRET for authoritative server-to-server
 * mutation calls from Next.js Route Handlers to Convex backend.
 *
 * Enforces strict presence: throws an error if missing or empty.
 * Never falls back to BETTER_AUTH_SECRET.
 */
export function getConvexServerSecret(): string {
  const secret = process.env.CONVEX_SERVER_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'CONVEX_SERVER_SECRET environment variable is missing or empty. Server-side Convex auth mutations cannot be executed.'
    );
  }
  if (secret.trim().length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error('CONVEX_SERVER_SECRET must be at least 32 characters long in production.');
  }
  return secret.trim();
}

/**
 * Checks for Convex server-only gate rejections (misconfiguration or authorization failure).
 * Maps SERVER_GATE_MISCONFIGURED and UNAUTHORIZED_DIRECT_CALL to HTTP 500 with a generic message,
 * and logs the failure at error level.
 */
export function checkGateError(convexRes: any): NextResponse | null {
  if (convexRes?.code === 'SERVER_GATE_MISCONFIGURED' || convexRes?.code === 'UNAUTHORIZED_DIRECT_CALL') {
    console.error(
      `[AUTH SECURITY ERROR] Server-only auth gate failure: code=${convexRes.code}, details=${convexRes.error}`
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication service is temporarily unavailable. Please try again later.',
        code: 'AUTH_GATE_ERROR',
      },
      { status: 500 }
    );
  }
  return null;
}

