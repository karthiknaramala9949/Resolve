'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Download, Home, AlertCircle } from 'lucide-react';
import { Button } from '@/design-system';
import { exportFullBackup } from '@/lib/utils/exportBackup';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  const handleExportBackup = async () => {
    try {
      await exportFullBackup();
    } catch {
      alert('Could not export backup. Please reload the page.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6 text-charcoal">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 border border-steel-grey-200 shadow-sm text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-serif font-medium text-charcoal tracking-tight">
            Something went wrong
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
            An unexpected error occurred while loading this page. Your saved records on this device are safe.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try again</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleExportBackup}
            className="w-full flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download backup of your records</span>
          </Button>

          <Link href="/app/overview" className="w-full">
            <Button variant="secondary" size="md" className="w-full flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              <span>Go to your workspace</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

