import { mutation, query, internalMutation, internalQuery } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { Doc, DataModel } from './_generated/dataModel';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateOtp,
  timingSafeEqual,
  timingSafeEqualStrings,
} from './crypto';
import { getAuthenticatedUser, toSafeUserProfile, syncUserProfileRecord } from './authHelper';
import { assertRateLimit, recordAndCheckRateLimit, clearRateLimit, peekRateLimit } from './rateLimits';
import { createClient } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth } from 'better-auth';
import { componentsGeneric } from 'convex/server';

const components = componentsGeneric() as unknown as { betterAuth: any };
import type { GenericCtx } from '@convex-dev/better-auth';
import authConfig from './auth.config';

/**
 * Better Auth Component Client for Convex
 */
export const authComponent = createClient<DataModel>(components.betterAuth);

/**
 * Validates Better Auth environment configuration and fail-safe defaults
 */
export const validateAuthConfig = (config?: { secret?: string; siteUrl?: string }) => {
  const secret =
    config?.secret ||
    process.env.BETTER_AUTH_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error('BETTER_AUTH_SECRET environment variable is required in production.');
    }
    if (secret.length < 32) {
      throw new Error('BETTER_AUTH_SECRET must be at least 32 characters long in production.');
    }
  }

  return {
    secret: secret || 'dev_better_auth_secret_must_be_at_least_32_characters_long_for_security',
    siteUrl:
      config?.siteUrl ||
      process.env.SITE_URL ||
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000',
  };
};

/**
 * Create Better Auth server instance bound to Convex database adapter
 */
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const config = validateAuthConfig();
  const siteUrl = config.siteUrl;
  const secret = config.secret;

  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const isGoogleEnabled = Boolean(googleClientId && googleClientSecret);

  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    secret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        enabled: isGoogleEnabled,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
      },
    },
    plugins: [convex({ authConfig })],
  });
};

export const { getAuthUser } = authComponent.clientApi();

const SESSION_TTL_DAYS = 30;

function getExpirationDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function getMinutesExpiration(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

/**
 * Register a new user with email or phone and password.
 */
export const register = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    phoneNumber: v.optional(v.union(v.string(), v.null())),
    password: v.string(),
    rememberMe: v.optional(v.boolean()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    serverSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email ? args.email.trim().toLowerCase() : null;
    const cleanPhone = args.phoneNumber ? args.phoneNumber.trim() : null;
    const now = new Date().toISOString();
    const { ip } = resolveTrustedIp(args.serverSecret, args.ipAddress);

    // Fail-closed server-only authentication gate
    const gate = verifyServerOnlyGate(args.serverSecret);
    if (!gate.allowed) {
      await ctx.db.insert('audit_logs', {
        userId: 'unauthenticated',
        entityType: 'auth',
        entityId: (cleanEmail || cleanPhone || 'unknown').slice(0, 64),
        action: 'unauthorized_direct_call',
        details: 'Direct client call to auth:register blocked by server gate',
        ipAddress: ip,
        userAgent: args.userAgent,
        timestamp: now,
      });
      return {
        ok: false,
        code: gate.code || 'UNAUTHORIZED_DIRECT_CALL',
        error: gate.error || 'Direct authentication calls are forbidden. Authenticate via https://resolve.one.',
      };
    }

    if (!cleanEmail && !cleanPhone) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        error: 'Either email address or phone number is required.',
      };
    }

    if (args.name.trim().length < 2) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        error: 'Name must be at least 2 characters long.',
      };
    }

    if (args.password.length < 8) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        error: 'Password must be at least 8 characters long.',
      };
    }

    // Rate limiting: 5 registrations per hour per identifier
    const rateLimitKey = `register:${(cleanEmail || cleanPhone || 'unknown').toLowerCase()}`;
    const rlCheck = await recordAndCheckRateLimit(ctx, rateLimitKey, 5, 60 * 60 * 1000);
    if (!rlCheck.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many registration attempts. Please try again in ${rlCheck.retryAfterSec} seconds.`,
      };
    }

    // Check if email already registered
    if (cleanEmail) {
      const existingEmail = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', cleanEmail))
        .first();
      if (existingEmail) {
        return {
          ok: false,
          code: 'ALREADY_EXISTS',
          error: 'An account with this email address already exists. Please sign in.',
        };
      }
    }

    // Check if phone number already registered
    if (cleanPhone) {
      const existingPhone = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phoneNumber', cleanPhone))
        .first();
      if (existingPhone) {
        return {
          ok: false,
          code: 'ALREADY_EXISTS',
          error: 'An account with this phone number already exists. Please sign in.',
        };
      }
    }

    // Hash password
    const { hash, salt } = await hashPassword(args.password);

    const providers: string[] = [];
    if (cleanEmail) providers.push('email');
    if (cleanPhone) providers.push('phone');

    // Insert user
    const userId = await ctx.db.insert('users', {
      name: args.name.trim(),
      email: cleanEmail,
      phoneNumber: cleanPhone,
      image: null,
      providers,
      passwordHash: hash,
      passwordSalt: salt,
      googleId: null,
      emailVerified: false,
      emailVerifiedAt: null,
      phoneVerified: false,
      phoneVerifiedAt: null,
      role: 'consumer',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User creation failed.');

    // Ensure profiles record is synchronized with users record
    await syncUserProfileRecord(ctx, user, now);

    // Create session token
    const sessionToken = generateToken(32);
    const ttlDays = args.rememberMe !== false ? 30 : 1;
    await ctx.db.insert('sessions', {
      userId,
      token: sessionToken,
      expiresAt: getExpirationDate(ttlDays),
      createdAt: now,
      userAgent: args.userAgent,
      ipAddress: ip,
    });

    // Generate verification tokens
    let verificationRequired: 'email' | 'phone' = cleanEmail ? 'email' : 'phone';

    if (cleanEmail) {
      const emailToken = generateToken(32);
      await ctx.db.insert('verificationTokens', {
        identifier: cleanEmail,
        token: emailToken,
        type: 'email_verification',
        expiresAt: getExpirationDate(1), // 24 hours
        attempts: 0,
        createdAt: now,
      });
    }

    if (cleanPhone) {
      const otp = generateOtp(6);
      await ctx.db.insert('verificationTokens', {
        identifier: cleanPhone,
        token: otp,
        type: 'phone_otp',
        expiresAt: getMinutesExpiration(10), // 10 minutes
        attempts: 0,
        createdAt: now,
      });
    }

    // Audit log
    await ctx.db.insert('activityLogs', {
      userId,
      entityType: 'auth',
      entityId: userId,
      action: 'create',
      details: `User registered via ${providers.join('+')}`,
      ipAddress: ip,
      timestamp: now,
    });

    await ctx.db.insert('audit_logs', {
      userId,
      entityType: 'auth',
      entityId: userId,
      action: 'create',
      details: `User registered via ${providers.join('+')}`,
      ipAddress: ip,
      userAgent: args.userAgent,
      timestamp: now,
    });

    return {
      ok: true,
      user: toSafeUserProfile(user),
      sessionToken,
      verificationRequired,
    };
  },
});

/**
 * Verifies whether the request originates from an authoritative Next.js server route.
 * Compares serverSecret against CONVEX_SERVER_SECRET in constant time.
 * Fails closed unless ENFORCE_SERVER_ONLY_AUTH is explicitly "false" (or explicit dev deployment).
 * Does not depend on NODE_ENV being set in Convex.
 */
export function verifyServerOnlyGate(serverSecret?: string): {
  allowed: boolean;
  isDevBypass: boolean;
  code?: string;
  error?: string;
} {
  const enforceEnv = process.env.ENFORCE_SERVER_ONLY_AUTH;
  if (enforceEnv === 'false') {
    return { allowed: true, isDevBypass: true };
  }

  const configuredSecret = process.env.CONVEX_SERVER_SECRET;
  if (!configuredSecret || configuredSecret.length < 32) {
    return {
      allowed: false,
      isDevBypass: false,
      code: 'SERVER_GATE_MISCONFIGURED',
      error: 'Convex server-only auth gate is misconfigured: CONVEX_SERVER_SECRET is missing or too short.',
    };
  }

  if (!serverSecret || !timingSafeEqualStrings(serverSecret, configuredSecret)) {
    return {
      allowed: false,
      isDevBypass: false,
      code: 'UNAUTHORIZED_DIRECT_CALL',
      error: 'Direct client authentication calls are forbidden. Authenticate via https://resolve.one.',
    };
  }

  return { allowed: true, isDevBypass: false };
}

/**
 * Resolves trusted client IP. If verified through the server gate, the IP provided by
 * Next.js server headers is accepted as authentic. Otherwise, it is prefixed with 'unverified:'.
 */
function resolveTrustedIp(
  serverSecret?: string,
  clientIp?: string
): { ip: string; isVerifiedServerRoute: boolean } {
  const gate = verifyServerOnlyGate(serverSecret);
  const isVerifiedServerRoute = gate.allowed && !gate.isDevBypass;

  if (isVerifiedServerRoute && clientIp) {
    return { ip: clientIp, isVerifiedServerRoute: true };
  }

  const unverifiedIp = clientIp ? `unverified:${clientIp}` : 'unverified:unknown';
  return { ip: unverifiedIp, isVerifiedServerRoute: false };
}

/**
 * Sign in using email or phone number and password.
 */
export const login = mutation({
  args: {
    identifier: v.string(),
    password: v.string(),
    rememberMe: v.optional(v.boolean()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    serverSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanId = args.identifier.trim();
    if (!cleanId || !args.password) {
      return {
        ok: false,
        code: 'MISSING_FIELDS',
        error: 'Please enter your email or phone number and password.',
      };
    }

    const now = new Date().toISOString();
    const { ip } = resolveTrustedIp(args.serverSecret, args.ipAddress);

    // Fail-closed server-only authentication gate
    const gate = verifyServerOnlyGate(args.serverSecret);
    if (!gate.allowed) {
      await ctx.db.insert('audit_logs', {
        userId: 'unauthenticated',
        entityType: 'auth',
        entityId: cleanId.slice(0, 64),
        action: 'unauthorized_direct_call',
        details: 'Direct client call to auth:login blocked by server gate',
        ipAddress: ip,
        userAgent: args.userAgent,
        timestamp: now,
      });
      return {
        ok: false,
        code: gate.code || 'UNAUTHORIZED_DIRECT_CALL',
        error: gate.error || 'Direct authentication calls are forbidden. Authenticate via https://resolve.one.',
      };
    }

    // 1. Per-account ceiling independent of IP (20 failed attempts / hour)
    // Only counts failed attempts; peeks current count without incrementing until failure occurs
    const accountRateLimitKey = `login:failed:account:${cleanId.toLowerCase()}`;
    const accountLimit = await peekRateLimit(ctx, accountRateLimitKey, 20);
    if (!accountLimit.allowed) {
      await ctx.db.insert('audit_logs', {
        userId: 'unauthenticated',
        entityType: 'auth',
        entityId: cleanId.slice(0, 64),
        action: 'rate_limit_exceeded',
        details: `Failed sign-in attempts exceeded per-account ceiling (20/hr). Retry after ${accountLimit.retryAfterSec}s.`,
        ipAddress: ip,
        userAgent: args.userAgent,
        timestamp: now,
      });
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many failed sign-in attempts for this account. Please try again in ${accountLimit.retryAfterSec} seconds or reset your password.`,
      };
    }

    // 2. Strict identifier + IP rate limit (5 attempts / 15 min)
    const idRateLimitKey = `login:${cleanId.toLowerCase()}:${ip}`;
    const idLimit = await recordAndCheckRateLimit(ctx, idRateLimitKey, 5, 15 * 60 * 1000);
    if (!idLimit.allowed) {
      await ctx.db.insert('audit_logs', {
        userId: 'unauthenticated',
        entityType: 'auth',
        entityId: cleanId.slice(0, 64),
        action: 'rate_limit_exceeded',
        details: `Sign-in attempts exceeded limit for identifier. Retry after ${idLimit.retryAfterSec}s.`,
        ipAddress: ip,
        userAgent: args.userAgent,
        timestamp: now,
      });
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many sign-in attempts. Please try again in ${idLimit.retryAfterSec} seconds.`,
      };
    }

    // 3. Looser per-IP rate limit across all accounts (30 attempts / 15 min)
    const ipRateLimitKey = `login:ip:${ip}`;
    const ipLimit = await recordAndCheckRateLimit(ctx, ipRateLimitKey, 30, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      await ctx.db.insert('audit_logs', {
        userId: 'unauthenticated',
        entityType: 'auth',
        entityId: cleanId.slice(0, 64),
        action: 'rate_limit_exceeded',
        details: `Sign-in attempts exceeded limit for IP. Retry after ${ipLimit.retryAfterSec}s.`,
        ipAddress: ip,
        userAgent: args.userAgent,
        timestamp: now,
      });
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many sign-in attempts from this network. Please try again in ${ipLimit.retryAfterSec} seconds.`,
      };
    }

    // Search by email or phone
    let user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', cleanId.toLowerCase()))
      .first();

    if (!user) {
      user = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phoneNumber', cleanId))
        .first();
    }

    if (!user || !user.passwordHash || !user.passwordSalt) {
      await recordAndCheckRateLimit(ctx, accountRateLimitKey, 20, 60 * 60 * 1000);
      await ctx.db.insert('audit_logs', {
        userId: user?._id || 'unauthenticated',
        entityType: 'auth',
        entityId: cleanId.slice(0, 64),
        action: 'login_failed',
        details: 'Failed authentication attempt: invalid credentials',
        ipAddress: ip,
        userAgent: args.userAgent,
        timestamp: now,
      });
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Invalid email, phone number, or password.',
      };
    }

    // Verify password
    const isValid = await verifyPassword(
      args.password,
      user.passwordHash,
      user.passwordSalt
    );

    if (!isValid) {
      await recordAndCheckRateLimit(ctx, accountRateLimitKey, 20, 60 * 60 * 1000);
      await ctx.db.insert('audit_logs', {
        userId: user._id,
        entityType: 'auth',
        entityId: user._id,
        action: 'login_failed',
        details: 'Failed authentication attempt: incorrect password',
        ipAddress: ip,
        userAgent: args.userAgent,
        timestamp: now,
      });
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Invalid email, phone number, or password.',
      };
    }

    // Reset failed attempt counters on success
    await clearRateLimit(ctx, accountRateLimitKey);
    await clearRateLimit(ctx, idRateLimitKey);

    const ttlDays = args.rememberMe ? 30 : 1;

    // Create session token
    const sessionToken = generateToken(32);
    await ctx.db.insert('sessions', {
      userId: user._id,
      token: sessionToken,
      expiresAt: getExpirationDate(ttlDays),
      createdAt: now,
      userAgent: args.userAgent,
      ipAddress: ip,
    });

    // Update lastLoginAt
    await ctx.db.patch(user._id, {
      lastLoginAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.db.insert('activityLogs', {
      userId: user._id,
      entityType: 'auth',
      entityId: user._id,
      action: 'login',
      details: 'User signed in with credentials',
      ipAddress: ip,
      timestamp: now,
    });

    await ctx.db.insert('audit_logs', {
      userId: user._id,
      entityType: 'auth',
      entityId: user._id,
      action: 'login',
      details: 'User signed in with credentials',
      ipAddress: ip,
      userAgent: args.userAgent,
      timestamp: now,
    });

    return {
      ok: true,
      user: toSafeUserProfile(user),
      sessionToken,
    };
  },
});

