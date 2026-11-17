import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { rateLimiter, RATE_LIMITS, applyRateLimitHeaders } from '@/lib/server/auth/rateLimit';
import { getCurrentUser } from '@/lib/server/auth/session';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { getServerConvexClient } from '@/lib/server/convex/convexClient';
import { getClientIp } from '@/lib/server/auth/ip';
import { getConvexServerSecret, checkGateError } from '@/lib/server/auth/serverSecret';
import { api } from '../../../../../../convex/_generated/api';

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

    const clientIpInfo = getClientIp(req);
    const ip = clientIpInfo.ip;
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

    // 1. Per-account ceiling independent of IP: 10 attempts per 15 min
    const accountRlKey = `otp-verify:account:${cleanPhone}`;
    const accountRlCheck = await rateLimiter.check(
      accountRlKey,
      10,
      RATE_LIMITS.OTP_VERIFY.windowMs
    );
    if (!accountRlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many invalid attempts for this phone number. Please wait ${accountRlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, 10, accountRlCheck.remaining, accountRlCheck.resetAt, accountRlCheck.retryAfterSec);
      return res;
    }

    // 2. Check rate limit for verification attempts (phone + IP)
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

    // Authoritative Convex verifyOtp invocation
    const client = getServerConvexClient();
    if (client) {
      try {
        const serverSecret = getConvexServerSecret();
        const convexRes = await client.mutation(api.auth.verifyOtp, {
          phoneNumber: cleanPhone,
          otp,
          type,
          ipAddress: ip,
          serverSecret,
        });

        // Fail-safe: map gate rejections to HTTP 500
        const gateErrResponse = checkGateError(convexRes);
        if (gateErrResponse) {
          return gateErrResponse;
        }

        if (convexRes?.ok === false) {
          return NextResponse.json(
            { error: convexRes.error || 'Verification failed.' },
            { status: convexRes.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 400 }
          );
        }
        if (convexRes?.ok === true) {
          return NextResponse.json({
            success: true,
            message: convexRes.message || 'Phone number verified successfully.',
            user: convexRes.user,
          });
        }
      } catch (err: any) {
        console.warn('[Convex verifyOtp deferred]:', err?.message || err);
      }
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

