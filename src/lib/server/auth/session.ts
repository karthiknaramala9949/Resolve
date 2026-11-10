import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { authStore } from '../db/authStore';
import { signPayload, verifySignedPayload } from './crypto';
import { UserProfile, UserRecord } from '../db/types';

export const SESSION_COOKIE_NAME = 'resolve_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Returns cookie options compliant with production security guidelines.
 */
export function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Attaches the signed session cookie to an outgoing Next.js response.
 */
export function setSessionCookie(response: NextResponse, sessionToken: string): void {
  const signed = signPayload(sessionToken);
  const options = getSessionCookieOptions();
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
  });
}

/**
 * Extracts and verifies the session token from Next.js server cookies.
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;

    const token = verifySignedPayload(cookie.value);
    return token;
  } catch {
    return null;
  }
}

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