/**
 * Get current authenticated user by session token.
 */
export const getCurrentUser = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
      return toSafeUserProfile(user);
    } catch {
      return null;
    }
  },
});

export const me = getCurrentUser;

/**
 * Log out and destroy session.
 */
export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Creates an anonymous guest session in Convex so that all guest data
 * is persistently and authoritatively managed by Convex.
 */
export const createGuestSession = mutation({
  args: {
    name: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const guestName = args.name?.trim() || 'Local Consumer';

    const userId = await ctx.db.insert('users', {
      name: guestName,
      email: null,
      phoneNumber: null,
      image: null,
      providers: ['guest'],
      emailVerified: false,
      emailVerifiedAt: null,
      phoneVerified: false,
      phoneVerifiedAt: null,
      role: 'guest',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    const sessionToken = generateToken(32);
    await ctx.db.insert('sessions', {
      userId,
      token: sessionToken,
      expiresAt: getExpirationDate(SESSION_TTL_DAYS),
      createdAt: now,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    const user = await ctx.db.get(userId);
    return {
      user: toSafeUserProfile(user!),
      sessionToken,
    };
  },
});

/**
 * Send an OTP to phone number.
 */
export const sendOtp = mutation({
  args: {
    phoneNumber: v.string(),
    type: v.optional(v.string()), // 'phone_otp' | 'password_reset_phone'
    ipAddress: v.optional(v.string()),
    serverSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanPhone = args.phoneNumber.trim();
    const { ip } = resolveTrustedIp(args.serverSecret, args.ipAddress);

    // Fail-closed server-only authentication gate
    const gate = verifyServerOnlyGate(args.serverSecret);
    if (!gate.allowed) {
      return {
        ok: false,
        code: gate.code || 'UNAUTHORIZED_DIRECT_CALL',
        error: gate.error || 'Direct authentication calls are forbidden. Authenticate via https://resolve.one.',
      };
    }

    // 1. Per-account ceiling independent of IP: 5 OTP sends per 10 minutes per phone
    const accountLimit = await recordAndCheckRateLimit(ctx, `otp_send:account:${cleanPhone}`, 5, 10 * 60 * 1000);
    if (!accountLimit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many OTP requests for this phone number. Please wait ${accountLimit.retryAfterSec} seconds.`,
      };
    }

    // 2. Strict identifier + IP rate limit: 3 OTP sends per 10 minutes per phone
    const phoneLimit = await recordAndCheckRateLimit(ctx, `otp_send:${cleanPhone}:${ip}`, 3, 10 * 60 * 1000);
    if (!phoneLimit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many OTP requests. Please wait ${phoneLimit.retryAfterSec} seconds.`,
      };
    }

    // 3. Looser per-IP limit across all numbers: 15 OTP sends per 15 minutes
    const ipLimit = await recordAndCheckRateLimit(ctx, `otp_send:ip:${ip}`, 15, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many OTP requests from this network. Please wait ${ipLimit.retryAfterSec} seconds.`,
      };
    }

    const type = args.type || 'phone_otp';
    const now = new Date().toISOString();

    const otp = generateOtp(6);
    await ctx.db.insert('verificationTokens', {
      identifier: cleanPhone,
      token: otp,
      type,
      expiresAt: getMinutesExpiration(10), // 10 minutes
      attempts: 0,
      createdAt: now,
    });

    return {
      ok: true,
      success: true,
      message: `Verification code sent to ${cleanPhone}.`,
      expiresInMinutes: 10,
    };
  },
});

/**
 * Verify 6-digit OTP.
 */
export const verifyOtp = mutation({
  args: {
    phoneNumber: v.string(),
    otp: v.string(),
    type: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    serverSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanPhone = args.phoneNumber.trim();
    const { ip } = resolveTrustedIp(args.serverSecret, args.ipAddress);
    const rateLimitKey = `otp_verify:${cleanPhone}:${ip}`;

    // Fail-closed server-only authentication gate
    const gate = verifyServerOnlyGate(args.serverSecret);
    if (!gate.allowed) {
      return {
        ok: false,
        code: gate.code || 'UNAUTHORIZED_DIRECT_CALL',
        error: gate.error || 'Direct authentication calls are forbidden. Authenticate via https://resolve.one.',
      };
    }

    // 1. Per-account ceiling independent of IP: 20 failed OTP verification attempts per hour
    const accountRateLimitKey = `otp_verify:failed:account:${cleanPhone}`;
    const accountCheck = await peekRateLimit(ctx, accountRateLimitKey, 20);
    if (!accountCheck.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many failed verification attempts for this phone number. Please wait ${accountCheck.retryAfterSec} seconds.`,
      };
    }

    // 2. Strict limit: 5 OTP verification attempts per 15 minutes per phone + IP
    const rlCheck = await recordAndCheckRateLimit(ctx, rateLimitKey, 5, 15 * 60 * 1000);
    if (!rlCheck.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many verification attempts. Please wait ${rlCheck.retryAfterSec} seconds.`,
      };
    }

    // 3. Looser per-IP limit: 25 attempts per 15 minutes
    const ipLimit = await recordAndCheckRateLimit(ctx, `otp_verify:ip:${ip}`, 25, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many verification attempts from this network. Please wait ${ipLimit.retryAfterSec} seconds.`,
      };
    }

    const type = args.type || 'phone_otp';
    const now = new Date().toISOString();

    const tokenDoc = await ctx.db
      .query('verificationTokens')
      .withIndex('by_identifier_type', (q) =>
        q.eq('identifier', cleanPhone).eq('type', type)
      )
      .first();

    if (!tokenDoc || tokenDoc.expiresAt < now) {
      return {
        ok: false,
        code: 'INVALID_OR_EXPIRED_OTP',
        error: 'Invalid or expired verification code. Please check and try again.',
      };
    }

    if (tokenDoc.attempts >= 5) {
      await ctx.db.delete(tokenDoc._id);
      return {
        ok: false,
        code: 'OTP_REVOKED',
        error: 'Too many invalid attempts. This verification code has been revoked.',
      };
    }

    if (tokenDoc.token !== args.otp.trim()) {
      await recordAndCheckRateLimit(ctx, accountRateLimitKey, 20, 60 * 60 * 1000);
      const nextAttempts = (tokenDoc.attempts || 0) + 1;
      if (nextAttempts >= 5) {
        await ctx.db.delete(tokenDoc._id);
        return {
          ok: false,
          code: 'OTP_REVOKED',
          error: 'Too many invalid attempts. This verification code has been revoked.',
        };
      }
      await ctx.db.patch(tokenDoc._id, { attempts: nextAttempts });
      return {
        ok: false,
        code: 'INVALID_OTP',
        error: `Invalid verification code. ${5 - nextAttempts} attempts remaining.`,
      };
    }

    // Delete tokenDoc and reset rate limits on successful verification
    await ctx.db.delete(tokenDoc._id);
    await clearRateLimit(ctx, accountRateLimitKey);
    await clearRateLimit(ctx, rateLimitKey);

    // If phone verification, update user
    let updatedUser: Doc<'users'> | null = null;
    const user = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phoneNumber', cleanPhone))
      .first();

    if (user && type === 'phone_otp') {
      await ctx.db.patch(user._id, {
        phoneVerified: true,
        phoneVerifiedAt: now,
        updatedAt: now,
      });
      updatedUser = await ctx.db.get(user._id);
      if (updatedUser) {
        await syncUserProfileRecord(ctx, updatedUser, now);
      }
    }

    return {
      ok: true,
      success: true,
      message: 'Phone number verified successfully.',
      user: updatedUser ? toSafeUserProfile(updatedUser) : null,
    };
  },
});

/**
 * Verify email token.
 */
export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const tokenDoc = await ctx.db
      .query('verificationTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token.trim()))
      .first();

    if (!tokenDoc || tokenDoc.type !== 'email_verification' || tokenDoc.expiresAt < now) {
      throw new Error('Invalid or expired verification token.');
    }

    const email = tokenDoc.identifier;
    await ctx.db.delete(tokenDoc._id);

    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        emailVerified: true,
        emailVerifiedAt: now,
        updatedAt: now,
      });
      const updatedUser = await ctx.db.get(user._id);
      if (updatedUser) {
        await syncUserProfileRecord(ctx, updatedUser, now);
      }
    }

    return {
      success: true,
      message: 'Email address verified successfully.',
    };
  },
});

