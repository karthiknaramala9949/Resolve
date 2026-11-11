import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Doc, Id } from './_generated/dataModel';

export const list = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    let purchases = await ctx.db
      .query('purchases')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    purchases = purchases.filter((p) => !p.deletedAt);
    purchases.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    return purchases;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    clientGeneratedId: v.optional(v.string()),
    store: v.string(),
    product: v.string(),
    orderRef: v.optional(v.string()),
    amount: v.optional(v.union(v.number(), v.null())),
    purchaseDate: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    returnWindowDays: v.number(),
    warrantyMonths: v.number(),
    notes: v.optional(v.string()),
    serialNo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const purchaseId = await ctx.db.insert('purchases', {
      userId: user._id,
      clientGeneratedId: args.clientGeneratedId || `PUR-${Date.now().toString().slice(-4)}`,
      store: args.store.trim(),
      product: args.product.trim(),
      orderRef: args.orderRef?.trim() || undefined,
      amount: args.amount ?? null,
      purchaseDate: args.purchaseDate || undefined,
      deliveryDate: args.deliveryDate || undefined,
      returnWindowDays: args.returnWindowDays,
      warrantyMonths: args.warrantyMonths,
      notes: args.notes?.trim() || undefined,
      serialNo: args.serialNo?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    return await ctx.db.get(purchaseId);
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    store: v.optional(v.string()),
    product: v.optional(v.string()),
    orderRef: v.optional(v.string()),
    amount: v.optional(v.union(v.number(), v.null())),
    purchaseDate: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    returnWindowDays: v.optional(v.number()),
    warrantyMonths: v.optional(v.number()),
    notes: v.optional(v.string()),
    serialNo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'purchases'> | null = null;
    try {
      existing = await ctx.db.get(args.id as Id<'purchases'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('purchases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.id))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Purchase not found or permission denied.');
    }

    const now = new Date().toISOString();
    const patch: any = { updatedAt: now, version: existing.version + 1 };

    if (args.store !== undefined) patch.store = args.store.trim();
    if (args.product !== undefined) patch.product = args.product.trim();
    if (args.orderRef !== undefined) patch.orderRef = args.orderRef;
    if (args.amount !== undefined) patch.amount = args.amount;
    if (args.purchaseDate !== undefined) patch.purchaseDate = args.purchaseDate;
    if (args.deliveryDate !== undefined) patch.deliveryDate = args.deliveryDate;
    if (args.returnWindowDays !== undefined) patch.returnWindowDays = args.returnWindowDays;
    if (args.warrantyMonths !== undefined) patch.warrantyMonths = args.warrantyMonths;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.serialNo !== undefined) patch.serialNo = args.serialNo;

    await ctx.db.patch(existing._id, patch);
    return await ctx.db.get(existing._id);
  },
});

export const deletePurchase = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'purchases'> | null = null;
    try {
      existing = await ctx.db.get(args.id as Id<'purchases'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('purchases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.id))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Purchase not found or permission denied.');
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

