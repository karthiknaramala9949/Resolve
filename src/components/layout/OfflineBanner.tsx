/**
 * Network Connectivity Banner
 *
 * Provides clear, truthful network status feedback to the user.
 * In a Convex-first architecture, persistent operations require an active network connection.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

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
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!mounted) return null;
  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 py-1.5 px-4 text-xs font-medium text-center flex items-center justify-center gap-2 transition-colors ${
        !isOnline ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You are currently offline. Changes will save once your connection to Convex cloud is restored.</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>Connection restored. Convex backend is live.</span>
        </>
      )}
    </div>
  );
};
