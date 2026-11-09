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

import React, { useEffect } from 'react';
import '@/lib/i18n';
import { detectV1Data, migrateV1Data, initializeDatabaseWithSampleData } from '@/lib/migrate/v1Migrator';

export const DatabaseBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    async function bootstrap() {
      try {
        const hasV1 = await detectV1Data();
        if (hasV1) {
          await migrateV1Data();
        } else {
          await initializeDatabaseWithSampleData();
        }
      } catch (err) {
        console.error('Database bootstrap error:', err);
      }
    }

    bootstrap();
  }, []);

  return <>{children}</>;
};
