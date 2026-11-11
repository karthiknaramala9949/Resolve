/**
 * Client-Side Document Security Manager
 *
 * Coordinates Client-Side E2EE, Convex Encrypted File Storage,
 * and IndexedDB Local-First Offline Blob Caching.
 */

import { evidenceRepository } from '@/lib/db/repositories';
import {
  encryptDocument,
  decryptDocument,
  getActiveMasterKey,
  setupUserMasterKey,
  setActiveMasterKey,
  calculateSHA256,
} from './e2ee';
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { api } from '../../../convex/_generated/api';

export interface UploadOptions {
  file: File;
  caseId?: string;
  folderId?: string;
  sessionToken?: string | null;
  redactionHint?: string;
}

export interface UploadResult {
  evidenceId: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
  storageId?: string;
  isEncrypted: boolean;
}

/**
 * Ensures a User Master Key is active. If not yet initialized, creates a default key for session.
 */
export async function ensureActiveMasterKey(): Promise<CryptoKey> {
  let masterKey = getActiveMasterKey();
  if (!masterKey) {
    // Generate session fallback master key if user hasn't explicitly entered a passphrase
    const defaultPassphrase =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('resolve-one-e2ee-session-pass') || 'resolve-local-device-key-default'
        : 'resolve-local-device-key-default';

    const { masterKey: generated } = await setupUserMasterKey(defaultPassphrase);
    setActiveMasterKey(generated);
    masterKey = generated;
  }
  return masterKey;
}

/**
 * Encrypts a document client-side and uploads the ciphertext to Convex file storage.
 * Also caches the file locally in IndexedDB for instant offline availability.
 */
export async function uploadEncryptedDocument(
  options: UploadOptions
): Promise<UploadResult> {
  const { file, caseId, folderId, sessionToken, redactionHint } = options;

  const newEvId = `EV-${Date.now().toString().slice(-4)}`;
  const arrayBuffer = await file.arrayBuffer();
  const sha256 = await calculateSHA256(arrayBuffer);

  // 1. Save locally in IndexedDB first (Local-First Offline Guarantee)
  await evidenceRepository.saveBlob(file, {
    id: newEvId,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
  });

  let storageId: string | undefined;
  let isEncrypted = false;
  let encryptedKey: string | undefined;
  let ivHex: string | undefined;

  // 2. If online and authenticated, encrypt and upload to Convex Storage
  if (navigator.onLine && sessionToken) {
    try {
      const masterKey = await ensureActiveMasterKey();

      // Client-side AES-256-GCM Envelope Encryption
      const encrypted = await encryptDocument(arrayBuffer, masterKey);
      isEncrypted = true;
      encryptedKey = `${encrypted.dekIvHex}:${encrypted.wrappedDekHex}`;
      ivHex = encrypted.ivHex;

      const convex = getConvexClient();

      // Request secure upload URL from Convex
      const uploadUrl = await convex.mutation(api.documents.generateUploadUrl, {
        sessionToken,
      });

      // Upload encrypted ciphertext buffer
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: encrypted.ciphertext,
      });

      if (uploadResponse.ok) {
        const json = await uploadResponse.json();
        storageId = json.storageId;

        // Register document in Convex
        await convex.mutation(api.documents.registerDocument, {
          sessionToken,
          storageId: storageId!,
          name: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          sha256,
          caseId: caseId || null,
          folderId: folderId || null,
          isEncrypted: true,
          encryptedKey,
          iv: ivHex,
          redactionHint,
        });
      }
    } catch (err) {
      console.warn('[DocumentManager] Convex cloud upload deferred or failed:', err);
      // Failsafe: Local IndexedDB copy exists, so user never loses their evidence!
    }
  }

  return {
    evidenceId: newEvId,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    sha256,
    storageId,
    isEncrypted,
  };
}

/**
 * Downloads and decrypts a document.
 * Tries local IndexedDB cache first; falls back to Convex cloud download + decryption.
 */
export async function downloadAndDecryptDocument(
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
  // 1. Check local IndexedDB first
  const localRecord = await evidenceRepository.getBlob(evidenceId);
  if (localRecord && localRecord.blob) {
    return localRecord.blob;
  }

  // 2. Fetch from Convex Cloud if local blob missing
  if (metadata?.storageId && sessionToken && navigator.onLine) {
    const convex = getConvexClient();
    const downloadData = await convex.query(api.documents.getDownloadUrl, {
      sessionToken,
      documentId: metadata.storageId,
    });

    const response = await fetch(downloadData.downloadUrl);
    if (!response.ok) {
      throw new Error('Failed to download encrypted file from cloud storage.');
    }

    const ciphertextBuffer = await response.arrayBuffer();

    // Decrypt if encrypted
    if (downloadData.document.isEncrypted && downloadData.document.encryptedKey && downloadData.document.iv) {
      const parts = downloadData.document.encryptedKey.split(':');
      const dekIvHex = parts[0];
      const wrappedDekHex = parts[1];

      const masterKey = await ensureActiveMasterKey();
      const decryptedBuffer = await decryptDocument(
        ciphertextBuffer,
        wrappedDekHex,
        downloadData.document.iv,
        dekIvHex,
        downloadData.document.sha256,
        masterKey
      );

      const decryptedBlob = new Blob([decryptedBuffer], {
        type: downloadData.document.mime || 'application/octet-stream',
      });

      // Cache locally in IndexedDB
      await evidenceRepository.saveBlob(decryptedBlob, {
        id: evidenceId,
        name: fileName,
        type: downloadData.document.mime,
        size: decryptedBlob.size,
      });

      return decryptedBlob;
    } else {
      const plaintextBlob = new Blob([ciphertextBuffer], {
        type: downloadData.document.mime,
      });
      return plaintextBlob;
    }
  }

  throw new Error(`File ${fileName} (${evidenceId}) is not available in local storage or cloud.`);
}

