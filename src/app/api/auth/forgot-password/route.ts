import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { generateRandomToken, generateNumericOtp } from '@/lib/server/auth/crypto';
import { rateLimiter, RATE_LIMITS } from '@/lib/server/auth/rateLimit';

const ForgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Email or phone number is required'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json().catch(() => ({}));
    const parse = ForgotPasswordSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email address or phone number.' },
        { status: 400 }
      );
    }

    const { identifier } = parse.data;
    const cleanId = identifier.trim().toLowerCase();

    // Rate limit
    const rlKey = `forgot:${cleanId}:${ip}`;
    const rlCheck = rateLimiter.check(
      rlKey,
      RATE_LIMITS.PASSWORD_RESET.max,
      RATE_LIMITS.PASSWORD_RESET.windowMs
    );
    if (!rlCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many password reset requests. Please wait ${rlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    const isEmail = cleanId.includes('@');
    let user = null;
    let type: 'email' | 'phone' = 'email';
    let debugToken: string | undefined;
    let debugOtp: string | undefined;

    if (isEmail) {
      user = await authStore.findUserByEmail(cleanId);
      type = 'email';
      if (user) {
        const token = generateRandomToken(32);
        await authStore.createToken(user.email!, token, 'password_reset_email', 60); // 1 hour
        debugToken = token;
        console.log(
          `[RESOLVE-ONE AUTH] Password reset link for ${user.email}: /auth/reset-password?token=${token}&email=${encodeURIComponent(user.email!)}`
        );
      }
    } else {
      user = await authStore.findUserByPhone(identifier);
      type = 'phone';
      if (user && user.phoneNumber) {
        const otp = generateNumericOtp(6);
        await authStore.createToken(user.phoneNumber, otp, 'password_reset_phone', 10); // 10 minutes
        debugOtp = otp;
        console.log(`[RESOLVE-ONE AUTH] 📲 Password reset OTP for ${user.phoneNumber}: ${otp}`);
      }
    }

    // Always return generic response to prevent account enumeration
    return NextResponse.json({
      success: true,
      message:
        type === 'email'
          ? 'If an account exists with that email address, password reset instructions have been sent.'
          : 'If an account exists with that phone number, a 6-digit recovery code has been sent.',
      type,
      debugToken,
      debugOtp,
    });
  } catch (err) {
    console.error('[Forgot Password Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

