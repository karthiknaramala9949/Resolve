import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Doc, Id } from './_generated/dataModel';

function cleanString(str: string, maxLength: number): string {
  return str
    .replace(/[\0\r\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim()
    .slice(0, maxLength);
}

function validateAndCleanPurchaseFields(args: {
  store?: string;
  product?: string;
  orderRef?: string;
  amount?: number | null;
  returnWindowDays?: number;
  warrantyMonths?: number;
  notes?: string;
  serialNo?: string;
}) {
  const cleaned: Record<string, any> = {};

  if (args.store !== undefined) {
    const cleanStore = cleanString(args.store, 100);
    if (cleanStore.length < 1) {
      throw new Error('Store name must be at least 1 character long (max 100).');
    }
    cleaned.store = cleanStore;
  }

  if (args.product !== undefined) {
    const cleanProduct = cleanString(args.product, 150);
    if (cleanProduct.length < 1) {
      throw new Error('Product name must be at least 1 character long (max 150).');
    }
    cleaned.product = cleanProduct;
  }

  if (args.orderRef !== undefined) {
    cleaned.orderRef = args.orderRef ? cleanString(args.orderRef, 100) : undefined;
  }

  if (args.amount !== undefined && args.amount !== null) {
    if (typeof args.amount !== 'number' || isNaN(args.amount) || args.amount < 0 || args.amount > 100000000) {
      throw new Error('Purchase amount must be a non-negative number up to ₹100,000,000.');
    }
    cleaned.amount = args.amount;
  } else if (args.amount === null) {
    cleaned.amount = null;
  }

  if (args.returnWindowDays !== undefined) {
    if (
      typeof args.returnWindowDays !== 'number' ||
      isNaN(args.returnWindowDays) ||
      args.returnWindowDays < 0 ||
      args.returnWindowDays > 365
    ) {
      throw new Error('Return window must be between 0 and 365 days.');
    }
    cleaned.returnWindowDays = Math.floor(args.returnWindowDays);
  }

  if (args.warrantyMonths !== undefined) {
    if (
      typeof args.warrantyMonths !== 'number' ||
      isNaN(args.warrantyMonths) ||
      args.warrantyMonths < 0 ||
      args.warrantyMonths > 120
    ) {
      throw new Error('Warranty period must be between 0 and 120 months.');
    }
    cleaned.warrantyMonths = Math.floor(args.warrantyMonths);
  }

  if (args.notes !== undefined) {
    cleaned.notes = args.notes ? cleanString(args.notes, 2000) : undefined;
  }

  if (args.serialNo !== undefined) {
    cleaned.serialNo = args.serialNo ? cleanString(args.serialNo, 100) : undefined;
  }

  return cleaned;
}

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

    const cleaned = validateAndCleanPurchaseFields({
      store: args.store,
      product: args.product,
      orderRef: args.orderRef,
      amount: args.amount,
      returnWindowDays: args.returnWindowDays,
      warrantyMonths: args.warrantyMonths,
      notes: args.notes,
      serialNo: args.serialNo,
    });

    const purchaseId = await ctx.db.insert('purchases', {
      userId: user._id,
      clientGeneratedId: args.clientGeneratedId ? cleanString(args.clientGeneratedId, 50) : `PUR-${Date.now().toString().slice(-4)}`,
      store: cleaned.store,
      product: cleaned.product,
      orderRef: cleaned.orderRef,
      amount: cleaned.amount ?? null,
      purchaseDate: args.purchaseDate ? cleanString(args.purchaseDate, 50) : undefined,
      deliveryDate: args.deliveryDate ? cleanString(args.deliveryDate, 50) : undefined,
      returnWindowDays: cleaned.returnWindowDays ?? 0,
      warrantyMonths: cleaned.warrantyMonths ?? 0,
      notes: cleaned.notes,
      serialNo: cleaned.serialNo,
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

    const cleaned = validateAndCleanPurchaseFields({
      store: args.store,
      product: args.product,
      orderRef: args.orderRef,
      amount: args.amount,
      returnWindowDays: args.returnWindowDays,
      warrantyMonths: args.warrantyMonths,
      notes: args.notes,
      serialNo: args.serialNo,
    });

    const now = new Date().toISOString();
    const patch: any = { updatedAt: now, version: existing.version + 1 };

    if (cleaned.store !== undefined) patch.store = cleaned.store;
    if (cleaned.product !== undefined) patch.product = cleaned.product;
    if (cleaned.orderRef !== undefined) patch.orderRef = cleaned.orderRef;
    if (cleaned.amount !== undefined) patch.amount = cleaned.amount;
    if (args.purchaseDate !== undefined) patch.purchaseDate = args.purchaseDate ? cleanString(args.purchaseDate, 50) : undefined;
    if (args.deliveryDate !== undefined) patch.deliveryDate = args.deliveryDate ? cleanString(args.deliveryDate, 50) : undefined;
    if (cleaned.returnWindowDays !== undefined) patch.returnWindowDays = cleaned.returnWindowDays;
    if (cleaned.warrantyMonths !== undefined) patch.warrantyMonths = cleaned.warrantyMonths;
    if (cleaned.notes !== undefined) patch.notes = cleaned.notes;
    if (cleaned.serialNo !== undefined) patch.serialNo = cleaned.serialNo;

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

