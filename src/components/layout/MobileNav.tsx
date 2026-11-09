'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import {
  Home,
  FolderKanban,
  FileText,
  Plus,
  Menu,
  ShoppingBag,
  HelpCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { BottomSheet } from '@/design-system/components/BottomSheet';

export const MobileNav: React.FC = () => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { activeCaseCount } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleMoreNavigation = (to: string) => {
    setIsMoreOpen(false);
    router.push(to);
  };

  const isHomeActive = pathname === '/app/overview';
  const isCasesActive = pathname?.startsWith('/app/cases');
  const isDocsActive = pathname?.startsWith('/app/documents');

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 px-2 py-1 flex items-center justify-around select-none pb-safe"
      >
        {/* 1. Home */}
        <Link
          href="/app/overview"
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-xs font-medium transition-colors',
            isHomeActive
              ? 'text-brand-600 dark:text-brand-400 font-semibold'
              : 'text-neutral-500 dark:text-neutral-400'
          )}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </Link>

        {/* 2. Cases */}
        <Link
          href="/app/cases"
          className={cn(
            'relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-xs font-medium transition-colors',
            isCasesActive
              ? 'text-brand-600 dark:text-brand-400 font-semibold'
              : 'text-neutral-500 dark:text-neutral-400'
          )}
        >
          <FolderKanban className="w-5 h-5 mb-0.5" />
          <span>Cases</span>
          {activeCaseCount > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-bold inline-flex items-center justify-center leading-none select-none">
              {activeCaseCount}
            </span>
          )}
        </Link>

        {/* 3. Center Action: + New Case */}
        <button
          type="button"
          onClick={() => router.push('/app/cases?new=true')}
          className="flex flex-col items-center justify-center -mt-4 w-12 h-12 rounded-full bg-brand-500 text-white shadow-elevated hover:bg-brand-600 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 shrink-0"
          aria-label="Create new dispute case"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* 4. Documents */}
        <Link
          href="/app/documents"
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-xs font-medium transition-colors',
            isDocsActive
              ? 'text-brand-600 dark:text-brand-400 font-semibold'
              : 'text-neutral-500 dark:text-neutral-400'
          )}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>Proof</span>
        </Link>

        {/* 5. More menu trigger */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Bottom Sheet */}
      <BottomSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="More Features"
        description="Purchases, rights guides, reminders, and data settings."
      >
        <div className="grid grid-cols-2 gap-3 py-2">
          <button
            type="button"
            onClick={() => handleMoreNavigation('/app/purchases')}
            className="flex flex-col items-start p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-surface-light-subtle dark:bg-surface-dark-subtle hover:border-brand-300 text-left transition-colors"
          >
            <ShoppingBag className="w-6 h-6 text-brand-500 mb-2" />
            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Purchases</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Orders & return countdown</span>
          </button>

          <button
            type="button"
            onClick={() => handleMoreNavigation('/app/help')}
            className="flex flex-col items-start p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-surface-light-subtle dark:bg-surface-dark-subtle hover:border-brand-300 text-left transition-colors"
          >
            <HelpCircle className="w-6 h-6 text-blue-500 mb-2" />
            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Help & Rights</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">NCH 1915 & e-Jagriti</span>
          </button>

          <button
            type="button"
            onClick={() => handleMoreNavigation('/app/reminders')}
            className="flex flex-col items-start p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-surface-light-subtle dark:bg-surface-dark-subtle hover:border-brand-300 text-left transition-colors"
          >
            <Clock className="w-6 h-6 text-amber-500 mb-2" />
            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Reminders</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Follow-up schedule</span>
          </button>

          <button
            type="button"
            onClick={() => handleMoreNavigation('/app/privacy')}
            className="flex flex-col items-start p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-surface-light-subtle dark:bg-surface-dark-subtle hover:border-brand-300 text-left transition-colors"
          >
            <ShieldCheck className="w-6 h-6 text-emerald-500 mb-2" />
            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Privacy & Data</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Export & zero-telemetry</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
