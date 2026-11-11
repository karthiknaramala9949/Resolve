import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Doc, DataModel } from './_generated/dataModel';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateOtp,
} from './crypto';
import { getAuthenticatedUser, toSafeUserProfile } from './authHelper';
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
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error('BETTER_AUTH_SECRET or AUTH_SECRET environment variable is required in production.');
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
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email ? args.email.trim().toLowerCase() : null;
    const cleanPhone = args.phoneNumber ? args.phoneNumber.trim() : null;

    if (!cleanEmail && !cleanPhone) {
      throw new Error('Either email address or phone number is required.');
    }

    if (args.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long.');
    }

    if (args.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    // Check if email already registered
    if (cleanEmail) {
      const existingEmail = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', cleanEmail))
        .first();
      if (existingEmail) {
        throw new Error('An account with this email address already exists. Please sign in.');
      }
    }

    // Check if phone number already registered
    if (cleanPhone) {
      const existingPhone = await ctx.db
        .query('users')
        .withIndex('by_phone', (q) => q.eq('phoneNumber', cleanPhone))
        .first();
      if (existingPhone) {
        throw new Error('An account with this phone number already exists. Please sign in.');
      }
    }

    // Hash password
    const { hash, salt } = await hashPassword(args.password);
    const now = new Date().toISOString();

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

    // Create session token
    const sessionToken = generateToken(32);
    await ctx.db.insert('sessions', {
      userId,
      token: sessionToken,
      expiresAt: getExpirationDate(SESSION_TTL_DAYS),
      createdAt: now,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
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
      ipAddress: args.ipAddress,
      timestamp: now,
    });

    return {
      user: toSafeUserProfile(user),
      sessionToken,
      verificationRequired,
    };
  },
});

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
  },
  handler: async (ctx, args) => {
    const cleanId = args.identifier.trim();
    if (!cleanId || !args.password) {
      throw new Error('Please enter your email or phone number and password.');
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
      throw new Error('Invalid email, phone number, or password.');
    }

    // Verify password
    const isValid = await verifyPassword(
      args.password,
      user.passwordHash,
      user.passwordSalt
    );

    if (!isValid) {
      throw new Error('Invalid email, phone number, or password.');
    }

    const now = new Date().toISOString();
    const ttlDays = args.rememberMe ? 30 : 1;

    // Create session token
    const sessionToken = generateToken(32);
    await ctx.db.insert('sessions', {
      userId: user._id,
      token: sessionToken,
      expiresAt: getExpirationDate(ttlDays),
      createdAt: now,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
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
      ipAddress: args.ipAddress,
      timestamp: now,
    });

    return {
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
 * Send an OTP to phone number.
 */
export const sendOtp = mutation({
  args: {
    phoneNumber: v.string(),
    type: v.optional(v.string()), // 'phone_otp' | 'password_reset_phone'
  },
  handler: async (ctx, args) => {
    const cleanPhone = args.phoneNumber.trim();
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
  },
  handler: async (ctx, args) => {
    const cleanPhone = args.phoneNumber.trim();
    const type = args.type || 'phone_otp';
    const now = new Date().toISOString();

    const tokenDoc = await ctx.db
      .query('verificationTokens')
      .withIndex('by_identifier_type', (q) =>
        q.eq('identifier', cleanPhone).eq('type', type)
      )
      .filter((q) => q.eq(q.field('token'), args.otp.trim()))
      .first();

    if (!tokenDoc || tokenDoc.expiresAt < now) {
      throw new Error('Invalid or expired verification code. Please check and try again.');
    }

    // Delete tokenDoc
    await ctx.db.delete(tokenDoc._id);

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
    }

    return {
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
  },
  handler: async (ctx, args) => {
    const cleanId = args.identifier.trim();
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
  },
  handler: async (ctx, args) => {
    const cleanId = args.identifier.trim();
    const cleanToken = args.token.trim();
    const isEmail = cleanId.includes('@');
    const expectedType = isEmail ? 'password_reset_email' : 'password_reset_phone';
    const now = new Date().toISOString();

    if (args.newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const tokenDoc = await ctx.db
      .query('verificationTokens')
      .withIndex('by_identifier_type', (q) =>
        q.eq('identifier', isEmail ? cleanId.toLowerCase() : cleanId).eq('type', expectedType)
      )
      .filter((q) => q.eq(q.field('token'), cleanToken))
      .first();

    if (!tokenDoc || tokenDoc.expiresAt < now) {
      throw new Error('Invalid or expired password reset token.');
    }

    // Delete tokenDoc
    await ctx.db.delete(tokenDoc._id);

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
      throw new Error('User not found.');
    }

    // Update password
    const { hash, salt } = await hashPassword(args.newPassword);
    await ctx.db.patch(user._id, {
      passwordHash: hash,
      passwordSalt: salt,
      updatedAt: now,
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
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.',
    };
  },
});



/**
 * Update authenticated user's profile details.
 */
export const updateProfile = mutation({
  args: {
    sessionToken: v.string(),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.union(v.string(), v.null())),
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
          throw new Error('This phone number is already registered to another account.');
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
        throw new Error('Password must be at least 8 characters long.');
      }
      const { hash, salt } = await hashPassword(args.password);
      patch.passwordHash = hash;
      patch.passwordSalt = salt;
    }

    if (args.preferences) {
      patch.preferences = {
        ...user.preferences,
        ...args.preferences,
      };
    }

    await ctx.db.patch(user._id, patch);
    const updated = await ctx.db.get(user._id);
    if (!updated) throw new Error('User update failed.');

    return toSafeUserProfile(updated);
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

    return { success: true };
  },
});
