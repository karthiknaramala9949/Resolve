import { NextRequest, NextResponse } from 'next/server';
import { authStore } from '@/lib/server/db/authStore';
import { setSessionCookie } from '@/lib/server/auth/session';

export const dynamic = 'force-dynamic';

interface GoogleUserInfo {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
}

export async function GET(req: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    req.headers.get('origin') ||
    'http://localhost:3000';

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const errorParam = searchParams.get('error');

    // Handle OAuth cancellation or user rejection
    if (errorParam) {
      console.warn('[Google OAuth Callback] Error from Google:', errorParam);
      return NextResponse.redirect(
        `${origin}/auth/signin?error=oauth_cancelled`
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${origin}/auth/signin?error=invalid_oauth_response`
      );
    }

    // Verify state token from cookie
    const storedState = req.cookies.get('oauth_state')?.value;
    let decodedState: { state: string; returnTo?: string };
    try {
      decodedState = JSON.parse(
        Buffer.from(stateParam, 'base64url').toString('utf-8')
      );
    } catch {
      return NextResponse.redirect(
        `${origin}/auth/signin?error=invalid_oauth_state`
      );
    }

    if (!storedState || storedState !== decodedState.state) {
      return NextResponse.redirect(
        `${origin}/auth/signin?error=csrf_validation_failed`
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/google/callback`;

    let userInfo: GoogleUserInfo;

    if (clientId && clientSecret) {
      // Exchange code with Google
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error('[Google Token Exchange Error]:', errorText);
        return NextResponse.redirect(
          `${origin}/auth/signin?error=token_exchange_failed`
        );
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Fetch user profile from Google UserInfo endpoint
      const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userRes.ok) {
        return NextResponse.redirect(
          `${origin}/auth/signin?error=user_info_fetch_failed`
        );
      }

      userInfo = await userRes.json();
    } else {
      // Mock exchange fallback for local testing
      return NextResponse.redirect(
        `${origin}/auth/signin?error=oauth_not_configured`
      );
    }

    if (!userInfo.email) {
      return NextResponse.redirect(
        `${origin}/auth/signin?error=email_not_provided`
      );
    }

    const email = userInfo.email.toLowerCase().trim();
    const googleId = userInfo.sub;
    const name = userInfo.name || email.split('@')[0];
    const image = userInfo.picture || null;

    // 1. Check if user already exists with this Google ID
    let user = await authStore.findUserByGoogleId(googleId);

    // 2. If not, check if user exists with the same verified email address
    if (!user) {
      const existingEmailUser = await authStore.findUserByEmail(email);
      if (existingEmailUser) {
        // Link Google provider to existing account without creating duplicate account
        user = await authStore.linkProvider(existingEmailUser.id, 'google', {
          googleId,
          image: existingEmailUser.image || image,
          name: existingEmailUser.name || name,
        });
      }
    }

    // 3. If still not found, create a new user with Google as provider
    if (!user) {
      user = await authStore.createUser({
        name,
        email,
        phoneNumber: null,
        image,
        googleId,
        providers: ['google'],
        emailVerified: true, // Google emails are pre-verified
        phoneVerified: false,
      });
    }

    // Create session
    const session = await authStore.createSession(user.id, {
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const targetUrl =
      !user.phoneNumber
        ? `${origin}/auth/setup?welcome=google`
        : decodedState.returnTo || `${origin}/app/overview`;

    const response = NextResponse.redirect(targetUrl);
    setSessionCookie(response, session.token);

    // Clear state cookie
    response.cookies.delete('oauth_state');
    return response;
  } catch (err) {
    console.error('[Google Callback Exception]:', err);
    return NextResponse.redirect(
      `${origin}/auth/signin?error=oauth_internal_error`
    );
  }
}

// POST endpoint for programmatic / simulation callback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, picture, googleId, returnTo } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const sub = googleId || `google-sub-${Date.now()}`;
    const displayName = name || cleanEmail.split('@')[0];

    // Find by googleId or email
    let user = await authStore.findUserByGoogleId(sub);
    if (!user) {
      const existingEmailUser = await authStore.findUserByEmail(cleanEmail);
      if (existingEmailUser) {
        user = await authStore.linkProvider(existingEmailUser.id, 'google', {
          googleId: sub,
          image: existingEmailUser.image || picture,
          name: existingEmailUser.name || displayName,
        });
      }
    }

    if (!user) {
      user = await authStore.createUser({
        name: displayName,
        email: cleanEmail,
        phoneNumber: null,
        image: picture || null,
        googleId: sub,
        providers: ['google'],
        emailVerified: true,
        phoneVerified: false,
      });
    }

    const session = await authStore.createSession(user.id, {
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const response = NextResponse.json({
      success: true,
      user: authStore.toUserProfile(user),
      redirectTo: !user.phoneNumber ? '/auth/setup?welcome=google' : returnTo || '/app/overview',
    });

    setSessionCookie(response, session.token);
    return response;
  } catch (err) {
    console.error('[Google Mock Auth Error]:', err);
    return NextResponse.json(
      { error: 'Failed to process Google authentication.' },
      { status: 500 }
    );
  }
}
