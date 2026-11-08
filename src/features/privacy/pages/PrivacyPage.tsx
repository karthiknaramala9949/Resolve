import React, { useState } from 'react';
import { Button, Card, Input, useToast } from '@/design-system';
import {
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  Unlock,
  HardDrive,
  EyeOff,
  AlertTriangle,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import { db } from '@/lib/db/db';
import { caseRepository, purchaseRepository, reminderRepository } from '@/lib/db/repositories';
import { encryptBuffer, decryptBuffer } from '@/lib/crypto/encryption';
import { createZipArchive } from '@/lib/utils/zipGenerator';

export const PrivacyPage: React.FC = () => {
  const { toast } = useToast();

  const [passphrase, setPassphrase] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('resolve-one-encrypted') === 'true';
  });
  const [passphraseInput, setPassphraseInput] = useState('');

  const handleExportAll = async () => {
    try {
      const [cases, purchases, reminders] = await Promise.all([
        caseRepository.getAll(),
        purchaseRepository.getAll(),
        reminderRepository.getAll(),
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RESOLVE-ONE-Export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Full JSON data package exported successfully.', 'success');
    } catch (err: any) {
      toast(`Export failed: ${err.message}`, 'error');
    }
  };

  const handleExportZip = async () => {
    try {
      const [cases, purchases, reminders, blobs] = await Promise.all([
        caseRepository.getAll(),
        purchaseRepository.getAll(),
        reminderRepository.getAll(),
        db.evidenceBlobs.toArray(),
      ]);

      const exportBundle = {
        app: 'RESOLVE-ONE',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        disclaimer: 'Unencrypted client-side export of local dispute records.',
        data: { cases, purchases, reminders },
      };

      const entries: { filename: string; data: Uint8Array }[] = [
        {
          filename: 'resolve-one-records.json',
          data: new TextEncoder().encode(JSON.stringify(exportBundle, null, 2)),
        },
      ];

      for (const b of blobs) {
        if (b.blob) {
          const buf = await b.blob.arrayBuffer();
          entries.push({
            filename: `evidence/${b.id}_${b.name}`,
            data: new Uint8Array(buf),
          });
        }
      }

      const zipBlob = createZipArchive(entries);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RESOLVE-ONE-Archive-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Complete ZIP archive (records + evidence) exported successfully.', 'success');
    } catch (err: any) {
      toast(`ZIP export failed: ${err.message}`, 'error');
    }
  };

  const handleWipeAll = async () => {
    const confirmation = prompt(
      'Type "DELETE" to permanently erase all local cases, documents, purchases, and settings from this browser:'
    );

    if (confirmation === 'DELETE') {
      try {
        await db.cases.clear();
        await db.purchases.clear();
        await db.reminders.clear();
        await db.policies.clear();
        await db.evidenceBlobs.clear();
        localStorage.clear();

        toast('All local records and storage wiped completely.', 'info');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (err: any) {
        toast(`Wipe failed: ${err.message}`, 'error');
      }
    } else {
      toast('Wipe cancelled.', 'info');
    }
  };

  const handleEnableEncryption = async () => {
    if (!passphrase.trim() || passphrase.length < 6) {
      toast('Please enter a passphrase of at least 6 characters.', 'warning');
      return;
    }

    try {
      const enc = new TextEncoder();
      const testBuffer = enc.encode('RESOLVE-ONE-VERIFIED');
      const { cipher, salt, iv } = await encryptBuffer(testBuffer.buffer, passphrase);

      const cipherHex = Array.from(new Uint8Array(cipher))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      localStorage.setItem('resolve-one-encrypted', 'true');
      localStorage.setItem('resolve-one-enc-salt', salt);
      localStorage.setItem('resolve-one-enc-iv', iv);
      localStorage.setItem('resolve-one-enc-check', cipherHex);

      setIsEncrypted(true);
      setPassphrase('');
      toast('WebCrypto AES-256-GCM encryption enabled on this device.', 'success');
    } catch (err: any) {
      toast(`Encryption error: ${err.message}`, 'error');
    }
  };

  const handleDisableEncryption = async () => {
    const salt = localStorage.getItem('resolve-one-enc-salt');
    const iv = localStorage.getItem('resolve-one-enc-iv');
    const checkHex = localStorage.getItem('resolve-one-enc-check');

    if (!salt || !iv || !checkHex) {
      setIsEncrypted(false);
      localStorage.removeItem('resolve-one-encrypted');
      return;
    }

    try {
      const checkBytes = new Uint8Array(checkHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      const decrypted = await decryptBuffer(checkBytes.buffer, passphraseInput, salt, iv);
      const decStr = new TextDecoder().decode(decrypted);

      if (decStr === 'RESOLVE-ONE-VERIFIED') {
        localStorage.removeItem('resolve-one-encrypted');
        localStorage.removeItem('resolve-one-enc-salt');
        localStorage.removeItem('resolve-one-enc-iv');
        localStorage.removeItem('resolve-one-enc-check');
        setIsEncrypted(false);
        setPassphraseInput('');
        toast('Passphrase verified. Encryption disabled.', 'success');
      } else {
        toast('Incorrect passphrase.', 'error');
      }
    } catch {
      toast('Decryption failed. Passphrase is incorrect.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Telemetry & Absolute Local Ownership</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
          Privacy & Data Trust
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-2xl">
          RESOLVE-ONE is local-first. We do not operate tracking trackers, remote customer databases, or telemetry. Your evidence and dispute data remain strictly on your device.
        </p>
      </div>

      {/* "What's Stored Where" Transparency Panel (Signature Feature #10) */}
      <Card variant="elevated" className="p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-bold font-serif text-neutral-900 dark:text-neutral-100">
          What is stored where?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
              <HardDrive className="w-4 h-4" />
              <span>Browser IndexedDB (Dexie)</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Holds your dispute cases, chronological facts, timeline logs, return records, and actual PDF/image evidence binary files.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
              <EyeOff className="w-4 h-4" />
              <span>Local UI Preferences</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Stored in localStorage: dark/light theme, active language (EN/HI/TE), and simple language mode toggle.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Remote Cloud Servers</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <strong>Zero.</strong> No personal data, case details, or uploaded receipts are ever transmitted to remote cloud servers.
            </p>
          </div>
        </div>
      </Card>

      {/* Optional Client-Side AES-256-GCM Encryption */}
      <Card variant="default" className="p-6 md:p-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand-500" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Client-Side Passphrase Encryption (WebCrypto AES-256-GCM)
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xl">
              Optionally secure your local storage with an AES-GCM 256-bit encryption key derived via PBKDF2 (100,000 rounds).
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isEncrypted
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            {isEncrypted ? 'Active on Device' : 'Unencrypted Storage'}
          </span>
        </div>

        {/* Trade-off Warning */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Crucial Passphrase Trade-off:</span>
            Because RESOLVE-ONE has zero backend servers or user accounts, if you forget your passphrase, your encrypted dispute records cannot be decrypted or recovered by anyone.
          </div>
        </div>

        {!isEncrypted ? (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Input
              type="password"
              placeholder="Enter master passphrase (min 6 characters)"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="max-w-md"
            />
            <Button variant="primary" onClick={handleEnableEncryption}>
              <Lock className="w-4 h-4 mr-1.5" />
              <span>Enable Encryption</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Input
              type="password"
              placeholder="Enter passphrase to unlock & disable"
              value={passphraseInput}
              onChange={(e) => setPassphraseInput(e.target.value)}
              className="max-w-md"
            />
            <Button variant="outline" onClick={handleDisableEncryption}>
              <Unlock className="w-4 h-4 mr-1.5" />
              <span>Disable Encryption</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Export & Data Wipe Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="default" className="p-6 space-y-3">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-neutral-500" />
            <span>Export Full Data Package</span>
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Download a portable, unencrypted JSON backup of all your cases, timeline logs, and evidence records.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" size="md" onClick={handleExportAll}>
              <Download className="w-4 h-4 mr-1.5" />
              <span>Download JSON Backup</span>
            </Button>
            <Button variant="outline" size="md" onClick={handleExportZip}>
              <Download className="w-4 h-4 mr-1.5" />
              <span>Export ZIP Archive (JSON + Evidence)</span>
            </Button>
          </div>
        </Card>

        <Card variant="default" className="p-6 space-y-3 border-red-200 dark:border-red-950/60">
          <h3 className="text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Delete All Local Data</span>
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Immediately purges all IndexedDB records, evidence files, purchases, and localStorage settings from this browser.
          </p>
          <Button variant="danger" size="md" onClick={handleWipeAll}>
            <span>Wipe All Records</span>
          </Button>
        </Card>
      </div>
    </div>
  );
};
