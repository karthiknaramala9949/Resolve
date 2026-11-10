import { NextRequest, NextResponse } from 'next/server';
import { generateRandomToken } from '@/lib/server/auth/crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const returnTo = searchParams.get('returnTo') || '/app/overview';

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get('origin') ||
      'http://localhost:3000';

    const redirectUri = `${origin}/api/auth/google/callback`;

    // Generate random CSRF state token
    const stateToken = generateRandomToken(24);
    const statePayload = Buffer.from(
      JSON.stringify({ state: stateToken, returnTo })
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
      googleAuthEndpoint.searchParams.set('access_type', 'offline');
      googleAuthEndpoint.searchParams.set('prompt', 'select_account');
      authUrl = googleAuthEndpoint.toString();
    } else {
      // Development fallback: interactive local Google authentication simulation
      // allows reviewing and testing OAuth account creation and account linking without GCP keys
      const devEndpoint = new URL(`${origin}/auth/callback`);
      devEndpoint.searchParams.set('mock', 'google');
      devEndpoint.searchParams.set('state', statePayload);
      authUrl = devEndpoint.toString();
    }

    const response = NextResponse.json({
      url: authUrl,
      isConfigured,
    });

    // Store state in HTTP-only cookie for CSRF verification
    response.cookies.set('oauth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
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
