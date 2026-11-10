import { NextResponse } from 'next/server';
import { getSessionTokenFromCookies, clearSessionCookie } from '@/lib/server/auth/session';
import { authStore } from '@/lib/server/db/authStore';

export async function POST() {
  try {
    const token = await getSessionTokenFromCookies();
    if (token) {
      await authStore.deleteSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully.',
    });

    clearSessionCookie(response);
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

