import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { hashPassword, generateRandomToken, generateNumericOtp } from '@/lib/server/auth/crypto';
import { setSessionCookie } from '@/lib/server/auth/session';
import { rateLimiter, RATE_LIMITS } from '@/lib/server/auth/rateLimit';

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
    const rlCheck = rateLimiter.check(`reg:${ip}`, 10, 60 * 60 * 1000); // 10 registrations per hour
    if (!rlCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user already exists
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

    // Hash password
    const { hash, salt } = hashPassword(password);
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
    let debugVerificationToken: string | undefined;
    let debugOtp: string | undefined;

    if (email) {
      const emailToken = generateRandomToken(32);
      await authStore.createToken(email, emailToken, 'email_verification', 24 * 60); // 24 hours
      debugVerificationToken = emailToken;
      console.log(`[RESOLVE-ONE AUTH] Email verification link generated for ${email}: /auth/verify-email?token=${emailToken}`);
    }

    if (phoneNumber) {
      const otp = generateNumericOtp(6);
      await authStore.createToken(phoneNumber, otp, 'phone_otp', 10); // 10 minutes
      debugOtp = otp;
      console.log(`[RESOLVE-ONE AUTH] Phone OTP generated for ${phoneNumber}: ${otp}`);
    }

    // Create session and set cookie
    const session = await authStore.createSession(user.id, {
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: ip,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: authStore.toUserProfile(user),
        verificationRequired: phoneNumber ? 'phone' : 'email',
        debugVerificationToken,
        debugOtp,
        message: 'Account created successfully.',
      },
      { status: 201 }
    );

    setSessionCookie(response, session.token);
    return response;
  } catch (err) {
    console.error('[Register API Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}

