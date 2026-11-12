import { NextRequest, NextResponse } from 'next/server';
import { getSessionTokenFromCookies, clearSessionCookie } from '@/lib/server/auth/session';
import { authStore } from '@/lib/server/db/authStore';
import { deleteSessionFromConvex } from '@/lib/server/convex/convexClient';
import { validateCsrf } from '@/lib/server/auth/csrf';

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrf(req);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const token = await getSessionTokenFromCookies();
    if (token) {
      await Promise.all([
        authStore.deleteSession(token),
        deleteSessionFromConvex(token),
      ]);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully.',
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');

    clearSessionCookie(response);
    response.cookies.set('resolve_guest', '', {
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('[Logout API Error]:', err);
    const response = NextResponse.json(
      { error: 'An error occurred during logout.' },
      { status: 500 }
    );
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    clearSessionCookie(response);
    return response;
  }
}

