import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, X, ShieldAlert } from 'lucide-react';
import { exportFullBackup } from '@/lib/utils/exportBackup';
import { useToast } from '@/design-system';

export const StoragePersistenceBanner: React.FC = () => {
  const { toast } = useToast();
  const [showPersistenceWarning, setShowPersistenceWarning] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkPersistence() {
      try {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
          const isPersisted = await navigator.storage.persisted();
          if (!isPersisted) {
            const granted = await navigator.storage.persist();
            if (!granted && isMounted) {
              setShowPersistenceWarning(true);
            }
          }
        } else if (isMounted) {
          setShowPersistenceWarning(true);
        }
      } catch {
        if (isMounted) setShowPersistenceWarning(true);
      }

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
    }

    checkPersistence();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExport = async () => {
    try {
      await exportFullBackup();
      localStorage.setItem('resolve-one-last-backup-prompt', String(Date.now()));
      setShowBackupReminder(false);
      setShowPersistenceWarning(false);
      toast('Backup exported successfully! Keep this file in your downloads.', 'success');
    } catch (err: any) {
      toast(`Export failed: ${err.message}`, 'error');
    }
  };

  const dismissBackup = () => {
    localStorage.setItem('resolve-one-last-backup-prompt', String(Date.now()));
    setShowBackupReminder(false);
  };

  if (!showPersistenceWarning && !showBackupReminder) {
    return null;
  }

  return (
    <aside
      aria-label="Storage status and backup notification"
      className="bg-amber-500 text-neutral-950 px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 border-b border-amber-600/30 select-none"
    >
      <div className="flex items-center gap-2">
        {showPersistenceWarning ? (
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-950" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-950" />
        )}
        <span>
          {showPersistenceWarning
            ? 'Browser storage is not persistent. Your browser may delete saved evidence if device storage runs low.'
            : '14-Day Backup Reminder: Save an offline copy of your dispute records and evidence.'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-950 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Backup</span>
        </button>

        <button
          type="button"
          onClick={showPersistenceWarning ? () => setShowPersistenceWarning(false) : dismissBackup}
          className="p-1 text-neutral-950/70 hover:text-neutral-950 rounded hover:bg-amber-600/20 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

