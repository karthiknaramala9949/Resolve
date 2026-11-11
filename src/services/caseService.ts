/**
 * Centralized Dispute Case Service (Convex-First Single Source of Truth)
 *
 * Coordinates dispute case persistence, filtering, timeline events,
 * and evidence management directly through Convex.
 */

import { Case, TimelineEvent, EvidenceMeta } from '@/lib/db/types';
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { ensureSessionToken } from '@/lib/auth/sessionToken';
import { api } from '../../convex/_generated/api';

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

export const caseService = {
  /**
   * Retrieves all cases matching optional filter criteria directly from Convex.
   */
  async listCases(filter?: { status?: string; search?: string }): Promise<Case[]> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const result = await convex.query(api.cases.list, {
      sessionToken,
      status: filter?.status && filter.status !== 'all' ? filter.status : undefined,
      search: filter?.search && filter.search.trim().length > 0 ? filter.search.trim() : undefined,
    });
    return result.map(mapConvexCaseToAppCase);
  },

  /**
   * Retrieves a single case by its identifier from Convex.
   */
  async getCaseById(id: string): Promise<Case | undefined> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const result = await convex.query(api.cases.getById, {
      sessionToken,
      id,
    });
    return result ? mapConvexCaseToAppCase(result) : undefined;
  },

  /**
   * Creates a new consumer dispute case in Convex.
   */
  async createCase(caseData: Omit<Case, 'createdAt' | 'updatedAt'>): Promise<Case> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const result = await convex.mutation(api.cases.create, {
      sessionToken,
      clientGeneratedId: caseData.id,
      title: caseData.title,
      issueType: caseData.issueType,
      company: caseData.company,
      orderRef: caseData.orderRef,
      product: caseData.product,
      amount: caseData.amount,
      purchasedAt: caseData.purchasedAt,
      desiredOutcome: caseData.desiredOutcome,
      description: caseData.description,
      status: caseData.status,
      nextAction: caseData.nextAction,
      nextStepReason: caseData.nextStepReason,
      claimedOutcome: caseData.claimedOutcome,
      customerConfirmedOutcome: caseData.customerConfirmedOutcome,
      threeStateOutcome: caseData.threeStateOutcome,
      evidence: caseData.evidence,
      timeline: caseData.timeline,
      tags: caseData.tags,
      customerNotes: caseData.customerNotes,
    });
    return mapConvexCaseToAppCase(result);
  },

  /**
   * Updates an existing case in Convex.
   */
  async updateCase(id: string, updates: Partial<Case>): Promise<Case> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const result = await convex.mutation(api.cases.update, {
      sessionToken,
      id,
      title: updates.title,
      issueType: updates.issueType,
      company: updates.company,
      orderRef: updates.orderRef,
      product: updates.product,
      amount: updates.amount,
      purchasedAt: updates.purchasedAt,
      desiredOutcome: updates.desiredOutcome,
      description: updates.description,
      status: updates.status,
      nextAction: updates.nextAction,
      nextStepReason: updates.nextStepReason,
      claimedOutcome: updates.claimedOutcome,
      customerConfirmedOutcome: updates.customerConfirmedOutcome,
      threeStateOutcome: updates.threeStateOutcome,
      evidence: updates.evidence,
      tags: updates.tags,
      customerNotes: updates.customerNotes,
    });
    return mapConvexCaseToAppCase(result);
  },

  /**
   * Deletes a case from Convex.
   */
  async deleteCase(id: string): Promise<void> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    await convex.mutation(api.cases.deleteCase, {
      sessionToken,
      id,
      permanent: true,
    });
  },

  /**
   * Appends an event to a case's chronological timeline in Convex.
   */
  async addTimelineEvent(
    caseId: string,
    event: Omit<TimelineEvent, 'id' | 'at'> & { at?: string }
  ): Promise<TimelineEvent> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    return await convex.mutation(api.cases.addTimelineEvent, {
      sessionToken,
      caseId,
      title: event.title,
      detail: event.detail,
      source: event.source,
    });
  },

  /**
   * Attaches evidence file metadata to a case in Convex.
   */
  async addEvidence(caseId: string, meta: EvidenceMeta): Promise<void> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    await convex.mutation(api.cases.addEvidence, {
      sessionToken,
      caseId,
      evidence: meta,
    });
  },

  /**
   * Detaches an evidence item from a case in Convex.
   */
  async removeEvidence(caseId: string, evidenceId: string): Promise<void> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    await convex.mutation(api.cases.removeEvidence, {
      sessionToken,
      caseId,
      evidenceId,
    });
  },

  /**
   * Archives a case in Convex and records the timeline event.
   */
  async archiveCase(id: string): Promise<Case> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const result = await convex.mutation(api.cases.setArchived, {
      sessionToken,
      id,
      isArchived: true,
    });
    return mapConvexCaseToAppCase(result);
  },

  /**
   * Reopens a resolved or closed case for further action in Convex.
   */
  async reopenCase(id: string): Promise<Case> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const result = await convex.mutation(api.cases.update, {
      sessionToken,
      id,
      status: 'action_required',
    });
    await convex.mutation(api.cases.addTimelineEvent, {
      sessionToken,
      caseId: id,
      title: 'Dispute reopened by customer',
      detail: 'Resolution was not completed or fresh defect reported.',
      source: 'customer',
    });
    return mapConvexCaseToAppCase(result);
  },
};
