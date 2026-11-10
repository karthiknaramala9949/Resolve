'use client';

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
      toast('JSON backup exported.', 'success');
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
      toast('ZIP archive exported.', 'success');
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

        toast('All local records wiped.', 'info');
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
      toast('AES-256-GCM encryption enabled.', 'success');
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
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-normal mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Zero telemetry & local device ownership</span>
        </div>
        <h2 className="text-2xl font-serif font-medium text-charcoal tracking-tight">
          Privacy & data trust
        </h2>
        <p className="text-xs sm:text-sm text-steel-grey-600 mt-1 max-w-2xl font-normal">
          RESOLVE-ONE is local-first. We do not operate tracking trackers, customer accounts, or cloud databases. Your evidence and dispute data remain strictly on your device.
        </p>
      </div>

      {/* Transparency Panel */}
      <Card variant="elevated" className="p-6 sm:p-7 space-y-4 bg-white border border-steel-grey-200">
        <h3 className="text-base sm:text-lg font-serif font-medium text-charcoal">
          What is stored where
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-1.5">
            <div className="flex items-center gap-2 text-coral font-medium text-xs sm:text-sm">
              <HardDrive className="w-4 h-4" />
              <span>Browser IndexedDB</span>
            </div>
            <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
              Holds your dispute cases, chronological facts, timeline logs, return records, and actual PDF/image evidence binary files.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-800 font-medium text-xs sm:text-sm">
              <EyeOff className="w-4 h-4" />
              <span>Local preferences</span>
            </div>
            <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
              Stored in localStorage: theme and interface preferences. Never transmitted externally.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-800 font-medium text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Remote cloud servers</span>
            </div>
            <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
              <strong>Zero.</strong> No personal data, case details, or uploaded receipts are ever transmitted to remote cloud servers.
            </p>
          </div>
        </div>
      </Card>

      {/* Optional Client-Side AES-256-GCM Encryption */}
      <Card variant="default" className="p-6 sm:p-7 space-y-4 bg-white border border-steel-grey-200">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-coral" />
              <h3 className="text-base font-medium text-charcoal">
                Client-side passphrase encryption
              </h3>
            </div>
            <p className="text-xs text-steel-grey-600 max-w-xl font-normal">
              Optionally secure your local storage with an AES-GCM 256-bit key derived via PBKDF2 (100,000 rounds).
            </p>
          </div>

          <span
            className={`shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-normal leading-none ${
              isEncrypted
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-steel-grey-100 text-steel-grey-600 border border-steel-grey-200'
            }`}
          >
            {isEncrypted ? 'Active on device' : 'Unencrypted storage'}
          </span>
        </div>

        {/* Trade-off Warning */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <div className="font-normal">
            <span className="font-medium block mb-0.5">Crucial passphrase note:</span>
            Because RESOLVE-ONE has zero backend servers or user accounts, if you forget your passphrase, your encrypted dispute records cannot be decrypted or recovered by anyone.
          </div>
        </div>

        {!isEncrypted ? (
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Input
              type="password"
              placeholder="Enter master passphrase (min 6 characters)"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="max-w-md"
            />
            <Button variant="primary" className="w-full sm:w-auto shrink-0" onClick={handleEnableEncryption}>
              <Lock className="w-3.5 h-3.5" />
              <span>Enable encryption</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Input
              type="password"
              placeholder="Enter passphrase to unlock & disable"
              value={passphraseInput}
              onChange={(e) => setPassphraseInput(e.target.value)}
              className="max-w-md"
            />
            <Button variant="outline" className="w-full sm:w-auto shrink-0" onClick={handleDisableEncryption}>
              <Unlock className="w-3.5 h-3.5" />
              <span>Disable encryption</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Export & Data Wipe Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="default" className="p-5 sm:p-6 space-y-3 bg-white border border-steel-grey-200">
          <h3 className="text-base font-medium text-charcoal flex items-center gap-2">
            <Download className="w-4 h-4 text-steel-grey-500 shrink-0" />
            <span>Export data package</span>
          </h3>
          <p className="text-xs text-steel-grey-600 font-normal">
            Download a portable, unencrypted JSON backup of all your cases, timeline logs, and evidence records.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 pt-1">
            <Button variant="secondary" size="md" className="w-full sm:w-auto" onClick={handleExportAll}>
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </Button>
            <Button variant="outline" size="md" className="w-full sm:w-auto" onClick={handleExportZip}>
              <Download className="w-3.5 h-3.5" />
              <span>Export ZIP archive</span>
            </Button>
          </div>
        </Card>

        <Card variant="default" className="p-5 sm:p-6 space-y-3 bg-white border border-coral-200">
          <h3 className="text-base font-medium text-coral-700 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Delete local data</span>
          </h3>
          <p className="text-xs text-steel-grey-600 font-normal">
            Immediately purges all IndexedDB records, evidence files, purchases, and settings from this browser.
          </p>
          <Button variant="danger" size="md" onClick={handleWipeAll}>
            <span>Wipe all records</span>
          </Button>
        </Card>
      </div>
    </div>
  );
};
