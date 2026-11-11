import { NextResponse } from 'next/server';
import { getSessionTokenFromCookies, clearSessionCookie } from '@/lib/server/auth/session';
import { authStore } from '@/lib/server/db/authStore';
import { deleteSessionFromConvex } from '@/lib/server/convex/convexClient';

export async function POST() {
  try {
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
    clearSessionCookie(response);
    return response;
  }
}