/**
 * Request password recovery token / OTP.
 */
export const forgotPassword = mutation({
  args: {
    identifier: v.string(),
    ipAddress: v.optional(v.string()),
    serverSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanId = args.identifier.trim();
    const { ip } = resolveTrustedIp(args.serverSecret, args.ipAddress);

    // Fail-closed server-only authentication gate
    const gate = verifyServerOnlyGate(args.serverSecret);
    if (!gate.allowed) {
      return {
        ok: false,
        code: gate.code || 'UNAUTHORIZED_DIRECT_CALL',
        error: gate.error || 'Direct authentication calls are forbidden. Authenticate via https://resolve.one.',
      };
    }

    // 1. Per-account ceiling independent of IP: 5 password reset requests per 15 minutes per identifier
    const accountLimit = await recordAndCheckRateLimit(ctx, `forgot_pwd:account:${cleanId.toLowerCase()}`, 5, 15 * 60 * 1000);
    if (!accountLimit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many password reset requests for this account. Please wait ${accountLimit.retryAfterSec} seconds.`,
      };
    }

    // 2. Strict limit: 3 password reset requests per 15 minutes per identifier + IP
    const idLimit = await recordAndCheckRateLimit(ctx, `forgot_pwd:${cleanId.toLowerCase()}:${ip}`, 3, 15 * 60 * 1000);
    if (!idLimit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many password reset requests. Please wait ${idLimit.retryAfterSec} seconds.`,
      };
    }

    // 3. Looser per-IP limit: 15 requests per 15 minutes
    const ipLimit = await recordAndCheckRateLimit(ctx, `forgot_pwd:ip:${ip}`, 15, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many password reset requests from this network. Please wait ${ipLimit.retryAfterSec} seconds.`,
      };
    }

    const isEmail = cleanId.includes('@');
    const now = new Date().toISOString();

    if (isEmail) {
      const email = cleanId.toLowerCase();
      const user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', email))
        .first();

      if (user) {
        const token = generateToken(32);
        await ctx.db.insert('verificationTokens', {
          identifier: email,
          token,
          type: 'password_reset_email',
          expiresAt: getMinutesExpiration(60), // 1 hour
          attempts: 0,
          createdAt: now,
        });
      }
    } else {
      const user = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phoneNumber', cleanId))
        .first();

      if (user) {
        const otp = generateOtp(6);
        await ctx.db.insert('verificationTokens', {
          identifier: cleanId,
          token: otp,
          type: 'password_reset_phone',
          expiresAt: getMinutesExpiration(10), // 10 minutes
          attempts: 0,
          createdAt: now,
        });
      }
    }

    return {
      ok: true,
      success: true,
      message: 'If an account exists, we have sent instructions.',
    };
  },
});

/**
 * Reset password with token or OTP.
 */
export const resetPassword = mutation({
  args: {
    identifier: v.string(),
    token: v.string(),
    newPassword: v.string(),
    ipAddress: v.optional(v.string()),
    serverSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanId = args.identifier.trim();
    const cleanToken = args.token.trim();
    const { ip } = resolveTrustedIp(args.serverSecret, args.ipAddress);
    const rateLimitKey = `reset_pwd:${cleanId.toLowerCase()}:${ip}`;

    // Fail-closed server-only authentication gate
    const gate = verifyServerOnlyGate(args.serverSecret);
    if (!gate.allowed) {
      return {
        ok: false,
        code: gate.code || 'UNAUTHORIZED_DIRECT_CALL',
        error: gate.error || 'Direct authentication calls are forbidden. Authenticate via https://resolve.one.',
      };
    }

    // 1. Per-account ceiling independent of IP: 5 password reset attempts per 15 minutes per identifier
    const accountCheck = await recordAndCheckRateLimit(ctx, `reset_pwd:account:${cleanId.toLowerCase()}`, 5, 15 * 60 * 1000);
    if (!accountCheck.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many password reset attempts for this account. Please wait ${accountCheck.retryAfterSec} seconds.`,
      };
    }

    // 2. Strict limit: 5 password reset attempts per 15 minutes per identifier + IP
    const rlCheck = await recordAndCheckRateLimit(ctx, rateLimitKey, 5, 15 * 60 * 1000);
    if (!rlCheck.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many password reset attempts. Please wait ${rlCheck.retryAfterSec} seconds.`,
      };
    }

    // 3. Looser per-IP limit: 25 attempts per 15 minutes
    const ipLimit = await recordAndCheckRateLimit(ctx, `reset_pwd:ip:${ip}`, 25, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many password reset attempts from this network. Please wait ${ipLimit.retryAfterSec} seconds.`,
      };
    }

    const isEmail = cleanId.includes('@');
    const expectedType = isEmail ? 'password_reset_email' : 'password_reset_phone';
    const now = new Date().toISOString();

    if (args.newPassword.length < 8) {
      return {
        ok: false,
        code: 'WEAK_PASSWORD',
        error: 'New password must be at least 8 characters long.',
      };
    }

    const tokenDoc = await ctx.db
      .query('verificationTokens')
      .withIndex('by_identifier_type', (q) =>
        q.eq('identifier', isEmail ? cleanId.toLowerCase() : cleanId).eq('type', expectedType)
      )
      .first();

    if (!tokenDoc || tokenDoc.expiresAt < now) {
      return {
        ok: false,
        code: 'INVALID_TOKEN',
        error: 'Invalid or expired password reset token.',
      };
    }

    if (tokenDoc.attempts >= 5) {
      await ctx.db.delete(tokenDoc._id);
      return {
        ok: false,
        code: 'TOKEN_REVOKED',
        error: 'Too many invalid attempts. This password reset token has been revoked.',
      };
    }

    if (tokenDoc.token !== cleanToken) {
      const nextAttempts = (tokenDoc.attempts || 0) + 1;
      if (nextAttempts >= 5) {
        await ctx.db.delete(tokenDoc._id);
        return {
          ok: false,
          code: 'TOKEN_REVOKED',
          error: 'Too many invalid attempts. This password reset token has been revoked.',
        };
      }
      await ctx.db.patch(tokenDoc._id, { attempts: nextAttempts });
      return {
        ok: false,
        code: 'INVALID_TOKEN',
        error: `Invalid password reset token. ${5 - nextAttempts} attempts remaining.`,
      };
    }

    // Delete tokenDoc and reset rate limit on successful verification
    await ctx.db.delete(tokenDoc._id);
    await clearRateLimit(ctx, rateLimitKey);

    // Find user
    const user = isEmail
      ? await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', cleanId.toLowerCase()))
          .first()
      : await ctx.db
          .query('users')
          .withIndex('by_phone', (q) => q.eq('phoneNumber', cleanId))
          .first();

    if (!user) {
      return {
        ok: false,
        code: 'USER_NOT_FOUND',
        error: 'User not found.',
      };
    }

    // Update password
    const { hash, salt } = await hashPassword(args.newPassword);
    await ctx.db.patch(user._id, {
      passwordHash: hash,
      passwordSalt: salt,
      updatedAt: now,
    });

    await ctx.db.insert('audit_logs', {
      userId: user._id,
      entityType: 'auth',
      entityId: user._id,
      action: 'update',
      details: 'Password was successfully reset',
      timestamp: now,
    });

    // Invalidate existing sessions
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    for (const sess of sessions) {
      await ctx.db.delete(sess._id);
    }

    return {
      ok: true,
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.',
    };
  },
});

