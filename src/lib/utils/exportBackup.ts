import { caseService, purchaseService, reminderService } from '@/services';
import {
  encryptDocument,
  decryptDocument,
  getActiveMasterKey,
  setupUserMasterKey,
  calculateSHA256,
  bufferToHex,
  hexToBuffer,
} from '@/lib/crypto/e2ee';
import { validateImportPayload } from '@/lib/rules/fileValidator';

export interface EncryptedBackupBundle {
  format: 'RESOLVE-ENCRYPTED-BACKUP-V1';
  exportedAt: string;
  sha256: string;
  ivHex: string;
  dekIvHex: string;
  wrappedDekHex: string;
  ciphertextHex: string;
}

/**
 * Standard unencrypted client-side export of local dispute records.
 */
export async function exportFullBackup(): Promise<void> {
  const [cases, purchases, reminders] = await Promise.all([
    caseService.listCases(),
    purchaseService.listPurchases(),
    reminderService.listReminders(),
  ]);

  const exportBundle = {
    app: 'RESOLVE-ONE',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    disclaimer: 'Unencrypted client-side export of local dispute records.',
    data: {
      cases,
      purchases,
      reminders,
    },
  };

  const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `RESOLVE-ONE-Backup-${new Date().toISOString().slice(0, 10)}.json`);
}

/**
 * Zero-Knowledge Encrypted Backup Export (J-12).
 * Encrypts the entire export bundle client-side using the User's Master Key before writing to disk.
 */
export async function exportEncryptedBackup(passphrase?: string): Promise<void> {
  const [cases, purchases, reminders] = await Promise.all([
    caseService.listCases(),
    purchaseService.listPurchases(),
    reminderService.listReminders(),
  ]);

  const rawBundle = {
    app: 'RESOLVE-ONE',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    data: { cases, purchases, reminders },
  };

  const jsonString = JSON.stringify(rawBundle);
  const enc = new TextEncoder();
  const rawBytes = enc.encode(jsonString);

  let key = getActiveMasterKey();
  if (!key && passphrase) {
    const setup = await setupUserMasterKey(passphrase);
    key = setup.masterKey;
  }

  if (!key) {
    throw new Error('E2EE vault must be unlocked or passphrase provided to generate an encrypted backup.');
  }

  const encrypted = await encryptDocument(rawBytes.buffer, key);
  const ciphertextHex = bufferToHex(encrypted.ciphertext);

  const encryptedBackup: EncryptedBackupBundle = {
    format: 'RESOLVE-ENCRYPTED-BACKUP-V1',
    exportedAt: new Date().toISOString(),
    sha256: encrypted.sha256Hex,
    ivHex: encrypted.ivHex,
    dekIvHex: encrypted.dekIvHex,
    wrappedDekHex: encrypted.wrappedDekHex,
    ciphertextHex,
  };

  const blob = new Blob([JSON.stringify(encryptedBackup, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `RESOLVE-ONE-EncryptedBackup-${new Date().toISOString().slice(0, 10)}.resenc`);
}

/**
 * Decrypts and restores an encrypted backup file.
 */
export async function decryptAndRestoreBackup(
  backupJson: string,
  masterKey: CryptoKey
): Promise<any> {
  const parsed = JSON.parse(backupJson) as EncryptedBackupBundle;
  if (parsed.format !== 'RESOLVE-ENCRYPTED-BACKUP-V1') {
    throw new Error('Invalid backup format: missing RESOLVE-ENCRYPTED-BACKUP-V1 signature.');
  }

  const ciphertext = hexToBuffer(parsed.ciphertextHex).buffer;
  const decryptedBytes = await decryptDocument(
    ciphertext,
    parsed.wrappedDekHex,
    parsed.ivHex,
    parsed.dekIvHex,
    parsed.sha256,
    masterKey
  );

  const dec = new TextDecoder();
  const json = dec.decode(decryptedBytes);
  const payload = JSON.parse(json);

  const validation = validateImportPayload(payload);
  if (!validation.valid || !validation.data) {
    throw new Error(validation.error || 'Decrypted backup payload failed schema validation.');
  }

  return validation.data;
}

function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
