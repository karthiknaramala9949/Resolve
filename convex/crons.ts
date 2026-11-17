import { cronJobs } from 'convex/server';
import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Cleanup expired tokens and expired sessions.
 */
export const cleanupExpiredTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    // 1. Expired verification tokens
    const tokens = await ctx.db.query('verificationTokens').collect();
    let deletedTokensCount = 0;
    for (const t of tokens) {
      if (t.expiresAt < now) {
        await ctx.db.delete(t._id);
        deletedTokensCount++;
      }
    }

    // 2. Expired sessions
    const sessions = await ctx.db.query('sessions').collect();
    let deletedSessionsCount = 0;
    for (const s of sessions) {
      if (s.expiresAt < now) {
        await ctx.db.delete(s._id);
        deletedSessionsCount++;
      }
    }

    // 3. Expired distributed rate limits
    const nowMs = Date.now();
    const expiredRateLimits = await ctx.db
      .query('rate_limits')
      .withIndex('by_resetAt', (q) => q.lt('resetAt', nowMs))
      .take(500);
    let deletedRateLimitsCount = 0;
    for (const r of expiredRateLimits) {
      await ctx.db.delete(r._id);
      deletedRateLimitsCount++;
    }

    // 4. Hard-delete soft-deleted reminders older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const expiredReminders = await ctx.db
      .query('reminders')
      .withIndex('by_deletedAt', (q) => q.lt('deletedAt', thirtyDaysAgo))
      .take(250);
    let purgedRemindersCount = 0;
    for (const r of expiredReminders) {
      if (r.deletedAt && r.deletedAt < thirtyDaysAgo) {
        await ctx.db.delete(r._id);
        purgedRemindersCount++;
      }
    }

    return {
      deletedTokensCount,
      deletedSessionsCount,
      deletedRateLimitsCount,
      purgedRemindersCount,
      timestamp: now,
    };
  },
});

const crons = cronJobs();

// Run maintenance daily at 2:00 AM UTC
crons.daily(
  'cleanup-expired-tokens-and-sessions',
  { hourUTC: 2, minuteUTC: 0 },
  internal.crons.cleanupExpiredTokens
);

// Run soft-delete reminder purge daily at 2:30 AM UTC
crons.daily(
  'purge-old-soft-deleted-reminders',
  { hourUTC: 2, minuteUTC: 30 },
  internal.reminders.purgeOldDeletedReminders,
  {}
);

export default crons;

