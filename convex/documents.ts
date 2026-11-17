import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthenticatedUser } from './authHelper';
import { Doc, Id } from './_generated/dataModel';
import { assertRateLimit } from './rateLimits';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'message/rfc822',
  'application/octet-stream',
] as const;

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
  'txt',
  'csv',
  'doc',
  'docx',
  'eml',
  'msg',
  'bin',
] as const;

/**
 * Generate a secure upload URL for storing encrypted file blobs.
 */
export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user before issuing upload URL
    const { user } = await getAuthenticatedUser(ctx, args.sessionToken);
    await assertRateLimit(ctx, `upload_url:${user._id}`, 30, 10 * 60 * 1000);
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

    // 1. Validate file size (max 15MB)
    if (
      typeof args.size !== 'number' ||
      isNaN(args.size) ||
      args.size <= 0 ||
      args.size > MAX_FILE_SIZE_BYTES
    ) {
      throw new Error(
        `File size must be greater than 0 and at most 15MB (got ${args.size} bytes).`
      );
    }

    // 2. Validate file extension against allowlist
    const rawExt = args.name.split('.').pop()?.toLowerCase() || '';
    if (!rawExt || !ALLOWED_EXTENSIONS.includes(rawExt as any)) {
      throw new Error(
        `File extension '.${rawExt}' is not permitted. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
    }

    // 3. Validate MIME type against allowlist
    if (!ALLOWED_MIME_TYPES.includes(args.mime.toLowerCase() as any)) {
      throw new Error(`MIME type '${args.mime}' is not permitted.`);
    }

    // 4. Validate SHA-256 fingerprint format (64-char hex)
    if (!/^[a-fA-F0-9]{64}$/.test(args.sha256)) {
      throw new Error('Invalid SHA-256 hash fingerprint format.');
    }

    // 5. Verify storage blob existence in Convex storage
    const storageUrl = await ctx.storage.getUrl(args.storageId as Id<'_storage'>);
    if (!storageUrl) {
      throw new Error('Referenced storage blob does not exist or has expired.');
    }

    // Optional metadata check when available
    if (typeof (ctx.storage as any).getMetadata === 'function') {
      const meta = await (ctx.storage as any).getMetadata(args.storageId as Id<'_storage'>);
      if (meta && typeof meta.size === 'number' && meta.size > MAX_FILE_SIZE_BYTES + 65536) {
        throw new Error(`Uploaded blob size exceeds 15MB limit (${meta.size} bytes).`);
      }
    }

    // Verify case ownership if attaching to a case
    let resolvedCaseId: Id<'cases'> | null = null;
    let parentCase: Doc<'cases'> | null = null;
    if (args.caseId) {
      try {
        parentCase = await ctx.db.get(args.caseId as Id<'cases'>);
      } catch {}

      if (!parentCase) {
        parentCase = await ctx.db
          .query('cases')
          .withIndex('by_client_id', (q) => q.eq('clientGeneratedId', args.caseId!))
          .first();
      }

      if (!parentCase || parentCase.userId !== user._id || parentCase.deletedAt) {
        throw new Error('Case not found or permission denied.');
      }
      resolvedCaseId = parentCase._id;
    }

    // Verify folder ownership if attaching to a folder
    let resolvedFolderId: Id<'folders'> | null = null;
    if (args.folderId) {
      try {
        const folder = await ctx.db.get(args.folderId as Id<'folders'>);
        if (!folder || folder.userId !== user._id) {
          throw new Error('Folder not found or permission denied.');
        }
        resolvedFolderId = folder._id;
      } catch (err: any) {
        if (err?.message?.includes('permission denied')) throw err;
        throw new Error('Folder not found or permission denied.');
      }
    }

    // Sanitize filename against path traversal and control characters
    const cleanName = args.name
      .replace(/[\0\r\n\x00-\x1f\x7f]/g, '')
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/[\/\\]/g, '_')
      .trim()
      .slice(0, 255) || 'unnamed_document.bin';

    const docId = await ctx.db.insert('documents', {
      userId: user._id,
      caseId: resolvedCaseId,
      folderId: resolvedFolderId,
      name: cleanName,
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
    if (parentCase && resolvedCaseId) {
      const evidenceItem = {
        id: `EV-${Date.now().toString().slice(-4)}`,
        name: cleanName,
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
        title: `Attached evidence: ${cleanName}`,
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

    let doc: Doc<'documents'> | null = null;
    try {
      doc = await ctx.db.get(args.documentId as Id<'documents'>);
    } catch {}

    if (!doc) {
      doc = await ctx.db
        .query('documents')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .filter((q) => q.eq(q.field('storageId'), args.documentId))
        .first();
    }

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

    let doc: Doc<'documents'> | null = null;
    try {
      doc = await ctx.db.get(args.documentId as Id<'documents'>);
    } catch {}

    if (!doc) {
      doc = await ctx.db
        .query('documents')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .filter((q) => q.eq(q.field('storageId'), args.documentId))
        .first();
    }

    if (!doc || doc.userId !== user._id) {
      throw new Error('Document not found or permission denied.');
    }

    const cleanName = args.newName
      .replace(/[\0\r\n\x00-\x1f\x7f]/g, '')
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/[\/\\]/g, '_')
      .trim() || 'unnamed_document.bin';

    const now = new Date().toISOString();
    await ctx.db.patch(doc._id, {
      name: cleanName,
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

    let doc: Doc<'documents'> | null = null;
    try {
      doc = await ctx.db.get(args.documentId as Id<'documents'>);
    } catch {}

    if (!doc) {
      doc = await ctx.db
        .query('documents')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .filter((q) => q.eq(q.field('storageId'), args.documentId))
        .first();
    }

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

