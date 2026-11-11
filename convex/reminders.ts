import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Doc, Id } from './_generated/dataModel';

export const list = query({
  args: {
    sessionToken: v.string(),
    caseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    let reminders = await ctx.db
      .query('reminders')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    reminders = reminders.filter((r) => !r.deletedAt);
    if (args.caseId) {
      reminders = reminders.filter((r) => r.caseId === args.caseId);
    }

    reminders.sort((a, b) => (a.date > b.date ? 1 : -1));
    return reminders;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    clientGeneratedId: v.optional(v.string()),
    caseId: v.optional(v.string()),
    title: v.string(),
    date: v.string(),
    done: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const reminderId = await ctx.db.insert('reminders', {
      userId: user._id,
      clientGeneratedId: args.clientGeneratedId || `REM-${Date.now().toString().slice(-4)}`,
      caseId: args.caseId || undefined,
      title: args.title.trim(),
      date: args.date,
      done: args.done ?? false,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    return await ctx.db.get(reminderId);
  },
});

export const toggleDone = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    done: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'reminders'> | null = null;
    try {
      existing = await ctx.db.get(args.id as Id<'reminders'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('reminders')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.id))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Reminder not found or permission denied.');
    }

    const now = new Date().toISOString();
    await ctx.db.patch(existing._id, {
      done: args.done,
      updatedAt: now,
      version: existing.version + 1,
    });

    return await ctx.db.get(existing._id);
  },
});

export const deleteReminder = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'reminders'> | null = null;
    try {
      existing = await ctx.db.get(args.id as Id<'reminders'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('reminders')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.id))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Reminder not found or permission denied.');
    }

    const now = new Date().toISOString();
    await ctx.db.patch(existing._id, {
      deletedAt: now,
      updatedAt: now,
      version: existing.version + 1,
    });
    return { success: true };
  },
});

