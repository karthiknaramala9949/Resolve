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

    if (existing) {
      if (existing.userId !== user._id) {
        await ctx.db.insert('audit_logs', {
          userId: user._id,
          entityType: 'crypto',
          entityId: args.deviceId,
          action: 'security_violation',
          details: `Rejected attempt to register deviceId owned by another account: ${args.deviceId}`,
          timestamp: now,
        });
        return {
          ok: false,
          code: 'FORBIDDEN',
          error: 'Device is already registered to another account.',
        };
      }

      await ctx.db.patch(existing._id, {
        deviceName: args.deviceName,
        deviceType: args.deviceType,
        publicKey: args.publicKey,
        lastSyncAt: now,
      });

      await ctx.db.insert('audit_logs', {
        userId: user._id,
        entityType: 'crypto',
        entityId: args.deviceId,
        action: 'update',
        details: `Updated device registration: ${args.deviceName} (${args.deviceType})`,
        timestamp: now,
      });

      return {
        ok: true,
        device: await ctx.db.get(existing._id),
      };
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

    await ctx.db.insert('audit_logs', {
      userId: user._id,
      entityType: 'crypto',
      entityId: args.deviceId,
      action: 'create',
      details: `Registered new device: ${args.deviceName} (${args.deviceType})`,
      timestamp: now,
    });

    return {
      ok: true,
      device: await ctx.db.get(deviceDocId),
    };
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

    if (!dev) {
      return { ok: true, success: true };
    }

    if (dev.userId !== user._id) {
      await ctx.db.insert('audit_logs', {
        userId: user._id,
        entityType: 'crypto',
        entityId: args.deviceId,
        action: 'security_violation',
        details: `Unauthorized attempt to delete device owned by another account: ${args.deviceId}`,
        timestamp: new Date().toISOString(),
      });
      return {
        ok: false,
        code: 'FORBIDDEN',
        error: 'You do not have permission to remove this device.',
      };
    }

    await ctx.db.delete(dev._id);
    return { ok: true, success: true };
  },
});

