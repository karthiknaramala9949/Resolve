import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { generateRandomToken, generateNumericOtp } from '@/lib/server/auth/crypto';
import { rateLimiter, RATE_LIMITS } from '@/lib/server/auth/rateLimit';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { verifyTurnstileToken } from '@/lib/server/security/turnstile';
import { getServerConvexClient } from '@/lib/server/convex/convexClient';
import { getClientIp } from '@/lib/server/auth/ip';
import { getConvexServerSecret, checkGateError } from '@/lib/server/auth/serverSecret';
import { api } from '../../../../../convex/_generated/api';

const ForgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Email or phone number is required'),
  turnstileToken: z.string().optional(),
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
    const parse = ForgotPasswordSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email address or phone number.' },
        { status: 400 }
      );
    }

    // Verify Cloudflare Turnstile CAPTCHA token
    const turnstileCheck = await verifyTurnstileToken(parse.data.turnstileToken, ip);
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || 'Security challenge failed. Please complete the CAPTCHA.' },
        { status: 400 }
      );
    }

    const { identifier } = parse.data;
    const cleanId = identifier.trim().toLowerCase();

    // 1. Per-account ceiling independent of IP (5 attempts per 15 min)
    const accountRlKey = `forgot:account:${cleanId}`;
    const accountRlCheck = rateLimiter.check(
      accountRlKey,
      5,
      RATE_LIMITS.PASSWORD_RESET.windowMs
    );
    if (!accountRlCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many password reset requests for this account. Please wait ${accountRlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    // 2. Strict identifier + IP rate limit (3 attempts per 15 min)
    const rlKey = `forgot:${cleanId}:${ip}`;
    const rlCheck = rateLimiter.check(
      rlKey,
      RATE_LIMITS.PASSWORD_RESET.max,
      RATE_LIMITS.PASSWORD_RESET.windowMs
    );
    if (!rlCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many password reset requests for this account. Please wait ${rlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    // 2. Looser per-IP rate limit across all accounts (15 attempts per 15 min)
    const ipRlKey = `forgot:ip:${ip}`;
    const ipRlCheck = rateLimiter.check(
      ipRlKey,
      15,
      RATE_LIMITS.PASSWORD_RESET.windowMs
    );
    if (!ipRlCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many password reset requests from this network. Please wait ${ipRlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    // Authoritative Convex forgotPassword invocation
    const client = getServerConvexClient();
    if (client) {
      try {
        const serverSecret = getConvexServerSecret();
        const convexRes = await client.mutation(api.auth.forgotPassword, {
          identifier: cleanId,
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
        console.warn('[Convex forgotPassword deferred]:', err);
      }
    }

    const isEmail = cleanId.includes('@');

    if (isEmail) {
      const user = await authStore.findUserByEmail(cleanId);
      if (user) {
        const token = generateRandomToken(32);
        await authStore.createToken(user.email!, token, 'password_reset_email', 60); // 1 hour
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[RESOLVE-ONE AUTH] Password reset link for ${user.email}: /auth/reset-password?token=${token}&email=${encodeURIComponent(user.email!)}`
          );
        }
      }
    } else {
      const user = await authStore.findUserByPhone(identifier);
      if (user && user.phoneNumber) {
        const otp = generateNumericOtp(6);
        await authStore.createToken(user.phoneNumber, otp, 'password_reset_phone', 10); // 10 minutes
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RESOLVE-ONE AUTH] 📲 Password reset OTP for ${user.phoneNumber}: ${otp}`);
        }
      }
    }

    // Always return generic response to prevent account enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists, we have sent instructions.',
    });
  } catch (err) {
    console.error('[Forgot Password Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

