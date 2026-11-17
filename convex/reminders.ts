import { mutation, query, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Doc, Id } from './_generated/dataModel';

function cleanString(str: string, maxLength: number): string {
  return str
    .replace(/[\0\r\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim()
    .slice(0, maxLength);
}

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

    const title = cleanString(args.title, 200);
    if (title.length < 2) {
      throw new Error('Reminder title must be at least 2 characters long (max 200).');
    }

    if (isNaN(Date.parse(args.date))) {
      throw new Error('Invalid reminder date format.');
    }

    const reminderId = await ctx.db.insert('reminders', {
      userId: user._id,
      clientGeneratedId: args.clientGeneratedId ? cleanString(args.clientGeneratedId, 50) : `REM-${Date.now().toString().slice(-4)}`,
      caseId: args.caseId ? cleanString(args.caseId, 50) : undefined,
      title,
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

export const restoreReminder = mutation({
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
      deletedAt: undefined,
      updatedAt: now,
      version: existing.version + 1,
    });
    return { success: true };
  },
});

const BATCH_SIZE = 250;

/**
 * Hard deletes soft-deleted reminders older than 30 days.
 * Uses index 'by_deletedAt' and processes in batches of 100–500 with automatic continuation.
 */
export const purgeOldDeletedReminders = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.batchSize || BATCH_SIZE;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const batch = await ctx.db
      .query('reminders')
      .withIndex('by_deletedAt', (q) => q.lt('deletedAt', thirtyDaysAgo))
      .take(limit);

    let purgedCount = 0;
    for (const r of batch) {
      if (r.deletedAt && r.deletedAt < thirtyDaysAgo) {
        await ctx.db.delete(r._id);
        purgedCount++;
      }
    }

    // Continuation: if batch was full, schedule the next batch
    if (batch.length === limit) {
      await ctx.scheduler.runAfter(0, internal.reminders.purgeOldDeletedReminders, {
        batchSize: limit,
      });
    }

    return {
      purgedCount,
      hasMore: batch.length === limit,
      timestamp: new Date().toISOString(),
    };
  },
});