/**
 * Emergency incident response: forcefully revokes all active sessions across all users.
 * Accessible strictly as an internal mutation via CLI (npx convex run auth:forceRevokeAllSessions)
 * or Convex Dashboard.
 */
export const forceRevokeAllSessions = internalMutation({
  args: {
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Purge custom application sessions table
    const sessions = await ctx.db.query('sessions').collect();
    let revokedCount = 0;
    for (const session of sessions) {
      await ctx.db.delete(session._id);
      revokedCount++;
    }

    // 2. Purge Better Auth component sessions if component is registered
    let betterAuthPurged = false;
    try {
      if (components?.betterAuth?.adapter?.deleteMany) {
        await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
          input: {
            model: 'session',
          },
        });
        betterAuthPurged = true;
      }
    } catch (err) {
      // Better Auth component may be unmounted in unit/mock test environments
      console.warn('[AUTH INCIDENT] Better Auth session purge note:', err);
    }

    await ctx.db.insert('audit_logs', {
      userId: 'system',
      entityType: 'auth',
      entityId: 'global_session_revocation',
      action: 'security_incident_response',
      details: `Forcefully revoked all active sessions (${revokedCount} app sessions, Better Auth component purged: ${betterAuthPurged}). Reason: ${args.reason || 'Security incident containment'}`,
      timestamp: new Date().toISOString(),
    });
    return { success: true, revokedSessionsCount: revokedCount, betterAuthPurged };
  },
});



