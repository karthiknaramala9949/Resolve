/**
 * Centralized Dashboard Analytics Service (Convex-First Single Source of Truth)
 *
 * Computes live, persistent statistics directly from Convex backend database.
 */

import { Case, Reminder } from '@/lib/db/types';
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { ensureSessionToken } from '@/lib/auth/sessionToken';
import { api } from '../../convex/_generated/api';

export interface DashboardStats {
  activeCount: number;
  actionRequiredCount: number;
  waitingCompanyCount: number;
  resolvedCount: number;
  totalClaimAmount: number;
  recentCases: Case[];
  upcomingReminders: Reminder[];
}

function mapConvexCaseToAppCase(doc: any): Case {
  return {
    id: doc.clientGeneratedId || doc._id,
    title: doc.title,
    issueType: doc.issueType,
    company: doc.company,
    orderRef: doc.orderRef,
    product: doc.product,
    amount: doc.amount,
    purchasedAt: doc.purchasedAt,
    desiredOutcome: doc.desiredOutcome,
    description: doc.description,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    nextAction: doc.nextAction,
    nextStepReason: doc.nextStepReason,
    claimedOutcome: doc.claimedOutcome,
    customerConfirmedOutcome: doc.customerConfirmedOutcome,
    threeStateOutcome: doc.threeStateOutcome,
    evidence: doc.evidence || [],
    timeline: doc.timeline || [],
    tags: doc.tags || [],
    assignee: doc.assignee,
    customerNotes: doc.customerNotes,
  };
}

function mapConvexReminderToAppReminder(doc: any): Reminder {
  return {
    id: doc.clientGeneratedId || doc._id,
    caseId: doc.caseId,
    title: doc.title,
    date: doc.date,
    done: doc.done,
    createdAt: doc.createdAt,
  };
}

export const dashboardService = {
  /**
   * Computes accurate summary metrics directly from persistent Convex user records.
   */
  async getStats(): Promise<DashboardStats> {
    const fallbackStats: DashboardStats = {
      activeCount: 0,
      actionRequiredCount: 0,
      waitingCompanyCount: 0,
      resolvedCount: 0,
      totalClaimAmount: 0,
      recentCases: [],
      upcomingReminders: [],
    };

    try {
      const sessionToken = await ensureSessionToken();
      if (!sessionToken || sessionToken === 'default-session-token') {
        return fallbackStats;
      }
      const convex = getConvexClient();
      const stats = await convex.query(api.dashboard.getStats, { sessionToken });
      if (!stats) return fallbackStats;

      return {
        activeCount: stats.activeCount ?? 0,
        actionRequiredCount: stats.actionRequiredCount ?? 0,
        waitingCompanyCount: stats.waitingCompanyCount ?? 0,
        resolvedCount: stats.resolvedCount ?? 0,
        totalClaimAmount: stats.totalClaimAmount ?? 0,
        recentCases: (stats.recentCases || []).map(mapConvexCaseToAppCase),
        upcomingReminders: (stats.upcomingReminders || []).map(mapConvexReminderToAppReminder),
      };
    } catch (err) {
      console.warn('[DashboardService] Deferred query (offline or unauthenticated):', err);
      return fallbackStats;
    }
  },
};
