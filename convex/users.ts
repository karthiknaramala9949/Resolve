import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser, toSafeUserProfile, syncUserProfileRecord } from './authHelper';

/**
 * Get profile of current user.
 */
export const getProfile = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first();

    return {
      ...toSafeUserProfile(user),
      profileRecord: profile || null,
    };
  },
});

/**
 * Update user preferences (theme, simple language, etc.).
 * Simultaneously updates both the users record and the profiles record.
 */
export const updatePreferences = mutation({
  args: {
    sessionToken: v.string(),
    preferences: v.object({
      theme: v.optional(v.string()),
      simpleLanguageMode: v.optional(v.boolean()),
      notificationsEnabled: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const merged = {
      ...user.preferences,
      ...args.preferences,
    };

    await ctx.db.patch(user._id, {
      preferences: merged,
      updatedAt: now,
    });

    const updatedUser = (await ctx.db.get(user._id))!;
    await syncUserProfileRecord(ctx, updatedUser, now);

    return merged;
  },
});

/**
 * Get activity logs for the current user.
 */
export const getActivityLogs = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const limit = args.limit || 50;

    const logs = await ctx.db
      .query('activityLogs')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);

    return logs;
  },
});