/**
 * Update authenticated user's profile details.
 * Simultaneously updates both the users record and the profiles record.
 */
export const updateProfile = mutation({
  args: {
    sessionToken: v.string(),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.union(v.string(), v.null())),
    currentPassword: v.optional(v.string()),
    password: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        simpleLanguageMode: v.optional(v.boolean()),
        notificationsEnabled: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const patch: any = { updatedAt: now };

    if (args.name && args.name.trim().length >= 2) {
      patch.name = args.name.trim();
    }

    if (args.phoneNumber !== undefined) {
      if (args.phoneNumber && args.phoneNumber.trim() !== '') {
        const cleanPhone = args.phoneNumber.trim();
        const existing = await ctx.db
          .query('users')
          .withIndex('by_phone', (q) => q.eq('phoneNumber', cleanPhone))
          .first();

        if (existing && existing._id !== user._id) {
          throw new ConvexError('This phone number is already registered to another account.');
        }

        patch.phoneNumber = cleanPhone;
        if (!user.providers.includes('phone')) {
          patch.providers = [...user.providers, 'phone'];
        }
      } else {
        patch.phoneNumber = null;
      }
    }

    if (args.password) {
      if (args.password.length < 8) {
        throw new ConvexError('Password must be at least 8 characters long.');
      }
      if (user.passwordHash && user.passwordSalt) {
        if (!args.currentPassword) {
          throw new ConvexError('Current password is required to change your password.');
        }
        const isCurrentValid = await verifyPassword(
          args.currentPassword,
          user.passwordHash,
          user.passwordSalt
        );
        if (!isCurrentValid) {
          throw new ConvexError('Current password does not match.');
        }
      }
      const { hash, salt } = await hashPassword(args.password);
      patch.passwordHash = hash;
      patch.passwordSalt = salt;
      if (!user.providers.includes('email')) {
        patch.providers = [...user.providers, 'email'];
      }
    }

    if (args.preferences) {
      patch.preferences = {
        ...user.preferences,
        ...args.preferences,
      };
    }

    // 1. Update authoritative user record in users table
    await ctx.db.patch(user._id, patch);
    const updated = await ctx.db.get(user._id);
    if (!updated) throw new ConvexError('User update failed.');

    // 2. Synchronize the corresponding profiles record simultaneously
    await syncUserProfileRecord(ctx, updated, now);

    return toSafeUserProfile(updated);
  },
});

