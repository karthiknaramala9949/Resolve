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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-steel-grey-200 px-2 py-1 flex items-center justify-around select-none pb-safe"
      >
        {/* 1. Home */}
        <Link
          href="/app/overview"
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-xs transition-colors',
            isHomeActive
              ? 'text-coral font-medium'
              : 'text-steel-grey-600 hover:text-charcoal font-normal'
          )}
        >
          <Home className="w-4 h-4 mb-1" />
          <span>Overview</span>
        </Link>

        {/* 2. Cases */}
        <Link
          href="/app/cases"
          className={cn(
            'relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-xs transition-colors',
            isCasesActive
              ? 'text-coral font-medium'
              : 'text-steel-grey-600 hover:text-charcoal font-normal'
          )}
        >
          <FolderKanban className="w-4 h-4 mb-1" />
          <span>Cases</span>
          {activeCaseCount > 0 && (
            <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full bg-coral text-white text-[10px] font-medium inline-flex items-center justify-center leading-none select-none">
              {activeCaseCount}
            </span>
          )}
        </Link>

        {/* 3. Center Action: + New Case */}
        <button
          type="button"
          onClick={() => router.push('/app/cases?new=true')}
          className="flex flex-col items-center justify-center -mt-3 w-11 h-11 rounded-full bg-coral text-white shadow-xs hover:bg-coral-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 shrink-0"
          aria-label="Create new dispute case"
        >
          <Plus className="w-5 h-5 stroke-[2]" />
        </button>

        {/* 4. Documents */}
        <Link
          href="/app/documents"
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-xs transition-colors',
            isDocsActive
              ? 'text-coral font-medium'
              : 'text-steel-grey-600 hover:text-charcoal font-normal'
          )}
        >
          <FileText className="w-4 h-4 mb-1" />
          <span>Proof</span>
        </Link>

        {/* 5. More menu trigger */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-xs text-steel-grey-600 hover:text-charcoal transition-colors font-normal"
        >
          <Menu className="w-4 h-4 mb-1" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Bottom Sheet */}
      <BottomSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="More sections"
        description="Purchases, rights guides, reminders, and data settings"
      >
        <div className="grid grid-cols-2 gap-3 py-2">
          <button
            type="button"
            onClick={() => handleMoreNavigation('/app/purchases')}
            className="flex flex-col items-start p-4 rounded-xl border border-steel-grey-200 bg-steel-grey-50 hover:border-steel-grey-300 text-left transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-coral mb-2" />
            <span className="font-medium text-sm text-charcoal">Purchases</span>
            <span className="text-xs text-steel-grey-500 mt-0.5">Orders & return windows</span>
          </button>

          <button
            type="button"
            onClick={() => handleMoreNavigation('/app/help')}
            className="flex flex-col items-start p-4 rounded-xl border border-steel-grey-200 bg-steel-grey-50 hover:border-steel-grey-300 text-left transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-blue-600 mb-2" />
            <span className="font-medium text-sm text-charcoal">Help & rights</span>
            <span className="text-xs text-steel-grey-500 mt-0.5">NCH 1915 & e-Jagriti</span>
          </button>

          <button
            type="button"
            onClick={() => handleMoreNavigation('/app/reminders')}
            className="flex flex-col items-start p-4 rounded-xl border border-steel-grey-200 bg-steel-grey-50 hover:border-steel-grey-300 text-left transition-colors"
          >
            <Clock className="w-5 h-5 text-amber-600 mb-2" />
            <span className="font-medium text-sm text-charcoal">Reminders</span>
            <span className="text-xs text-steel-grey-500 mt-0.5">Follow-up schedule</span>
          </button>

          <button
            type="button"
            onClick={() => handleMoreNavigation('/app/privacy')}
            className="flex flex-col items-start p-4 rounded-xl border border-steel-grey-200 bg-steel-grey-50 hover:border-steel-grey-300 text-left transition-colors"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" />
            <span className="font-medium text-sm text-charcoal">Privacy & data</span>
            <span className="text-xs text-steel-grey-500 mt-0.5">Export & zero-telemetry</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
