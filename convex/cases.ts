import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Doc, Id } from './_generated/dataModel';

const ThreeStateOutcomeValidator = v.object({
  companyStated: v.optional(
    v.object({
      date: v.optional(v.string()),
      amount: v.optional(v.number()),
      note: v.optional(v.string()),
    })
  ),
  evidenceFound: v.optional(
    v.object({
      date: v.optional(v.string()),
      reference: v.optional(v.string()),
      note: v.optional(v.string()),
    })
  ),
  customerConfirmed: v.optional(
    v.object({
      date: v.optional(v.string()),
      amountReceived: v.optional(v.number()),
      note: v.optional(v.string()),
    })
  ),
});

const TimelineEventValidator = v.object({
  id: v.string(),
  at: v.string(),
  title: v.string(),
  detail: v.string(),
  source: v.string(),
});

const EvidenceMetaValidator = v.object({
  id: v.string(),
  name: v.string(),
  mime: v.string(),
  size: v.number(),
  source: v.string(),
  addedAt: v.string(),
  sha256: v.optional(v.string()),
  redactionHint: v.optional(v.string()),
  storageId: v.optional(v.string()),
  encryptedKey: v.optional(v.string()),
  iv: v.optional(v.string()),
});

/**
 * List all cases for authenticated user with search and filtering.
 */
export const list = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let casesQuery = ctx.db
      .query('cases')
      .withIndex('by_user', (q) => q.eq('userId', user._id));

    let cases = await casesQuery.collect();

    // Exclude soft-deleted cases
    cases = cases.filter((c) => !c.deletedAt);

    // Filter by archived status
    const filterArchived = args.isArchived ?? false;
    cases = cases.filter((c) => Boolean(c.isArchived) === filterArchived);

    // Filter by dispute status
    if (args.status && args.status !== 'all') {
      cases = cases.filter((c) => c.status === args.status);
    }

    // Filter by search query
    if (args.search && args.search.trim() !== '') {
      const q = args.search.toLowerCase().trim();
      cases = cases.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          (c.product && c.product.toLowerCase().includes(q)) ||
          (c.orderRef && c.orderRef.toLowerCase().includes(q)) ||
          (c.clientGeneratedId && c.clientGeneratedId.toLowerCase().includes(q))
      );
    }

    // Sort descending by updatedAt
    cases.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));

    if (args.limit && args.limit > 0) {
      cases = cases.slice(0, args.limit);
    }

    return cases;
  },
});

/**
 * Get case by either Convex ID or clientGeneratedId.
 */
export const getById = query({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    // Try finding by direct ID first
    let foundCase: Doc<'cases'> | null = null;
    try {
      foundCase = await ctx.db.get(args.id as Id<'cases'>);
    } catch {
      // Not a valid Convex Id format, fallback to clientGeneratedId
    }

    if (!foundCase) {
      foundCase = await ctx.db
        .query('cases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.id))
        .first();
    }

    // Validate ownership
    if (!foundCase || foundCase.userId !== user._id || foundCase.deletedAt) {
      return null;
    }

    return foundCase;
  },
});

/**
 * Create a new dispute case.
 */
