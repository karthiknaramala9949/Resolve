import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';

export const getUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});


