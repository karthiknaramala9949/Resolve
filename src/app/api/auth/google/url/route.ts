import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { generateRandomToken } from '@/lib/server/auth/crypto';
import { sanitizeRedirectUrl, resolveRequestOrigin } from '@/lib/server/auth/redirect';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const returnTo = searchParams.get('returnTo');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const origin = resolveRequestOrigin(req);

    const safeReturnTo = sanitizeRedirectUrl(returnTo, origin, '/app/overview');
    const redirectPath = process.env.GOOGLE_REDIRECT_PATH || '/api/auth/google/callback';
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${origin}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`;

    // Generate random CSRF state token and PKCE code_verifier
    const stateToken = generateRandomToken(24);
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const nonce = generateRandomToken(24);

    const statePayload = Buffer.from(
      JSON.stringify({ state: stateToken, returnTo: safeReturnTo })
    ).toString('base64url');

    let authUrl: string;
    const isConfigured = Boolean(clientId && clientId.trim() !== '');

    if (isConfigured) {
      const googleAuthEndpoint = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthEndpoint.searchParams.set('client_id', clientId!);
      googleAuthEndpoint.searchParams.set('redirect_uri', redirectUri);
      googleAuthEndpoint.searchParams.set('response_type', 'code');
      googleAuthEndpoint.searchParams.set('scope', 'openid email profile');
      googleAuthEndpoint.searchParams.set('state', statePayload);
      googleAuthEndpoint.searchParams.set('code_challenge', codeChallenge);
      googleAuthEndpoint.searchParams.set('code_challenge_method', 'S256');
      googleAuthEndpoint.searchParams.set('nonce', nonce);
      googleAuthEndpoint.searchParams.set('access_type', 'offline');
      googleAuthEndpoint.searchParams.set('prompt', 'select_account');
      authUrl = googleAuthEndpoint.toString();
    } else {
      // Development fallback: interactive local Google authentication simulation
      const devEndpoint = new URL(`${origin}/auth/callback`);
      devEndpoint.searchParams.set('mock', 'google');
      devEndpoint.searchParams.set('state', statePayload);
      authUrl = devEndpoint.toString();
    }

    const response = NextResponse.json({
      url: authUrl,
      isConfigured,
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');

    const isProd = process.env.NODE_ENV === 'production';

    // Store state and PKCE verifier in HTTP-only cookies
    response.cookies.set('oauth_state', stateToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    });

    response.cookies.set('oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    response.cookies.set('oauth_nonce', nonce, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    response.cookies.set('oauth_redirect_uri', redirectUri, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    return response;
  } catch (err) {
    console.error('[Google URL Error]:', err);
    return NextResponse.json(
      { error: 'Failed to generate Google Sign-In URL.' },
      { status: 500 }
    );
  }
}
