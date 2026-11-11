import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Doc, Id } from './_generated/dataModel';

/**
 * Generate a secure upload URL for storing encrypted file blobs.
 */
export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user before issuing upload URL
    await getAuthenticatedUser(ctx, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Register an uploaded document's cryptographic metadata.
 */
export const registerDocument = mutation({
  args: {
    sessionToken: v.string(),
    storageId: v.string(),
    name: v.string(),
    mime: v.string(),
    size: v.number(),
    sha256: v.string(),
    caseId: v.optional(v.union(v.string(), v.null())),
    folderId: v.optional(v.union(v.string(), v.null())),
    isEncrypted: v.boolean(),
    encryptedKey: v.optional(v.string()), // E2EE wrapped DEK
    iv: v.optional(v.string()), // AES-GCM IV (hex)
    salt: v.optional(v.string()),
    redactionHint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    const now = new Date().toISOString();

    let resolvedCaseId: Id<'cases'> | null = null;
    if (args.caseId) {
      try {
        resolvedCaseId = args.caseId as Id<'cases'>;
      } catch {
        // Fallback: lookup by clientGeneratedId
        const c = await ctx.db
          .query('cases')
          .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.caseId!))
          .first();
        if (c && c.userId === user._id) {
          resolvedCaseId = c._id;
        }
      }
    }

    const docId = await ctx.db.insert('documents', {
      userId: user._id,
      caseId: resolvedCaseId,
      folderId: args.folderId ? (args.folderId as Id<'folders'>) : null,
      name: args.name.trim(),
      mime: args.mime,
      size: args.size,
      sha256: args.sha256,
      storageId: args.storageId,
      isEncrypted: args.isEncrypted,
      encryptedKey: args.encryptedKey,
      iv: args.iv,
      salt: args.salt,
      version: 1,
      isArchived: false,
      redactionHint: args.redactionHint,
      createdAt: now,
      updatedAt: now,
    });

    // If attached to a case, also append to the case's evidence list
    if (resolvedCaseId) {
      const parentCase = await ctx.db.get(resolvedCaseId);
      if (parentCase && parentCase.userId === user._id) {
        const evidenceItem = {
          id: `EV-${Date.now().toString().slice(-4)}`,
          name: args.name,
          mime: args.mime,
          size: args.size,
          source: 'customer_upload',
          addedAt: now,
          sha256: args.sha256,
          redactionHint: args.redactionHint,
          storageId: args.storageId,
          encryptedKey: args.encryptedKey,
          iv: args.iv,
        };

        const updatedEvidence = [...(parentCase.evidence || []), evidenceItem];
        const newTimelineEvent = {
          id: `EV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          at: now,
          title: `Attached evidence: ${args.name}`,
          detail: `File uploaded with SHA-256 fingerprint: ${args.sha256.slice(0, 16)}...`,
          source: 'evidence',
        };

        await ctx.db.patch(parentCase._id, {
          evidence: updatedEvidence,
          timeline: [...parentCase.timeline, newTimelineEvent],
          updatedAt: now,
          version: parentCase.version + 1,
        });
      }
    }

    // Activity log
    await ctx.db.insert('activityLogs', {
      userId: user._id,
      entityType: 'document',
      entityId: docId,
      action: 'upload',
      details: `Uploaded encrypted document: ${args.name} (${args.size} bytes)`,
      timestamp: now,
    });

    return await ctx.db.get(docId);
  },
});

/**
 * List documents for authenticated user.
 */
export const list = query({
  args: {
    sessionToken: v.string(),
    caseId: v.optional(v.string()),
    folderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    let docs = await ctx.db
      .query('documents')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    docs = docs.filter((d) => !d.deletedAt);

    if (args.caseId) {
      docs = docs.filter((d) => d.caseId === args.caseId);
    }

    if (args.folderId) {
      docs = docs.filter((d) => d.folderId === args.folderId);
    }

    docs.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    return docs;
  },
});

/**
 * Get secure download URL and encryption metadata for a document.
 */
export const getDownloadUrl = query({
  args: {
    sessionToken: v.string(),
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    const doc = await ctx.db.get(args.documentId as Id<'documents'>);
    if (!doc || doc.userId !== user._id || doc.deletedAt) {
      throw new Error('Document not found or permission denied.');
    }

    const downloadUrl = await ctx.storage.getUrl(doc.storageId as Id<'_storage'>);
    if (!downloadUrl) {
      throw new Error('Document storage record expired or unavailable.');
    }

    return {
      downloadUrl,
      document: doc,
    };
  },
});

/**
 * Rename document.
 */
export const rename = mutation({
  args: {
    sessionToken: v.string(),
    documentId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    const doc = await ctx.db.get(args.documentId as Id<'documents'>);
    if (!doc || doc.userId !== user._id) {
      throw new Error('Document not found or permission denied.');
    }

    const now = new Date().toISOString();
    await ctx.db.patch(doc._id, {
      name: args.newName.trim(),
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Delete a document.
 */
export const deleteDocument = mutation({
  args: {
    sessionToken: v.string(),
    documentId: v.string(),
    permanent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);

    const doc = await ctx.db.get(args.documentId as Id<'documents'>);
    if (!doc || doc.userId !== user._id) {
      throw new Error('Document not found or permission denied.');
    }

    const now = new Date().toISOString();
    if (args.permanent) {
      try {
        await ctx.storage.delete(doc.storageId as Id<'_storage'>);
      } catch {
        // Storage record may already be cleaned up
      }
      await ctx.db.delete(doc._id);
    } else {
      await ctx.db.patch(doc._id, {
        deletedAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert('activityLogs', {
      userId: user._id,
      entityType: 'document',
      entityId: doc._id,
      action: 'delete',
      details: `Deleted document ${doc.name}`,
      timestamp: now,
    });

    return { success: true };
  },
});

