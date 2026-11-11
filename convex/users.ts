import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser, toSafeUserProfile } from './authHelper';

/**
 * Get profile of current user.
 */
export const getProfile = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    return toSafeUserProfile(user);
  },
});

/**
 * Update user preferences (theme, simple language, etc.).
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

