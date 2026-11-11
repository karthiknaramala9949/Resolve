/**
 * Application Bootstrap Provider
 *
 * Initializes runtime polyfills and internationalization.
 * Legacy local database migrations have been removed in favor of Convex single source of truth.
 */

'use client';

// Polyfill esbuild __name if invoked in strict environments
if (typeof window !== 'undefined' && typeof (window as any).__name === 'undefined') {
  (window as any).__name = (target: any, value: string) => {
    try {
      Object.defineProperty(target, 'name', { value, configurable: true });
    } catch {}
    return target;
  };
}

import React from 'react';
import '@/lib/i18n';

export const DatabaseBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
