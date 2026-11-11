import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Id } from './_generated/dataModel';

export const getUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: {
    sessionToken: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx, args.sessionToken);
    return await ctx.storage.getUrl(args.storageId as Id<'_storage'>);
  },
});

export const deleteStoredFile = mutation({
  args: {
    sessionToken: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx, args.sessionToken);
    await ctx.storage.delete(args.storageId as Id<'_storage'>);
    return { success: true };
  },
});

