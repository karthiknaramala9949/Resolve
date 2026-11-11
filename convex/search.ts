import { query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';

export const globalSearch = query({
  args: {
    sessionToken: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const q = args.query.toLowerCase().trim();
    const limit = args.limit || 20;

    if (!q) {
      return { cases: [], documents: [], purchases: [] };
    }

    // 1. Cases search
    const allCases = await ctx.db
      .query('cases')
      .withIndex('by_user', (idx) => idx.eq('userId', user._id))
      .collect();

    const matchedCases = allCases
      .filter(
        (c) =>
          !c.deletedAt &&
          (c.title.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q) ||
            (c.product && c.product.toLowerCase().includes(q)) ||
            (c.orderRef && c.orderRef.toLowerCase().includes(q)) ||
            c.description.toLowerCase().includes(q))
      )
      .slice(0, limit);

    // 2. Documents search
    const allDocs = await ctx.db
      .query('documents')
      .withIndex('by_user', (idx) => idx.eq('userId', user._id))
      .collect();

    const matchedDocs = allDocs
      .filter((d) => !d.deletedAt && d.name.toLowerCase().includes(q))
      .slice(0, limit);

    // 3. Purchases search
    const allPurchases = await ctx.db
      .query('purchases')
      .withIndex('by_user', (idx) => idx.eq('userId', user._id))
      .collect();

    const matchedPurchases = allPurchases
      .filter(
        (p) =>
          !p.deletedAt &&
          (p.store.toLowerCase().includes(q) ||
            p.product.toLowerCase().includes(q) ||
            (p.orderRef && p.orderRef.toLowerCase().includes(q)))
      )
      .slice(0, limit);

    return {
      cases: matchedCases,
      documents: matchedDocs,
      purchases: matchedPurchases,
    };
  },
});

