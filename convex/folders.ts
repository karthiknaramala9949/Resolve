import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Id } from './_generated/dataModel';

export const list = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    return await ctx.db
      .query('folders')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    color: v.optional(v.string()),
    parentId: v.optional(v.union(v.id('folders'), v.null())),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const folderId = await ctx.db.insert('folders', {
      userId: user._id,
      name: args.name.trim(),
      color: args.color,
      parentId: args.parentId || null,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(folderId);
  },
});

export const rename = mutation({
  args: {
    sessionToken: v.string(),
    folderId: v.id('folders'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id) {
      throw new Error('Folder not found or permission denied.');
    }

    const now = new Date().toISOString();
    await ctx.db.patch(folder._id, {
      name: args.name.trim(),
      updatedAt: now,
    });

    return { success: true };
  },
});

export const deleteFolder = mutation({
  args: {
    sessionToken: v.string(),
    folderId: v.id('folders'),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id) {
      throw new Error('Folder not found or permission denied.');
    }

    // Unlink docs from this folder
    const docs = await ctx.db
      .query('documents')
      .withIndex('by_folder', (q) => q.eq('folderId', folder._id))
      .collect();

    for (const d of docs) {
      await ctx.db.patch(d._id, { folderId: null });
    }

    await ctx.db.delete(folder._id);
    return { success: true };
  },
});

