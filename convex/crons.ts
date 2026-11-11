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

    return {
      deletedTokensCount,
      deletedSessionsCount,
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

export default crons;

