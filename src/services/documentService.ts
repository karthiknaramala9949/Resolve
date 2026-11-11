/**
 * Centralized Document Management Service (Convex-First Single Source of Truth)
 *
 * Coordinates client-side cryptographic envelope encryption,
 * Convex encrypted file storage, and encrypted document metadata.
 * IndexedDB blob caching has been removed in favor of authoritative Convex persistence.
 */

import {
  uploadEncryptedDocument,
  downloadAndDecryptDocument,
  UploadOptions,
  UploadResult,
} from '@/lib/crypto/documentManager';
import { caseService } from './caseService';
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { ensureSessionToken } from '@/lib/auth/sessionToken';
import { api } from '../../convex/_generated/api';

export const documentService = {
  /**
   * Encrypts client-side and uploads a file to Convex secure storage.
   */
  async uploadDocument(options: UploadOptions): Promise<UploadResult> {
    return uploadEncryptedDocument(options);
  },

  /**
   * Downloads from Convex storage and decrypts client-side, returning a ready-to-view Blob.
   */
  async downloadDocument(
    evidenceId: string,
    fileName: string,
    metadata?: {
      storageId?: string;
      encryptedKey?: string;
      iv?: string;
      sha256?: string;
    },
    sessionToken?: string | null
  ): Promise<Blob> {
    return downloadAndDecryptDocument(evidenceId, fileName, metadata, sessionToken);
  },

  /**
   * Deletes an evidence document from a case and permanently removes it from Convex cloud storage.
   */
  async deleteDocument(
    caseId: string,
    evidenceId: string,
    storageId?: string,
    sessionToken?: string | null
  ): Promise<void> {
    const token = sessionToken || (await ensureSessionToken());

    // 1. Detach from case in Convex
    await caseService.removeEvidence(caseId, evidenceId);

    // 2. Permanently delete from Convex file storage & document registry
    if (storageId) {
      try {
        const convex = getConvexClient();
        await convex.mutation(api.documents.deleteDocument, {
          sessionToken: token,
          documentId: storageId,
          permanent: true,
        });
      } catch (err) {
        console.warn('[DocumentService] Cloud document deletion deferred or not found:', err);
      }
    }
  },
};
