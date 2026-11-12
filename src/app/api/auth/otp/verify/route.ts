import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { rateLimiter, RATE_LIMITS, applyRateLimitHeaders } from '@/lib/server/auth/rateLimit';
import { getCurrentUser } from '@/lib/server/auth/session';
import { validateCsrf } from '@/lib/server/auth/csrf';

const VerifyOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid phone number is required').optional(),
  otp: z.string().length(6, 'Verification code must be exactly 6 digits'),
  type: z.enum(['phone_otp', 'password_reset_phone']).default('phone_otp'),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrf(req);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json().catch(() => ({}));
    const parse = VerifyOtpSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit verification code.' },
        { status: 400 }
      );
    }

    let phone = parse.data.phoneNumber;
    const { otp, type } = parse.data;

    if (!phone) {
      const auth = await getCurrentUser();
      if (auth?.user.phoneNumber) {
        phone = auth.user.phoneNumber;
      }
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required to verify code.' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    // Check rate limit for verification attempts
    const rlKey = `otp-verify:${cleanPhone}:${ip}`;
    const rlCheck = await rateLimiter.check(
      rlKey,
      RATE_LIMITS.OTP_VERIFY.max,
      RATE_LIMITS.OTP_VERIFY.windowMs
    );
    if (!rlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many invalid attempts. Please wait ${rlCheck.retryAfterSec} seconds or request a new code.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, RATE_LIMITS.OTP_VERIFY.max, rlCheck.remaining, rlCheck.resetAt, rlCheck.retryAfterSec);
      return res;
    }

    const tokenRecord = await authStore.findToken(cleanPhone, otp, type);
    if (!tokenRecord) {
      // Find active token and increment attempts
      const activeToken = await authStore.findActiveTokenByIdentifier(cleanPhone, type);
      if (activeToken) {
        const attempts = await authStore.incrementTokenAttempts(activeToken.id);
        if (attempts >= 5) {
          return NextResponse.json(
            { error: 'Too many invalid attempts. This verification code has been revoked. Please request a new one.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: `Invalid verification code. ${5 - attempts} attempt(s) remaining.` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please check and try again.' },
        { status: 400 }
      );
    }

    // Token is valid! Reset rate limit
    await rateLimiter.reset(rlKey);

    // Consume the token
    await authStore.consumeToken(tokenRecord.id);

    // If this was phone verification, update user record
    const user = await authStore.findUserByPhone(cleanPhone);
    let updatedUser = null;

    if (user && type === 'phone_otp') {
      const now = new Date().toISOString();
      updatedUser = await authStore.updateUser(user.id, {
        phoneVerified: true,
        phoneVerifiedAt: now,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Phone number verified successfully.',
      user: updatedUser ? authStore.toUserProfile(updatedUser) : null,
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    applyRateLimitHeaders(response.headers, RATE_LIMITS.OTP_VERIFY.max, rlCheck.remaining, rlCheck.resetAt);
    return response;
  } catch (err) {
    console.error('[Verify OTP Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while verifying the code.' },
      { status: 500 }
    );
  }
}

