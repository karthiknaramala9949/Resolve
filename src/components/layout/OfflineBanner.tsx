import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
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

  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 py-1.5 px-4 text-xs font-medium text-center flex items-center justify-center gap-2 transition-colors ${
        isOnline
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-600 text-white'
      }`}
    >
      {isOnline ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>Connection restored. RESOLVE-ONE operates seamlessly offline and online.</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You are offline. All cases, evidence, and actions continue saving locally on your device.</span>
        </>
      )}
    </div>
  );
};

