import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { verifyPassword } from '@/lib/server/auth/crypto';
import { setSessionCookie, getSessionTokenFromCookies } from '@/lib/server/auth/session';
import { rateLimiter, RATE_LIMITS, applyRateLimitHeaders } from '@/lib/server/auth/rateLimit';
import { getServerConvexClient, deleteSessionFromConvex } from '@/lib/server/convex/convexClient';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { verifyTurnstileToken } from '@/lib/server/security/turnstile';
import { getClientIp } from '@/lib/server/auth/ip';
import { getConvexServerSecret, checkGateError } from '@/lib/server/auth/serverSecret';
import { api } from '../../../../../convex/_generated/api';

const LoginSchema = z.object({
  identifier: z.string().min(3, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
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
    const body = await req.json();

    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email or phone number and password.' },
        { status: 400 }
      );
    }

    // Verify Cloudflare Turnstile CAPTCHA token
    const turnstileCheck = await verifyTurnstileToken(parseResult.data.turnstileToken, ip);
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || 'Security challenge failed. Please complete the CAPTCHA.' },
        { status: 400 }
      );
    }

    const { identifier, password, rememberMe } = parseResult.data;
    const cleanId = identifier.trim().toLowerCase();

    // 1. Per-account ceiling independent of IP (10 attempts per 15 min; stricter 5 attempts if untrusted IP)
    const accountLimitCeiling = clientIpInfo.isTrusted ? 10 : 5;
    const accountRlKey = `login:account:${cleanId}`;
    const accountRlCheck = await rateLimiter.check(accountRlKey, accountLimitCeiling, RATE_LIMITS.LOGIN.windowMs);
    if (!accountRlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many sign-in attempts for this account. Please try again in ${accountRlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, accountLimitCeiling, accountRlCheck.remaining, accountRlCheck.resetAt, accountRlCheck.retryAfterSec);
      return res;
    }

    // 2. Strict identifier + IP rate limit (5 attempts per 15 min)
    const rlKey = `login:${cleanId}:${ip}`;
    const rlCheck = await rateLimiter.check(rlKey, RATE_LIMITS.LOGIN.max, RATE_LIMITS.LOGIN.windowMs);
    if (!rlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many unsuccessful sign-in attempts. Please try again in ${rlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, RATE_LIMITS.LOGIN.max, rlCheck.remaining, rlCheck.resetAt, rlCheck.retryAfterSec);
      return res;
    }

    // 2. Looser per-IP rate limit across all accounts (30 attempts per 15 min)
    const ipRlKey = `login:ip:${ip}`;
    const ipRlCheck = await rateLimiter.check(ipRlKey, 30, RATE_LIMITS.LOGIN.windowMs);
    if (!ipRlCheck.allowed) {
      const res = NextResponse.json(
        {
          error: `Too many sign-in attempts from this network. Please try again in ${ipRlCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
      applyRateLimitHeaders(res.headers, 30, ipRlCheck.remaining, ipRlCheck.resetAt, ipRlCheck.retryAfterSec);
      return res;
    }

    // Protection against session fixation: invalidate any existing pre-authentication session
    const prevToken = await getSessionTokenFromCookies();
    if (prevToken) {
      await Promise.all([
        authStore.deleteSession(prevToken),
        deleteSessionFromConvex(prevToken),
      ]).catch(() => {});
    }

    // 1. Authoritative Convex Cloud Authentication
    const client = getServerConvexClient();
    if (client) {
      try {
        const serverSecret = getConvexServerSecret();
        const convexRes = await client.mutation(api.auth.login, {
          identifier: cleanId,
          password,
          rememberMe: Boolean(rememberMe),
          userAgent: req.headers.get('user-agent') || undefined,
          ipAddress: ip,
          serverSecret,
        });

        // Fail-safe: map gate rejections to HTTP 500
        const gateErrResponse = checkGateError(convexRes);
        if (gateErrResponse) {
          return gateErrResponse;
        }

        if (convexRes?.ok === false) {
          const res = NextResponse.json(
            { error: convexRes.error || 'Invalid email, phone number, or password.' },
            { status: convexRes.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 401 }
          );
          applyRateLimitHeaders(res.headers, RATE_LIMITS.LOGIN.max, rlCheck.remaining, rlCheck.resetAt);
          return res;
        }

        if (convexRes?.sessionToken && convexRes?.user) {
          await rateLimiter.reset(rlKey);
          const response = NextResponse.json({
            success: true,
            user: convexRes.user,
            sessionToken: convexRes.sessionToken,
            message: 'Signed in successfully.',
          });
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          response.headers.set('Pragma', 'no-cache');
          applyRateLimitHeaders(response.headers, RATE_LIMITS.LOGIN.max, rlCheck.remaining, rlCheck.resetAt);
          setSessionCookie(response, convexRes.sessionToken, Boolean(rememberMe));
          return response;
        }
      } catch (err: any) {
        console.warn('[Convex Login Auth Error]:', err?.data || err?.message || err);
        const errorMessage =
          err?.data ||
          (err?.message?.includes('Invalid') ? err.message : 'Invalid email, phone number, or password.');
        const res = NextResponse.json(
          { error: errorMessage },
          { status: 401 }
        );
        applyRateLimitHeaders(res.headers, RATE_LIMITS.LOGIN.max, rlCheck.remaining, rlCheck.resetAt);
        return res;
      }
    }

    // 2. In-memory fallback for local mock / unit testing
    let user = await authStore.findUserByEmail(cleanId);
    if (!user) {
      user = await authStore.findUserByPhone(identifier);
    }

    if (!user || !user.passwordHash || !user.passwordSalt) {
      return NextResponse.json(
        { error: 'Invalid email, phone number, or password.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email, phone number, or password.' },
        { status: 401 }
      );
    }

    rateLimiter.reset(rlKey);

    const session = await authStore.createSession(
      user.id,
      {
        userAgent: req.headers.get('user-agent') || undefined,
        ipAddress: ip,
      },
      Boolean(rememberMe)
    );

    const response = NextResponse.json({
      success: true,
      user: authStore.toUserProfile(user),
      sessionToken: session.token,
      message: 'Signed in successfully.',
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    applyRateLimitHeaders(response.headers, RATE_LIMITS.LOGIN.max, rlCheck.remaining, rlCheck.resetAt);

    setSessionCookie(response, session.token, Boolean(rememberMe));
    return response;
  } catch (err) {
    console.error('[Login API Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while signing in. Please try again.' },
      { status: 500 }
    );
  }
}

