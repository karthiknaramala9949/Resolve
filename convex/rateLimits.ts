import { mutation, internalMutation, MutationCtx } from './_generated/server';
import { v, ConvexError } from 'convex/values';

/**
 * Non-throwing rate limiting recorder that writes to rate_limits atomically.
 * Returns { allowed: false } instead of throwing, allowing mutations to persist audit logs
 * and state without rolling back the transaction.
 */
export async function recordAndCheckRateLimit(
  ctx: MutationCtx,
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSec?: number; resetAt: number }> {
  const now = Date.now();
  const existing = await ctx.db
    .query('rate_limits')
    .withIndex('by_key', (q) => q.eq('key', key))
    .first();

  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    if (existing) {
      await ctx.db.patch(existing._id, {
        count: 1,
        resetAt,
        updatedAt: new Date(now).toISOString(),
      });
    } else {
      await ctx.db.insert('rate_limits', {
        key,
        count: 1,
        resetAt,
        updatedAt: new Date(now).toISOString(),
      });
    }
    return { allowed: true, remaining: Math.max(0, maxAttempts - 1), resetAt };
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec, resetAt: existing.resetAt };
  }

  const nextCount = existing.count + 1;
  await ctx.db.patch(existing._id, {
    count: nextCount,
    updatedAt: new Date(now).toISOString(),
  });

  return { allowed: true, remaining: Math.max(0, maxAttempts - nextCount), resetAt: existing.resetAt };
}

/**
 * Shared, atomic rate limiting assertion helper for direct use within Convex mutations.
 * Throws a ConvexError if the limit is exceeded.
 */
export async function assertRateLimit(
  ctx: MutationCtx,
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ remaining: number; resetAt: number }> {
  const res = await recordAndCheckRateLimit(ctx, key, maxAttempts, windowMs);
  if (!res.allowed) {
    throw new ConvexError(
      `RATE_LIMIT_EXCEEDED: Too many attempts. Please try again in ${res.retryAfterSec} seconds.`
    );
  }
  return { remaining: res.remaining, resetAt: res.resetAt };
}

/**
 * Clear/reset a rate limit counter upon successful action.
 */
export async function clearRateLimit(ctx: MutationCtx, key: string): Promise<void> {
  const existing = await ctx.db
    .query('rate_limits')
    .withIndex('by_key', (q) => q.eq('key', key))
    .first();
  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

/**
 * Checks whether a rate limit ceiling has been reached without incrementing the counter.
 * Used for counting failed attempts only (e.g. per-account 20/hr failed ceiling).
 */
export async function peekRateLimit(
  ctx: MutationCtx,
  key: string,
  maxAttempts: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSec?: number }> {
  const now = Date.now();
  const existing = await ctx.db
    .query('rate_limits')
    .withIndex('by_key', (q) => q.eq('key', key))
    .first();

  if (!existing || now > existing.resetAt) {
    return { allowed: true, remaining: maxAttempts };
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining: maxAttempts - existing.count };
}

/**
 * Shared, atomic rate limiting mutation backed by Convex cloud storage.
 * Enforces distributed rate limits across all serverless and edge instances.
 */
export const checkRateLimit = mutation({
  args: {
    key: v.string(),
    maxAttempts: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('rate_limits')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first();

    // 1. First attempt or expired window
    if (!existing || now > existing.resetAt) {
      const resetAt = now + args.windowMs;
      if (existing) {
        await ctx.db.patch(existing._id, {
          count: 1,
          resetAt,
          updatedAt: new Date(now).toISOString(),
        });
      } else {
        await ctx.db.insert('rate_limits', {
          key: args.key,
          count: 1,
          resetAt,
          updatedAt: new Date(now).toISOString(),
        });
      }
      return {
        allowed: true,
        remaining: Math.max(0, args.maxAttempts - 1),
        retryAfterSec: 0,
        resetAt,
      };
    }

    // 2. Limit exceeded within active window
    if (existing.count >= args.maxAttempts) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec,
        resetAt: existing.resetAt,
      };
    }

    // 3. Increment counter atomically
    const nextCount = existing.count + 1;
    await ctx.db.patch(existing._id, {
      count: nextCount,
      updatedAt: new Date(now).toISOString(),
    });

    return {
      allowed: true,
      remaining: Math.max(0, args.maxAttempts - nextCount),
      retryAfterSec: 0,
      resetAt: existing.resetAt,
    };
  },
});

/**
 * Reset rate limit counter upon successful action (e.g. successful login).
 */
export const resetRateLimit = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('rate_limits')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});

/**
 * Cleanup expired rate limit records.
 */
export const cleanupRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query('rate_limits')
      .withIndex('by_resetAt', (q) => q.lt('resetAt', now))
      .take(100);

    for (const record of expired) {
      await ctx.db.delete(record._id);
    }

    return { deletedCount: expired.length };
  },
});

