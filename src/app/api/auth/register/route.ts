import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { hashPassword, generateRandomToken, generateNumericOtp } from '@/lib/server/auth/crypto';
import { setSessionCookie } from '@/lib/server/auth/session';
import { rateLimiter } from '@/lib/server/auth/rateLimit';
import { getServerConvexClient } from '@/lib/server/convex/convexClient';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { api } from '../../../../../convex/_generated/api';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').optional().nullable(),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number').optional().nullable(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrf(req);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json();

    const parseResult = RegisterSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Invalid input data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const { name, email, phoneNumber, password } = parseResult.data;

    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: 'Either email address or phone number is required to register' },
        { status: 400 }
      );
    }

    // Check rate limit on IP
    const rlCheck = await rateLimiter.check(`reg:${ip}`, 10, 60 * 60 * 1000); // 10 registrations per hour
    if (!rlCheck.allowed) {
      const errRes = NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
      rateLimiter.applyRateLimitHeaders(errRes, rlCheck);
      errRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return errRes;
    }

    // 1. Authoritative Convex Registration
    const client = getServerConvexClient();
    if (client) {
      try {
        const convexRes = await client.mutation(api.auth.register, {
          name,
          email: email || null,
          phoneNumber: phoneNumber || null,
          password,
          userAgent: req.headers.get('user-agent') || undefined,
          ipAddress: ip,
        });

        if (convexRes?.sessionToken && convexRes?.user) {
          const response = NextResponse.json(
            {
              success: true,
              user: convexRes.user,
              sessionToken: convexRes.sessionToken,
              verificationRequired: convexRes.verificationRequired,
              message: 'Account created successfully.',
            },
            { status: 201 }
          );
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          response.headers.set('Pragma', 'no-cache');
          rateLimiter.applyRateLimitHeaders(response, rlCheck);
          setSessionCookie(response, convexRes.sessionToken);
          return response;
        }
      } catch (err: any) {
        if (err?.message?.includes('already exists')) {
          return NextResponse.json({ error: err.message }, { status: 409 });
        }
      }
    }

    // 2. In-memory fallback for local mock / unit testing
    if (email) {
      const existingEmail = await authStore.findUserByEmail(email);
      if (existingEmail) {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please sign in.' },
          { status: 409 }
        );
      }
    }

    if (phoneNumber) {
      const existingPhone = await authStore.findUserByPhone(phoneNumber);
      if (existingPhone) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists. Please sign in.' },
          { status: 409 }
        );
      }
    }

    // Hash password with Argon2id for local storage
    const { hash, salt } = hashPassword(password, undefined, 'argon2id');
    const providers = email ? (phoneNumber ? ['email', 'phone'] as const : ['email'] as const) : ['phone'] as const;

    // Create user
    const user = await authStore.createUser({
      name,
      email: email || null,
      phoneNumber: phoneNumber || null,
      passwordHash: hash,
      passwordSalt: salt,
      providers: [...providers],
      emailVerified: false,
      phoneVerified: false,
    });

    // Generate verification tokens
    if (email) {
      const emailToken = generateRandomToken(32);
      await authStore.createToken(email, emailToken, 'email_verification', 24 * 60);
    }

    if (phoneNumber) {
      const otp = generateNumericOtp(6);
      await authStore.createToken(phoneNumber, otp, 'phone_otp', 10);
    }

    const session = await authStore.createSession(user.id, {
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: ip,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: authStore.toUserProfile(user),
        sessionToken: session.token,
        verificationRequired: phoneNumber ? 'phone' : 'email',
        message: 'Account created successfully.',
      },
      { status: 201 }
    );

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    rateLimiter.applyRateLimitHeaders(response, rlCheck);
    setSessionCookie(response, session.token);
    return response;
  } catch (err: any) {
    console.error('[Register API Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}

