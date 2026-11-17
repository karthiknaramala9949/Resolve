import { NextResponse } from 'next/server';
import { getCurrentUser, clearSessionCookie } from '@/lib/server/auth/session';
import { syncSessionToConvex } from '@/lib/server/convex/convexClient';

export const dynamic = 'force-dynamic';

function clearAllAuthCookies(res: NextResponse) {
  clearSessionCookie(res);
  res.cookies.set('better-auth.session_token', '', { path: '/', maxAge: 0, expires: new Date(0) });
  res.cookies.set('__Secure-better-auth.session_token', '', { path: '/', maxAge: 0, expires: new Date(0) });
  res.cookies.set('resolve_guest', '', { path: '/', maxAge: 0, expires: new Date(0) });
}

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      const res = NextResponse.json({ user: null, sessionToken: null }, { status: 200 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.headers.set('Pragma', 'no-cache');
      clearAllAuthCookies(res);
      return res;
    }

    // Ensure active session is registered in Convex
    await syncSessionToConvex(auth.rawUser, auth.sessionToken);

    const res = NextResponse.json({
      user: auth.user,
      sessionToken: auth.sessionToken,
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    return res;
  } catch (err) {
    console.error('[Auth Me API Error]:', err);
    const res = NextResponse.json({ user: null, sessionToken: null }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    clearAllAuthCookies(res);
    return res;
  }
}
