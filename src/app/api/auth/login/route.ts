import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { verifyPassword } from '@/lib/server/auth/crypto';
import { setSessionCookie } from '@/lib/server/auth/session';
import { rateLimiter, RATE_LIMITS } from '@/lib/server/auth/rateLimit';

const LoginSchema = z.object({
  identifier: z.string().min(3, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json();

    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email or phone number and password.' },
        { status: 400 }
      );
    }

    const { identifier, password } = parseResult.data;
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

    // Try finding user by email first, then by phone
    let user = await authStore.findUserByEmail(cleanId);
    if (!user) {
      user = await authStore.findUserByPhone(identifier);
    }

    // If user not found, or user has no password set (e.g. Google-only sign-in)
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return NextResponse.json(
        { error: 'Invalid email, phone number, or password.' },
        { status: 401 }
      );
    }

    // Verify password with constant-time comparison
    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email, phone number, or password.' },
        { status: 401 }
      );
    }

    // Successful login - reset rate limit
    rateLimiter.reset(rlKey);

    // Create session and set cookie
    const session = await authStore.createSession(user.id, {
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      user: authStore.toUserProfile(user),
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

