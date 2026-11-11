import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Id } from './_generated/dataModel';

export const registerDevice = mutation({
  args: {
    sessionToken: v.string(),
    deviceId: v.string(),
    deviceName: v.string(),
    deviceType: v.string(),
    publicKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query('devices')
      .withIndex('by_device', (q) => q.eq('deviceId', args.deviceId))
      .first();

    if (existing && existing.userId === user._id) {
      await ctx.db.patch(existing._id, {
        deviceName: args.deviceName,
        lastSyncAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const deviceDocId = await ctx.db.insert('devices', {
      userId: user._id,
      deviceId: args.deviceId,
      deviceName: args.deviceName,
      deviceType: args.deviceType,
      publicKey: args.publicKey,
      lastSyncAt: now,
      createdAt: now,
    });

    return await ctx.db.get(deviceDocId);
  },
});

export const list = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    return await ctx.db
      .query('devices')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
  },
});

export const removeDevice = mutation({
  args: {
    sessionToken: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    const dev = await ctx.db
      .query('devices')
      .withIndex('by_device', (q) => q.eq('deviceId', args.deviceId))
      .first();

    if (dev && dev.userId === user._id) {
      await ctx.db.delete(dev._id);
    }

    return { success: true };
  },
});

