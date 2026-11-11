import { query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';

export const getStats = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let cases = await ctx.db
      .query('cases')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    cases = cases.filter((c) => !c.deletedAt && !c.isArchived);

    const activeCount = cases.filter(
      (c) => c.status !== 'resolved' && c.status !== 'closed'
    ).length;
    const actionRequiredCount = cases.filter((c) => c.status === 'action_required').length;
    const waitingCompanyCount = cases.filter((c) => c.status === 'waiting_company').length;
    const resolvedCount = cases.filter((c) => c.status === 'resolved').length;

    // Total disputed amount
    let totalClaimAmount = 0;
    for (const c of cases) {
      if (typeof c.amount === 'number' && !isNaN(c.amount)) {
        totalClaimAmount += c.amount;
      }
    }

    // Recent cases
    cases.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    const recentCases = cases.slice(0, 5);

    // Pending reminders
    let reminders = await ctx.db
      .query('reminders')
      .withIndex('by_user_done', (q) => q.eq('userId', user._id).eq('done', false))
      .take(5);

    return {
      activeCount,
      actionRequiredCount,
      waitingCompanyCount,
      resolvedCount,
      totalClaimAmount,
      recentCases,
      upcomingReminders: reminders,
    };
  },
});

