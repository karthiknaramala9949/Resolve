import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { authStore } from '../db/authStore';
import { signPayload, verifySignedPayload } from './crypto';
import { UserProfile, UserRecord } from '../db/types';

export const SESSION_COOKIE_NAME = 'resolve_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days = 2,592,000s (remember me on)
export const SESSION_MAX_AGE_SHORT_SECONDS = 24 * 60 * 60; // 1 day = 86,400s (remember me off)

/**
 * Returns cookie options compliant with production security guidelines.
 * Persistent cookie: maxAge is always explicitly configured so it survives browser restarts.
 */
export function getSessionCookieOptions(rememberMe: boolean = true) {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = rememberMe ? SESSION_MAX_AGE_SECONDS : SESSION_MAX_AGE_SHORT_SECONDS;
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/**
 * Attaches the signed session cookie to an outgoing Next.js response.
 * Encodes session token and expiry timestamp in the HMAC-SHA256 signature payload.
 */
export function setSessionCookie(
  response: NextResponse,
  sessionToken: string,
  rememberMe: boolean = true
): void {
  const options = getSessionCookieOptions(rememberMe);
  const expiresAt = Date.now() + options.maxAge * 1000;
  // Unambiguous structured JSON payload encoding token and expiration epoch timestamp
  const payload = JSON.stringify({ t: sessionToken, exp: expiresAt });
  const signed = signPayload(payload);
  response.cookies.set(options.name, signed, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: options.maxAge,
  });
}

/**
 * Removes the session cookie on logout.
 */
export function clearSessionCookie(response: NextResponse): void {
  const options = getSessionCookieOptions();
  response.cookies.set(options.name, '', {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Extracts and verifies the session token from Next.js server cookies.
 * Rejects expired tokens or invalid signatures.
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;

    const payload = verifySignedPayload(cookie.value);
    if (!payload) return null;

    // 1. Structured JSON format
    if (payload.startsWith('{') && payload.endsWith('}')) {
      try {
        const parsed = JSON.parse(payload);
        if (typeof parsed.exp === 'number' && parsed.exp < Date.now()) {
          return null; // Expired
        }
        return parsed.t || null;
      } catch {
        return null;
      }
    }

    // 2. Delimited format: `<token>:<expiresAt>`
    if (payload.includes(':')) {
      const lastColon = payload.lastIndexOf(':');
      const token = payload.slice(0, lastColon);
      const expiryStr = payload.slice(lastColon + 1);
      const expiryNum = Number(expiryStr);
      if (!isNaN(expiryNum) && expiryNum < Date.now()) {
        return null; // Expired
      }
      return token;
    }

    // 3. Legacy cookies without embedded expiry
    if (process.env.NODE_ENV === 'production') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

import { getServerConvexClient } from '../convex/convexClient';
import { api } from '../../../../convex/_generated/api';

/**
 * Retrieves the currently authenticated user record, or null if unauthenticated.
 */
export async function getCurrentUser(): Promise<{
  user: UserProfile;
  rawUser: UserRecord;
  sessionToken: string;
} | null> {
  const token = await getSessionTokenFromCookies();
  if (!token) return null;

  // 1. Authoritative Convex session verification
  const client = getServerConvexClient();
  if (client) {
    try {
      const convexUser = await client.query(api.auth.getCurrentUser, { sessionToken: token });
      if (convexUser) {
        return {
          user: convexUser as unknown as UserProfile,
          rawUser: convexUser as unknown as UserRecord,
          sessionToken: token,
        };
      }
    } catch {
      // Deferred to in-memory check only if network/connectivity failed
    }
  }

  // 2. In-memory fallback for local mock / unit testing
  const session = await authStore.findSessionByToken(token);
  if (!session) return null;

  const rawUser = await authStore.findUserById(session.userId);
  if (!rawUser) {
    await authStore.deleteSession(token);
    return null;
  }

  return {
    user: authStore.toUserProfile(rawUser),
    rawUser,
    sessionToken: token,
  };
}

