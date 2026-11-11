import { NextRequest, NextResponse } from 'next/server';
import { getServerConvexClient } from '@/lib/server/convex/convexClient';
import { setSessionCookie } from '@/lib/server/auth/session';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { api } from '../../../../../convex/_generated/api';
import { authStore } from '@/lib/server/db/authStore';

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrf(req);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const isGuestEnabled = process.env.NEXT_PUBLIC_ENABLE_GUEST_ACCESS !== 'false';
    if (!isGuestEnabled) {
      return NextResponse.json(
        { error: 'Guest access is disabled by system policy. Please sign up or log in.' },
        { status: 403 }
      );
    }

    let name = 'Local Consumer';
    try {
      const body = await req.json();
      if (body?.name && typeof body.name === 'string') {
        name = body.name.trim();
      }
    } catch {
      // Body may be empty
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const client = getServerConvexClient();
    if (client) {
      try {
        const res = await client.mutation(api.auth.createGuestSession, {
          name,
          userAgent,
          ipAddress: ip,
        });

        if (res?.sessionToken && res?.user) {
          const response = NextResponse.json({
            success: true,
            user: res.user,
            sessionToken: res.sessionToken,
            message: 'Guest session created.',
          });

          setSessionCookie(response, res.sessionToken);
          response.cookies.set('resolve_guest', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60,
          });

          return response;
        }
      } catch (err: any) {
        console.warn('[Guest API] Convex cloud session creation deferred, using local fallback:', err?.message || err);
      }
    }

    // Fallback: in-memory guest user for offline / test mock
    const guestUser = await authStore.createUser({
      name,
      providers: ['guest'],
      emailVerified: false,
      phoneVerified: false,
    });
    const session = await authStore.createSession(guestUser.id, {
      userAgent,
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      user: authStore.toUserProfile(guestUser),
      sessionToken: session.token,
      message: 'Guest session created.',
    });

    setSessionCookie(response, session.token);
    response.cookies.set('resolve_guest', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('[Guest API Error]:', err);
    return NextResponse.json(
      { error: 'Failed to create guest session.' },
      { status: 500 }
    );
  }
}

