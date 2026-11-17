import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { hashPassword } from '@/lib/server/auth/crypto';
import { setSessionCookie } from '@/lib/server/auth/session';
import { syncSessionToConvex, getServerConvexClient } from '@/lib/server/convex/convexClient';
import { getClientIp } from '@/lib/server/auth/ip';
import { getConvexServerSecret, checkGateError } from '@/lib/server/auth/serverSecret';
import { api } from '../../../../../convex/_generated/api';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { rateLimiter, applyRateLimitHeaders } from '@/lib/server/auth/rateLimit';

const ResetPasswordSchema = z.object({
  identifier: z.string().min(3, 'Email or phone number is required'),
  token: z.string().min(6, 'Reset token or code is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  rememberMe: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const csrfCheck = validateCsrf(req);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const clientIpInfo = getClientIp(req);
    const ip = clientIpInfo.ip;
    const body = await req.json().catch(() => ({}));
    const parse = ResetPasswordSchema.safeParse(body);

    if (!parse.success) {
      const msg = parse.error.issues[0]?.message || 'Invalid input data.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { identifier, token, newPassword } = parse.data;
    const cleanId = identifier.trim().toLowerCase();

    // 1. Per-account ceiling independent of IP (5 attempts per 15 min)
    const accountRlKey = `reset-pw:account:${cleanId}`;
    const accountRlCheck = await rateLimiter.check(accountRlKey, 5, 15 * 60 * 1000);
    if (!accountRlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many password reset attempts for this account. Please wait ${accountRlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, 5, accountRlCheck.remaining, accountRlCheck.resetAt, accountRlCheck.retryAfterSec);
      return res;
    }

    // 2. Enforce rate limiting against brute force attempts (account + IP)
    const rlKey = `reset-pw:${cleanId}:${ip}`;
    const rlCheck = await rateLimiter.check(rlKey, 5, 15 * 60 * 1000);
    if (!rlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many password reset attempts. Please wait ${rlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, 5, rlCheck.remaining, rlCheck.resetAt, rlCheck.retryAfterSec);
      return res;
    }

    // Authoritative Convex resetPassword invocation
    const client = getServerConvexClient();
    if (client) {
      try {
        const serverSecret = getConvexServerSecret();
        const convexRes = await client.mutation(api.auth.resetPassword, {
          identifier: cleanId,
          token: token.trim(),
          newPassword,
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
            { error: convexRes.error || 'Password reset failed.' },
            { status: convexRes.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 400 }
          );
        }
        if (convexRes?.ok === true) {
          return NextResponse.json({
            success: true,
            message: convexRes.message || 'Password has been reset successfully.',
          });
        }
      } catch (err: any) {
        console.warn('[Convex resetPassword deferred]:', err?.message || err);
      }
    }

    const isEmail = cleanId.includes('@');
    const tokenType = isEmail ? 'password_reset_email' : 'password_reset_phone';

    // Verify token
    const tokenRecord = await authStore.findToken(
      isEmail ? cleanId : identifier.trim(),
      token.trim(),
      tokenType
    );

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset token/code. Please request a new one.' },
        { status: 400 }
      );
    }

    // Find the user
    let user = null;
    if (isEmail) {
      user = await authStore.findUserByEmail(cleanId);
    } else {
      user = await authStore.findUserByPhone(identifier);
    }

    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Hash new password
    const { hash, salt } = hashPassword(newPassword);

    // Update user password
    const updatedUser = await authStore.updateUser(user.id, {
      passwordHash: hash,
      passwordSalt: salt,
    });

    // Invalidate token
    await authStore.consumeToken(tokenRecord.id);

    // Security requirement: Invalidate previous sessions to prevent session hijacking
    await authStore.deleteUserSessions(user.id);

    const isRemembered = parse.data.rememberMe !== false;

    // Issue a fresh session
    const session = await authStore.createSession(user.id, {
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: ip,
    }, isRemembered);

    // Synchronize session with Convex cloud database
    await syncSessionToConvex(
      updatedUser || user,
      session.token,
      req.headers.get('user-agent') || undefined,
      ip,
      isRemembered
    );

    const response = NextResponse.json({
      success: true,
      message: 'Password has been successfully updated. You are now logged in.',
      user: updatedUser ? authStore.toUserProfile(updatedUser) : null,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');

    setSessionCookie(response, session.token, isRemembered);
    return response;
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}


