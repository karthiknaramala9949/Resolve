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
import { caseService, purchaseService, reminderService, documentService, authService } from '@/services';
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
        caseService.listCases(),
        purchaseService.listPurchases(),
        reminderService.listReminders(),
      ]);

      const exportBundle = {
        app: 'RESOLVE-ONE',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        disclaimer: 'Export backup of your dispute records.',
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
      toast('Backup downloaded successfully.', 'success');
    } catch (err: any) {
      toast(`Export failed: ${err.message}`, 'error');
    }
  };

  const handleExportZip = async () => {
    try {
      const [cases, purchases, reminders] = await Promise.all([
        caseService.listCases(),
        purchaseService.listPurchases(),
        reminderService.listReminders(),
      ]);

      const exportBundle = {
        app: 'RESOLVE-ONE',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        disclaimer: 'Export backup of your dispute records from Convex.',
        data: { cases, purchases, reminders },
      };

      const entries: { filename: string; data: Uint8Array }[] = [
        {
          filename: 'resolve-one-records.json',
          data: new TextEncoder().encode(JSON.stringify(exportBundle, null, 2)),
        },
      ];

      // Download attached encrypted evidence documents from Convex storage
      for (const c of cases) {
        for (const ev of c.evidence || []) {
          if (ev.storageId) {
            try {
              const blob = await documentService.downloadDocument(ev.id, ev.name, ev);
              const buf = await blob.arrayBuffer();
              entries.push({
                filename: `evidence/${ev.id}_${ev.name}`,
                data: new Uint8Array(buf),
              });
            } catch (err) {
              console.warn(`[ExportZip] Could not retrieve evidence ${ev.id}:`, err);
            }
          }
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
      toast('Archive downloaded successfully.', 'success');
    } catch (err: any) {
      toast(`ZIP export failed: ${err.message}`, 'error');
    }
  };

  const handleWipeAll = async () => {
    const confirmation = prompt(
      'Type "DELETE" to permanently delete all your saved cases, documents, purchases, and settings from Convex:'
    );

    if (confirmation === 'DELETE') {
      try {
        const [cases, purchases, reminders] = await Promise.all([
          caseService.listCases(),
          purchaseService.listPurchases(),
          reminderService.listReminders(),
        ]);

        for (const c of cases) {
          await caseService.deleteCase(c.id);
        }
        for (const p of purchases) {
          await purchaseService.deletePurchase(p.id);
        }
        for (const r of reminders) {
          await reminderService.deleteReminder(r.id);
        }

        localStorage.clear();
        sessionStorage.clear();
        await authService.logout();

        toast('All records deleted from Convex.', 'info');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (err: any) {
        toast(`Delete failed: ${err.message}`, 'error');
      }
    } else {
      toast('Deletion cancelled.', 'info');
    }
  };

  const handleEnableEncryption = async () => {
    if (!passphrase.trim() || passphrase.length < 6) {
      toast('Please enter a password of at least 6 characters.', 'warning');
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
      toast('Personal security password enabled.', 'success');
    } catch (err: any) {
      toast(`Security setup error: ${err.message}`, 'error');
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
        toast('Password verified. Extra protection turned off.', 'success');
      } else {
        toast('Incorrect password.', 'error');
      }
    } catch {
      toast('Incorrect password. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-normal mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Private & on your terms</span>
        </div>
        <h2 className="text-2xl font-serif font-medium text-charcoal tracking-tight">
          Privacy & security
        </h2>
        <p className="text-xs sm:text-sm text-steel-grey-600 mt-1 max-w-2xl font-normal">
          Your dispute data belongs to you. You can use RESOLVE-ONE entirely on this device, or sign in to sync across your devices with strong protection.
        </p>
      </div>

      {/* Transparency Panel */}
      <Card variant="elevated" className="p-6 sm:p-7 space-y-4 bg-white border border-steel-grey-200">
        <h3 className="text-base sm:text-lg font-serif font-medium text-charcoal">
          Where your information is stored
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-1.5">
            <div className="flex items-center gap-2 text-coral font-medium text-xs sm:text-sm">
              <HardDrive className="w-4 h-4" />
              <span>Convex Cloud Backend</span>
            </div>
            <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
              Convex serves as the single source of truth for your dispute cases, timeline notes, return records, and warranty dates.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-800 font-medium text-xs sm:text-sm">
              <EyeOff className="w-4 h-4" />
              <span>Display settings</span>
            </div>
            <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
              Temporary browser state: theme and simplified language preferences. Authoritative business records are never stored in browser databases.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-800 font-medium text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Client-Side E2EE Storage</span>
            </div>
            <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
              Your evidence files and receipts are client-side envelope-encrypted with AES-256-GCM before upload. Neither Convex nor cloud providers can read your documents.
            </p>
          </div>
        </div>
      </Card>

      {/* Extra Password Protection */}
      <Card variant="default" className="p-6 sm:p-7 space-y-4 bg-white border border-steel-grey-200">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-coral" />
              <h3 className="text-base font-medium text-charcoal">
                Extra security password
              </h3>
            </div>
            <p className="text-xs text-steel-grey-600 max-w-xl font-normal">
              Optionally protect your saved files on this device with a personal security password.
            </p>
          </div>

          <span
            className={`shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-normal leading-none ${
              isEncrypted
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-steel-grey-100 text-steel-grey-600 border border-steel-grey-200'
            }`}
          >
            {isEncrypted ? 'Password protected' : 'Standard protection'}
          </span>
        </div>

        {/* Trade-off Warning */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <div className="font-normal">
            <span className="font-medium block mb-0.5">Important note about security passwords:</span>
            If you turn on an extra security password, keep it safe. Because your stored records are protected with advanced security, no one can unlock them without your password.
          </div>
        </div>

        {!isEncrypted ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEnableEncryption();
            }}
            className="flex flex-col sm:flex-row gap-3 pt-1"
          >
            <Input
              type="password"
              placeholder="Enter a security password (min 6 characters)"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="max-w-md"
              autoComplete="new-password"
            />
            <Button type="submit" variant="primary" className="w-full sm:w-auto shrink-0">
              <Lock className="w-3.5 h-3.5" />
              <span>Turn on password</span>
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDisableEncryption();
            }}
            className="flex flex-col sm:flex-row gap-3 pt-1"
          >
            <Input
              type="password"
              placeholder="Enter password to turn off"
              value={passphraseInput}
              onChange={(e) => setPassphraseInput(e.target.value)}
              className="max-w-md"
              autoComplete="current-password"
            />
            <Button type="submit" variant="outline" className="w-full sm:w-auto shrink-0">
              <Unlock className="w-3.5 h-3.5" />
              <span>Turn off password</span>
            </Button>
          </form>
        )}
      </Card>

      {/* Export & Data Wipe Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="default" className="p-5 sm:p-6 space-y-3 bg-white border border-steel-grey-200">
          <h3 className="text-base font-medium text-charcoal flex items-center gap-2">
            <Download className="w-4 h-4 text-steel-grey-500 shrink-0" />
            <span>Download your data</span>
          </h3>
          <p className="text-xs text-steel-grey-600 font-normal">
            Download a copy of all your cases, timeline notes, and evidence records.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 pt-1">
            <Button variant="secondary" size="md" className="w-full sm:w-auto" onClick={handleExportAll}>
              <Download className="w-3.5 h-3.5" />
              <span>Download backup</span>
            </Button>
            <Button variant="outline" size="md" className="w-full sm:w-auto" onClick={handleExportZip}>
              <Download className="w-3.5 h-3.5" />
              <span>Download ZIP archive</span>
            </Button>
          </div>
        </Card>

        <Card variant="default" className="p-5 sm:p-6 space-y-3 bg-white border border-coral-200">
          <h3 className="text-base font-medium text-coral-700 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Delete data from this device</span>
          </h3>
          <p className="text-xs text-steel-grey-600 font-normal">
            Permanently removes all saved cases, receipts, purchases, and settings from this device.
          </p>
          <Button variant="danger" size="md" onClick={handleWipeAll}>
            <span>Delete all records</span>
          </Button>
        </Card>
      </div>
    </div>
  );
};
