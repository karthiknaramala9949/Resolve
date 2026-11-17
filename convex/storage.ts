import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { assertRateLimit } from './rateLimits';

export const getUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    await assertRateLimit(ctx, `upload_url:${user._id}`, 30, 10 * 60 * 1000);
    return await ctx.storage.generateUploadUrl();
  },
});


