import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Doc, Id } from './_generated/dataModel';

const SyncOperationValidator = v.object({
  id: v.string(), // queue op id
  entity: v.string(), // 'cases' | 'purchases' | 'reminders'
  operation: v.string(), // 'create' | 'update' | 'delete'
  clientGeneratedId: v.string(),
  data: v.any(),
  clientTimestamp: v.string(),
});

/**
 * Pushes a batch of offline mutations to Convex with conflict resolution.
 */
export const pushBatch = mutation({
  args: {
    sessionToken: v.string(),
    deviceId: v.optional(v.string()),
    operations: v.array(SyncOperationValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    const results: Array<{
      queueId: string;
      success: boolean;
      entity: string;
      serverId?: string;
      conflict?: boolean;
      message?: string;
    }> = [];

    for (const op of args.operations) {
      try {
        if (op.entity === 'cases') {
          // Find existing case
          const existing = await ctx.db
            .query('cases')
            .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', op.clientGeneratedId))
            .first();

          if (op.operation === 'create') {
            if (existing) {
              // Already synced or duplicate creation
              results.push({
                queueId: op.id,
                success: true,
                entity: op.entity,
                serverId: existing._id,
              });
            } else {
              const d = op.data;
              const newId = await ctx.db.insert('cases', {
                userId: user._id,
                clientGeneratedId: op.clientGeneratedId,
                title: d.title || 'Untitled Case',
                issueType: d.issueType || 'General Complaint',
                company: d.company || 'Unknown Store',
                orderRef: d.orderRef,
                product: d.product,
                amount: d.amount ?? null,
                purchasedAt: d.purchasedAt,
                desiredOutcome: d.desiredOutcome,
                description: d.description || '',
                status: d.status || 'action_required',
                isArchived: d.isArchived || false,
                nextAction: d.nextAction,
                nextStepReason: d.nextStepReason,
                claimedOutcome: d.claimedOutcome,
                customerConfirmedOutcome: d.customerConfirmedOutcome,
                threeStateOutcome: d.threeStateOutcome,
                evidence: d.evidence || [],
                timeline: d.timeline || [],
                tags: d.tags || [],
                customerNotes: d.customerNotes,
                createdAt: d.createdAt || now,
                updatedAt: d.updatedAt || now,
                version: 1,
              });
              results.push({
                queueId: op.id,
                success: true,
                entity: op.entity,
                serverId: newId,
              });
            }
          } else if (op.operation === 'update') {
            if (!existing) {
              // Create if not found
              const d = op.data;
              const newId = await ctx.db.insert('cases', {
                userId: user._id,
                clientGeneratedId: op.clientGeneratedId,
                title: d.title || 'Untitled Case',
                issueType: d.issueType || 'General Complaint',
                company: d.company || 'Unknown Store',
                orderRef: d.orderRef,
                product: d.product,
                amount: d.amount ?? null,
                purchasedAt: d.purchasedAt,
                desiredOutcome: d.desiredOutcome,
                description: d.description || '',
                status: d.status || 'action_required',
                isArchived: d.isArchived || false,
                nextAction: d.nextAction,
                nextStepReason: d.nextStepReason,
                claimedOutcome: d.claimedOutcome,
                customerConfirmedOutcome: d.customerConfirmedOutcome,
                threeStateOutcome: d.threeStateOutcome,
                evidence: d.evidence || [],
                timeline: d.timeline || [],
                tags: d.tags || [],
                customerNotes: d.customerNotes,
                createdAt: d.createdAt || now,
                updatedAt: d.updatedAt || now,
                version: 1,
              });
              results.push({
                queueId: op.id,
                success: true,
                entity: op.entity,
                serverId: newId,
              });
            } else if (existing.userId !== user._id) {
              results.push({
                queueId: op.id,
                success: false,
                entity: op.entity,
                message: 'Unauthorized access to case',
              });
            } else {
              // Conflict detection: Last-Write-Wins check
              if (existing.updatedAt > op.clientTimestamp) {
                // Server is newer! Keep server version but merge timeline
                results.push({
                  queueId: op.id,
                  success: true,
                  conflict: true,
                  entity: op.entity,
                  serverId: existing._id,
                  message: 'Server has newer update; kept server state',
                });
              } else {
                const d = op.data;
                await ctx.db.patch(existing._id, {
                  title: d.title ?? existing.title,
                  issueType: d.issueType ?? existing.issueType,
                  company: d.company ?? existing.company,
                  orderRef: d.orderRef ?? existing.orderRef,
                  product: d.product ?? existing.product,
                  amount: d.amount !== undefined ? d.amount : existing.amount,
                  status: d.status ?? existing.status,
                  isArchived: d.isArchived ?? existing.isArchived,
                  nextAction: d.nextAction ?? existing.nextAction,
                  nextStepReason: d.nextStepReason ?? existing.nextStepReason,
                  claimedOutcome: d.claimedOutcome ?? existing.claimedOutcome,
                  customerConfirmedOutcome:
                    d.customerConfirmedOutcome ?? existing.customerConfirmedOutcome,
                  threeStateOutcome: d.threeStateOutcome ?? existing.threeStateOutcome,
                  evidence: d.evidence ?? existing.evidence,
                  timeline: d.timeline ?? existing.timeline,
                  tags: d.tags ?? existing.tags,
                  customerNotes: d.customerNotes ?? existing.customerNotes,
                  updatedAt: op.clientTimestamp || now,
                  version: existing.version + 1,
                });
                results.push({
                  queueId: op.id,
                  success: true,
                  entity: op.entity,
                  serverId: existing._id,
                });
              }
            }
          } else if (op.operation === 'delete') {
            if (existing && existing.userId === user._id) {
              await ctx.db.patch(existing._id, {
                deletedAt: now,
                updatedAt: now,
              });
            }
            results.push({
              queueId: op.id,
              success: true,
              entity: op.entity,
            });
          }
        } else if (op.entity === 'purchases') {
          const existing = await ctx.db
            .query('purchases')
            .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', op.clientGeneratedId))
            .first();

          if (op.operation === 'create' || op.operation === 'update') {
            const d = op.data;
            if (!existing) {
              const newId = await ctx.db.insert('purchases', {
                userId: user._id,
                clientGeneratedId: op.clientGeneratedId,
                store: d.store || 'Unknown Store',
                product: d.product || 'Unnamed Item',
                orderRef: d.orderRef,
                amount: d.amount ?? null,
                purchaseDate: d.purchaseDate,
                deliveryDate: d.deliveryDate,
                returnWindowDays: d.returnWindowDays || 7,
                warrantyMonths: d.warrantyMonths || 12,
                notes: d.notes,
                serialNo: d.serialNo,
                createdAt: d.createdAt || now,
                updatedAt: d.updatedAt || now,
                version: 1,
              });
              results.push({
                queueId: op.id,
                success: true,
                entity: op.entity,
                serverId: newId,
              });
            } else if (existing.userId === user._id) {
              await ctx.db.patch(existing._id, {
                store: d.store ?? existing.store,
                product: d.product ?? existing.product,
                orderRef: d.orderRef ?? existing.orderRef,
                amount: d.amount !== undefined ? d.amount : existing.amount,
                purchaseDate: d.purchaseDate ?? existing.purchaseDate,
                deliveryDate: d.deliveryDate ?? existing.deliveryDate,
                returnWindowDays: d.returnWindowDays ?? existing.returnWindowDays,
                warrantyMonths: d.warrantyMonths ?? existing.warrantyMonths,
                notes: d.notes ?? existing.notes,
                serialNo: d.serialNo ?? existing.serialNo,
                updatedAt: op.clientTimestamp || now,
                version: existing.version + 1,
              });
              results.push({
                queueId: op.id,
                success: true,
                entity: op.entity,
                serverId: existing._id,
              });
            }
          } else if (op.operation === 'delete') {
            if (existing && existing.userId === user._id) {
              await ctx.db.delete(existing._id);
            }
            results.push({ queueId: op.id, success: true, entity: op.entity });
          }
        } else if (op.entity === 'reminders') {
          const existing = await ctx.db
            .query('reminders')
            .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', op.clientGeneratedId))
            .first();

          if (op.operation === 'create' || op.operation === 'update') {
            const d = op.data;
            if (!existing) {
              const newId = await ctx.db.insert('reminders', {
                userId: user._id,
                clientGeneratedId: op.clientGeneratedId,
                caseId: d.caseId,
                title: d.title || 'Reminder',
                date: d.date || now,
                done: d.done ?? false,
                createdAt: d.createdAt || now,
                updatedAt: d.updatedAt || now,
                version: 1,
              });
              results.push({
                queueId: op.id,
                success: true,
                entity: op.entity,
                serverId: newId,
              });
            } else if (existing.userId === user._id) {
              await ctx.db.patch(existing._id, {
                title: d.title ?? existing.title,
                date: d.date ?? existing.date,
                done: d.done ?? existing.done,
                caseId: d.caseId ?? existing.caseId,
                updatedAt: op.clientTimestamp || now,
                version: existing.version + 1,
              });
              results.push({
                queueId: op.id,
                success: true,
                entity: op.entity,
                serverId: existing._id,
              });
            }
          } else if (op.operation === 'delete') {
            if (existing && existing.userId === user._id) {
              await ctx.db.delete(existing._id);
            }
            results.push({ queueId: op.id, success: true, entity: op.entity });
          }
        }
      } catch (err: any) {
        results.push({
          queueId: op.id,
          success: false,
          entity: op.entity,
          message: err.message,
        });
      }
    }

    return {
      syncedAt: now,
      results,
    };
  },
});

/**
 * Pull all changes updated since a specific timestamp for full bidirectional sync.
 */
export const pullChanges = query({
  args: {
    sessionToken: v.string(),
    sinceTimestamp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let cases = await ctx.db
      .query('cases')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    let purchases = await ctx.db
      .query('purchases')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    let reminders = await ctx.db
      .query('reminders')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    if (args.sinceTimestamp) {
      const since = args.sinceTimestamp;
      cases = cases.filter((c) => c.updatedAt > since);
      purchases = purchases.filter((p) => p.updatedAt > since);
      reminders = reminders.filter((r) => r.updatedAt > since);
    }

    return {
      timestamp: new Date().toISOString(),
      cases,
      purchases,
      reminders,
    };
  },
});

