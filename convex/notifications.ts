import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Id } from './_generated/dataModel';

export const list = query({
  args: {
    sessionToken: v.string(),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let notifs = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) =>
        args.unreadOnly ? q.eq('userId', user._id).eq('read', false) : q.eq('userId', user._id)
      )
      .order('desc')
      .take(50);

    return notifs;
  },
});

export const markAsRead = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const notif = await ctx.db.get(args.id);
    if (notif && notif.userId === user._id) {
      await ctx.db.patch(notif._id, { read: true });
    }
    return { success: true };
  },
});

export const markAllAsRead = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) => q.eq('userId', user._id).eq('read', false))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }

    return { success: true, count: unread.length };
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const notifId = await ctx.db.insert('notifications', {
      userId: user._id,
      title: args.title.trim(),
      message: args.message.trim(),
      type: args.type,
      read: false,
      link: args.link,
      createdAt: now,
    });

    return await ctx.db.get(notifId);
  },
});