export const create = mutation({
  args: {
    sessionToken: v.string(),
    clientGeneratedId: v.optional(v.string()),
    title: v.string(),
    issueType: v.string(),
    company: v.string(),
    orderRef: v.optional(v.string()),
    product: v.optional(v.string()),
    amount: v.optional(v.union(v.number(), v.null())),
    purchasedAt: v.optional(v.string()),
    desiredOutcome: v.optional(v.string()),
    description: v.string(),
    status: v.optional(v.string()),
    nextAction: v.optional(v.string()),
    nextStepReason: v.optional(v.string()),
    claimedOutcome: v.optional(v.string()),
    customerConfirmedOutcome: v.optional(v.string()),
    threeStateOutcome: v.optional(ThreeStateOutcomeValidator),
    evidence: v.optional(v.array(EvidenceMetaValidator)),
    timeline: v.optional(v.array(TimelineEventValidator)),
    tags: v.optional(v.array(v.string())),
    customerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const initialTimeline = [
      ...(args.timeline || []),
      {
        id: `EV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        at: now,
        title: 'Case created',
        detail: 'Dispute registered in RESOLVE-ONE platform.',
        source: 'customer',
      },
    ];

    const caseId = await ctx.db.insert('cases', {
      userId: user._id,
      clientGeneratedId: args.clientGeneratedId || `RS-${Date.now().toString().slice(-5)}`,
      title: args.title.trim(),
      issueType: args.issueType,
      company: args.company.trim(),
      orderRef: args.orderRef?.trim() || undefined,
      product: args.product?.trim() || undefined,
      amount: args.amount ?? null,
      purchasedAt: args.purchasedAt || undefined,
      desiredOutcome: args.desiredOutcome || 'Refund',
      description: args.description.trim(),
      status: args.status || 'action_required',
      isArchived: false,
      nextAction: args.nextAction || undefined,
      nextStepReason: args.nextStepReason || undefined,
      claimedOutcome: args.claimedOutcome || undefined,
      customerConfirmedOutcome: args.customerConfirmedOutcome || undefined,
      threeStateOutcome: args.threeStateOutcome,
      evidence: args.evidence || [],
      timeline: initialTimeline,
      tags: args.tags || [],
      customerNotes: args.customerNotes || undefined,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    // Record activity log
    await ctx.db.insert('activityLogs', {
      userId: user._id,
      entityType: 'case',
      entityId: caseId,
      action: 'create',
      details: `Created dispute against ${args.company}: ${args.title}`,
      timestamp: now,
    });

    const created = await ctx.db.get(caseId);
    return created!;
  },
});

/**
 * Update case details.
 */
export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    title: v.optional(v.string()),
    issueType: v.optional(v.string()),
    company: v.optional(v.string()),
    orderRef: v.optional(v.string()),
    product: v.optional(v.string()),
    amount: v.optional(v.union(v.number(), v.null())),
    purchasedAt: v.optional(v.string()),
    desiredOutcome: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
    nextAction: v.optional(v.string()),
    nextStepReason: v.optional(v.string()),
    claimedOutcome: v.optional(v.string()),
    customerConfirmedOutcome: v.optional(v.string()),
    threeStateOutcome: v.optional(ThreeStateOutcomeValidator),
    evidence: v.optional(v.array(EvidenceMetaValidator)),
    tags: v.optional(v.array(v.string())),
    customerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'cases'> | null = null;
    try {
      existing = await ctx.db.get(args.id as Id<'cases'>);
    } catch {
      // clientGeneratedId fallback
    }

    if (!existing) {
      existing = await ctx.db
        .query('cases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.id))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Case not found or permission denied.');
    }

    const now = new Date().toISOString();
    const patch: any = {
      updatedAt: now,
      version: existing.version + 1,
    };

    if (args.title !== undefined) patch.title = args.title.trim();
    if (args.issueType !== undefined) patch.issueType = args.issueType;
    if (args.company !== undefined) patch.company = args.company.trim();
    if (args.orderRef !== undefined) patch.orderRef = args.orderRef;
    if (args.product !== undefined) patch.product = args.product;
    if (args.amount !== undefined) patch.amount = args.amount;
    if (args.purchasedAt !== undefined) patch.purchasedAt = args.purchasedAt;
    if (args.desiredOutcome !== undefined) patch.desiredOutcome = args.desiredOutcome;
    if (args.description !== undefined) patch.description = args.description;
    if (args.status !== undefined) patch.status = args.status;
    if (args.isArchived !== undefined) patch.isArchived = args.isArchived;
    if (args.nextAction !== undefined) patch.nextAction = args.nextAction;
    if (args.nextStepReason !== undefined) patch.nextStepReason = args.nextStepReason;
    if (args.claimedOutcome !== undefined) patch.claimedOutcome = args.claimedOutcome;
    if (args.customerConfirmedOutcome !== undefined)
      patch.customerConfirmedOutcome = args.customerConfirmedOutcome;
    if (args.threeStateOutcome !== undefined) patch.threeStateOutcome = args.threeStateOutcome;
    if (args.evidence !== undefined) patch.evidence = args.evidence;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.customerNotes !== undefined) patch.customerNotes = args.customerNotes;

    await ctx.db.patch(existing._id, patch);

    // Audit log
    await ctx.db.insert('activityLogs', {
      userId: user._id,
      entityType: 'case',
      entityId: existing._id,
      action: 'update',
      details: `Updated case fields on ${existing.title}`,
      timestamp: now,
    });

    return (await ctx.db.get(existing._id))!;
  },
});

/**
 * Add a timeline event to a case.
 */
export const addTimelineEvent = mutation({
  args: {
    sessionToken: v.string(),
    caseId: v.string(),
    title: v.string(),
    detail: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'cases'> | null = null;
    try {
      existing = await ctx.db.get(args.caseId as Id<'cases'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('cases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.caseId))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Case not found or permission denied.');
    }

    const now = new Date().toISOString();
    const newEvent = {
      id: `EV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      at: now,
      title: args.title.trim(),
      detail: args.detail.trim(),
      source: args.source || 'customer',
    };

    const updatedTimeline = [...existing.timeline, newEvent];

    await ctx.db.patch(existing._id, {
      timeline: updatedTimeline,
      updatedAt: now,
      version: existing.version + 1,
    });

    return newEvent;
  },
});

/**
 * Soft delete or hard delete a case.
 */
export const deleteCase = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    permanent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'cases'> | null = null;
    try {
      existing = await ctx.db.get(args.id as Id<'cases'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('cases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.id))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Case not found or permission denied.');
    }

    const now = new Date().toISOString();

    if (args.permanent) {
      // Clean up linked documents
      const docs = await ctx.db
        .query('documents')
        .withIndex('by_case', (q) => q.eq('caseId', existing._id))
        .collect();
      for (const d of docs) {
        await ctx.db.delete(d._id);
      }
      await ctx.db.delete(existing._id);
    } else {
      // Soft delete
      await ctx.db.patch(existing._id, {
        deletedAt: now,
        updatedAt: now,
        version: existing.version + 1,
      });
    }

    await ctx.db.insert('activityLogs', {
      userId: user._id,
      entityType: 'case',
      entityId: existing._id,
      action: 'delete',
      details: `Dispute deleted (${args.permanent ? 'permanent' : 'soft'})`,
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Archive or restore a case.
 */
export const setArchived = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    isArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'cases'> | null = null;
    try {
      existing = await ctx.db.get(args.id as Id<'cases'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('cases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.id))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Case not found or permission denied.');
    }

    const now = new Date().toISOString();
    await ctx.db.patch(existing._id, {
      isArchived: args.isArchived,
      updatedAt: now,
      version: existing.version + 1,
    });

    return { success: true, isArchived: args.isArchived };
  },
});

/**
 * Add evidence metadata to a case.
 */
export const addEvidence = mutation({
  args: {
    sessionToken: v.string(),
    caseId: v.string(),
    evidence: EvidenceMetaValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'cases'> | null = null;
    try {
      existing = await ctx.db.get(args.caseId as Id<'cases'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('cases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.caseId))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Case not found or permission denied.');
    }

    const now = new Date().toISOString();
    const updatedEvidence = [...(existing.evidence || []), args.evidence];

    await ctx.db.patch(existing._id, {
      evidence: updatedEvidence,
      updatedAt: now,
      version: existing.version + 1,
    });

    return { success: true };
  },
});

/**
 * Remove evidence metadata from a case.
 */
export const removeEvidence = mutation({
  args: {
    sessionToken: v.string(),
    caseId: v.string(),
    evidenceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let existing: Doc<'cases'> | null = null;
    try {
      existing = await ctx.db.get(args.caseId as Id<'cases'>);
    } catch {}

    if (!existing) {
      existing = await ctx.db
        .query('cases')
        .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.caseId))
        .first();
    }

    if (!existing || existing.userId !== user._id) {
      throw new Error('Case not found or permission denied.');
    }

    const now = new Date().toISOString();
    const updatedEvidence = (existing.evidence || []).filter((e) => e.id !== args.evidenceId);

    await ctx.db.patch(existing._id, {
      evidence: updatedEvidence,
      updatedAt: now,
      version: existing.version + 1,
    });

    return { success: true };
  },
});