/**
 * Backfill and synchronize all existing users to profiles table.
 * Restricted to internal administrative invocation (Dashboard / CLI).
 */
export const backfillProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const allUsers = await ctx.db.query('users').collect();
    let synced = 0;
    for (const u of allUsers) {
      await syncUserProfileRecord(ctx, u, now);
      synced++;
    }
    return { synced, total: allUsers.length };
  },
});

/**
 * Store or update End-to-End Encryption (E2EE) keys on user profile.
 */
export const updateE2EEKeys = mutation({
  args: {
    sessionToken: v.string(),
    encryptedMasterKey: v.string(),
    masterKeySalt: v.string(),
    masterKeyIv: v.string(),
    recoveryKeyHash: v.optional(v.string()),
    recoveryWrappedMasterKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    await ctx.db.patch(user._id, {
      encryptedMasterKey: args.encryptedMasterKey,
      masterKeySalt: args.masterKeySalt,
      masterKeyIv: args.masterKeyIv,
      recoveryKeyHash: args.recoveryKeyHash,
      recoveryWrappedMasterKey: args.recoveryWrappedMasterKey,
      updatedAt: now,
    });

    // Audit log key management / recovery key configuration
    await ctx.db.insert('audit_logs', {
      userId: user._id,
      entityType: 'crypto',
      entityId: user._id,
      action: args.recoveryKeyHash ? 'key_rotate' : 'update',
      details: args.recoveryKeyHash
        ? 'User E2EE master key bundle updated with recovery key'
        : 'User E2EE master key bundle updated',
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Synchronize an externally authenticated session (e.g. Next.js auth route or Google OAuth)
 * into Convex's authoritative users and sessions tables for cloud sync and secure file operations.
 */
export const syncExternalSession = mutation({
  args: {
    internalSecret: v.string(),
    userId: v.optional(v.string()),
    name: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    phoneNumber: v.optional(v.union(v.string(), v.null())),
    providers: v.array(v.string()),
    sessionToken: v.string(),
    expiresAt: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = validateAuthConfig();
    if (!args.internalSecret || !timingSafeEqual(args.internalSecret, config.secret)) {
      throw new Error('UNAUTHORIZED: Invalid internal service authorization secret.');
    }

    const now = new Date().toISOString();
    let user = null;

    if (args.email) {
      user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', args.email!.toLowerCase()))
        .first();
    }
    if (!user && args.phoneNumber) {
      user = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phoneNumber', args.phoneNumber!))
        .first();
    }

    let convexUserId = user?._id;
    if (!convexUserId) {
      convexUserId = await ctx.db.insert('users', {
        name: args.name,
        email: args.email ? args.email.toLowerCase() : null,
        phoneNumber: args.phoneNumber || null,
        image: null,
        providers: args.providers,
        emailVerified: Boolean(args.email),
        emailVerifiedAt: args.email ? now : null,
        phoneVerified: Boolean(args.phoneNumber),
        phoneVerifiedAt: args.phoneNumber ? now : null,
        role: 'consumer',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
    }

    const userDoc = await ctx.db.get(convexUserId);
    if (userDoc) {
      await syncUserProfileRecord(ctx, userDoc, now);
    }

    // Check existing session
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.sessionToken))
      .first();

    if (!existingSession) {
      await ctx.db.insert('sessions', {
        userId: convexUserId,
        token: args.sessionToken,
        expiresAt: args.expiresAt,
        createdAt: now,
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
      });
    }

    return { success: true, userId: convexUserId };
  },
});

export const listUserDiagnostics = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').take(20);
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      phoneNumber: u.phoneNumber,
      hasPasswordHash: Boolean(u.passwordHash),
      passwordHashPrefix: u.passwordHash ? u.passwordHash.substring(0, 15) : null,
      passwordHashLength: u.passwordHash?.length,
      hasPasswordSalt: Boolean(u.passwordSalt),
      passwordSaltLength: u.passwordSalt?.length,
    }));
  },
});

export const testCryptoInConvex = internalQuery({
  args: { password: v.string(), salt: v.string() },
  handler: async (ctx, args) => {
    try {
      const { hash } = await hashPassword(args.password, args.salt);
      return { success: true, hash };
    } catch (err: any) {
      return { success: false, error: 'Cryptographic operation failed.' };
    }
  },
});



