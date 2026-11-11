/**
 * Periodic Backup Reminder Banner
 *
 * Recommends downloading a local backup of dispute records and evidence.
 * All authoritative persistent business records are safely managed by Convex.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, ShieldCheck } from 'lucide-react';
import { exportFullBackup } from '@/lib/utils/exportBackup';
import { useToast } from '@/design-system';

export const StoragePersistenceBanner: React.FC = () => {
  const { toast } = useToast();
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 14-day recurring backup check
    try {
      const lastBackup = localStorage.getItem('resolve-one-last-backup-prompt');
      const now = Date.now();
      const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

      if (!lastBackup || now - parseInt(lastBackup, 10) > FOURTEEN_DAYS_MS) {
        if (isMounted) setShowBackupReminder(true);
      }
    } catch {
      // ignore storage errors
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleExport = async () => {
    try {
      await exportFullBackup();
      localStorage.setItem('resolve-one-last-backup-prompt', String(Date.now()));
      setShowBackupReminder(false);
      toast('Backup exported successfully! Keep this file in your downloads.', 'success');
    } catch (err: any) {
      toast(`Export failed: ${err.message}`, 'error');
    }
  };

  const dismissBackup = () => {
    localStorage.setItem('resolve-one-last-backup-prompt', String(Date.now()));
    setShowBackupReminder(false);
  };

  if (!showBackupReminder) {
    return null;
  }

  return (
    <aside
      aria-label="Backup notification"
      className="bg-steel-grey-900 text-white px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 border-b border-steel-grey-800 select-none"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
        <span>
          Your dispute records are securely stored in Convex. You can also download a portable JSON backup for offline archival.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral hover:bg-coral-600 text-white font-medium text-xs transition-colors shadow-2xs leading-none shrink-0"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Download backup</span>
        </button>

        <button
          type="button"
          onClick={dismissBackup}
          aria-label="Dismiss backup reminder"
          className="p-1.5 rounded-lg text-steel-grey-400 hover:text-white hover:bg-steel-grey-800 transition-colors"
        >
          <X className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </aside>
  );
};
