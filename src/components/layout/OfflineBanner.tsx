'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { syncEngine, SyncState } from '@/lib/sync/syncEngine';

export const OfflineBanner: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const unsubscribe = syncEngine.subscribe((state, details) => {
      setSyncState(state);
      setPendingCount(details?.pendingCount || 0);
    });

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!mounted) return null;
  if (isOnline && !showReconnected && syncState !== 'syncing') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 py-1.5 px-4 text-xs font-medium text-center flex items-center justify-center gap-2 transition-colors ${
        !isOnline
          ? 'bg-amber-600 text-white'
          : syncState === 'syncing'
            ? 'bg-blue-600 text-white'
            : 'bg-emerald-600 text-white'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Cases and evidence are saved locally on your device and will sync automatically upon reconnection.</span>
        </>
      ) : syncState === 'syncing' ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing {pendingCount > 0 ? `${pendingCount} item${pendingCount > 1 ? 's' : ''}` : 'updates'} with Convex cloud...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>Connection restored. Local IndexedDB changes synchronized with Convex.</span>
        </>
      )}
    </div>
  );
};


