import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { generateNumericOtp } from '@/lib/server/auth/crypto';
import { rateLimiter, RATE_LIMITS, applyRateLimitHeaders } from '@/lib/server/auth/rateLimit';
import { getCurrentUser } from '@/lib/server/auth/session';
import { validateCsrf } from '@/lib/server/auth/csrf';

const SendOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid phone number is required').optional(),
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
    const parse = SendOtpSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Valid phone number is required.' },
        { status: 400 }
      );
    }

    let phone = parse.data.phoneNumber;
    const type = parse.data.type;

    if (!phone) {
      const auth = await getCurrentUser();
      if (auth?.user.phoneNumber) {
        phone = auth.user.phoneNumber;
      }
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required to send verification code.' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanPhone = phone.trim();

    // Check rate limits: identifier + IP
    const rlKey = `otp-send:${cleanPhone}:${ip}`;
    const rlCheck = await rateLimiter.check(
      rlKey,
      RATE_LIMITS.OTP_SEND.max,
      RATE_LIMITS.OTP_SEND.windowMs
    );
    if (!rlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many OTP requests. Please wait ${rlCheck.retryAfterSec} seconds before requesting a new code.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, RATE_LIMITS.OTP_SEND.max, rlCheck.remaining, rlCheck.resetAt, rlCheck.retryAfterSec);
      return res;
    }

    // Generate 6-digit numeric OTP
    const otp = generateNumericOtp(6);
    await authStore.createToken(cleanPhone, otp, type, 10); // 10 minutes

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[RESOLVE-ONE AUTH] 📲 SMS OTP for ${cleanPhone} (${type}): ${otp} (expires in 10 minutes)`
      );
    }

    const response = NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanPhone}.`,
      expiresInMinutes: 10,
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    applyRateLimitHeaders(response.headers, RATE_LIMITS.OTP_SEND.max, rlCheck.remaining, rlCheck.resetAt);
    return response;
  } catch (err) {
    console.error('[Send OTP Error]:', err);
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}

