import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { generateNumericOtp } from '@/lib/server/auth/crypto';
import { rateLimiter, RATE_LIMITS, applyRateLimitHeaders } from '@/lib/server/auth/rateLimit';
import { getCurrentUser } from '@/lib/server/auth/session';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { getServerConvexClient } from '@/lib/server/convex/convexClient';
import { getClientIp } from '@/lib/server/auth/ip';
import { getConvexServerSecret, checkGateError } from '@/lib/server/auth/serverSecret';
import { api } from '../../../../../../convex/_generated/api';

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

    const clientIpInfo = getClientIp(req);
    const ip = clientIpInfo.ip;
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

    // 1. Per-account ceiling independent of IP (5 OTP sends per 10 min)
    const accountRlKey = `otp-send:account:${cleanPhone}`;
    const accountRlCheck = await rateLimiter.check(
      accountRlKey,
      5,
      RATE_LIMITS.OTP_SEND.windowMs
    );
    if (!accountRlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many OTP requests for this phone number. Please wait ${accountRlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, 5, accountRlCheck.remaining, accountRlCheck.resetAt, accountRlCheck.retryAfterSec);
      return res;
    }

    // 2. Strict identifier + IP rate limit (3 OTP sends per 10 min)
    const rlKey = `otp-send:${cleanPhone}:${ip}`;
    const rlCheck = await rateLimiter.check(
      rlKey,
      RATE_LIMITS.OTP_SEND.max,
      RATE_LIMITS.OTP_SEND.windowMs
    );
    if (!rlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many OTP requests for this phone number. Please wait ${rlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, RATE_LIMITS.OTP_SEND.max, rlCheck.remaining, rlCheck.resetAt, rlCheck.retryAfterSec);
      return res;
    }

    // 2. Looser per-IP rate limit across all numbers (15 OTP sends per 15 min)
    const ipRlKey = `otp-send:ip:${ip}`;
    const ipRlCheck = await rateLimiter.check(
      ipRlKey,
      15,
      RATE_LIMITS.OTP_SEND.windowMs
    );
    if (!ipRlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many OTP requests from this network. Please wait ${ipRlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, 15, ipRlCheck.remaining, ipRlCheck.resetAt, ipRlCheck.retryAfterSec);
      return res;
    }

    // Authoritative Convex sendOtp invocation
    const client = getServerConvexClient();
    if (client) {
      try {
        const serverSecret = getConvexServerSecret();
        const convexRes = await client.mutation(api.auth.sendOtp, {
          phoneNumber: cleanPhone,
          type,
          ipAddress: ip,
          serverSecret,
        });

        // Fail-safe: map gate rejections to HTTP 500
        const gateErrResponse = checkGateError(convexRes);
        if (gateErrResponse) {
          return gateErrResponse;
        }

        if (convexRes?.ok === false && convexRes.code === 'RATE_LIMIT_EXCEEDED') {
          return NextResponse.json({ error: convexRes.error }, { status: 429 });
        }
      } catch (err) {
        console.warn('[Convex sendOtp deferred]:', err);
      }
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

