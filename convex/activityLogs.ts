import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';

export const list = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const limit = args.limit || 50;

    return await ctx.db
      .query('activityLogs')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);
  },
});

export const record = mutation({
  args: {
    sessionToken: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    details: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const logId = await ctx.db.insert('activityLogs', {
      userId: user._id,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      details: args.details,
      ipAddress: args.ipAddress,
      timestamp: now,
    });

    return logId;
  },
});

