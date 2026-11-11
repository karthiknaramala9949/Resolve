import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { verifyPassword } from '@/lib/server/auth/crypto';
import { setSessionCookie } from '@/lib/server/auth/session';
import { rateLimiter, RATE_LIMITS } from '@/lib/server/auth/rateLimit';
import { getServerConvexClient } from '@/lib/server/convex/convexClient';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { api } from '../../../../../convex/_generated/api';

const LoginSchema = z.object({
  identifier: z.string().min(3, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrf(req);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json();

    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email or phone number and password.' },
        { status: 400 }
      );
    }

    const { identifier, password, rememberMe } = parseResult.data;
    const cleanId = identifier.trim().toLowerCase();

    // Check rate limit for this identifier and IP
    const rlKey = `login:${cleanId}:${ip}`;
    const rlCheck = rateLimiter.check(rlKey, RATE_LIMITS.LOGIN.max, RATE_LIMITS.LOGIN.windowMs);
    if (!rlCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many unsuccessful sign-in attempts. Please try again in ${rlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    // 1. Authoritative Convex Cloud Authentication
    const client = getServerConvexClient();
    if (client) {
      try {
        const convexRes = await client.mutation(api.auth.login, {
          identifier: cleanId,
          password,
          rememberMe: Boolean(rememberMe),
          userAgent: req.headers.get('user-agent') || undefined,
          ipAddress: ip,
        });

        if (convexRes?.sessionToken && convexRes?.user) {
          rateLimiter.reset(rlKey);
          const response = NextResponse.json({
            success: true,
            user: convexRes.user,
            sessionToken: convexRes.sessionToken,
            message: 'Signed in successfully.',
          });
          setSessionCookie(response, convexRes.sessionToken);
          return response;
        }
      } catch (err: any) {
        if (
          err?.message?.includes('Invalid email') ||
          err?.message?.includes('password')
        ) {
          return NextResponse.json(
            { error: 'Invalid email, phone number, or password.' },
            { status: 401 }
          );
        }
      }
    }

    // 2. In-memory fallback for local mock / unit testing
    let user = await authStore.findUserByEmail(cleanId);
    if (!user) {
      user = await authStore.findUserByPhone(identifier);
    }

    if (!user || !user.passwordHash || !user.passwordSalt) {
      return NextResponse.json(
        { error: 'Invalid email, phone number, or password.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email, phone number, or password.' },
        { status: 401 }
      );
    }

    rateLimiter.reset(rlKey);

    const session = await authStore.createSession(user.id, {
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      user: authStore.toUserProfile(user),
      sessionToken: session.token,
      message: 'Signed in successfully.',
    });

    setSessionCookie(response, session.token);
    return response;
  } catch (err) {
    console.error('[Login API Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while signing in. Please try again.' },
      { status: 500 }
    );
  }
}

