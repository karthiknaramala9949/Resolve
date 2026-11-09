'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { Search, Shield } from 'lucide-react';

export const Header: React.FC = () => {
  const { openCommandPalette } = useAppStore();
  const pathname = usePathname();

  const getPageTitle = () => {
    const path = pathname || '';
    if (path.includes('/app/overview')) return 'Overview';
    if (path.includes('/app/cases')) return 'My Cases';
    if (path.includes('/app/documents')) return 'Documents & Proof';
    if (path.includes('/app/purchases')) return 'Purchases & Protection';
    if (path.includes('/app/help')) return 'Rights & Official Routes';
    if (path.includes('/app/reminders')) return 'Reminders';
    if (path.includes('/app/privacy')) return 'Privacy & Data Trust';
    return 'RESOLVE-ONE';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3.5 bg-white/95 backdrop-blur-md border-b border-steel-grey-200 select-none">
      {/* Left: Mobile Brand & Desktop Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link href="/" className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-coral flex items-center justify-center text-white font-bold text-sm font-serif">
            R
          </div>
        </Link>
        <h1 className="text-lg md:text-xl font-bold text-charcoal font-sans tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center: Command Palette Quick Search Button */}
      <div className="hidden sm:flex items-center">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-steel-grey-200 bg-steel-grey-50 text-xs text-steel-grey-600 hover:border-coral transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-steel-grey-400" />
          <span>Search or jump to...</span>
          <kbd className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-steel-grey-200 text-charcoal font-semibold">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Search trigger & Storage pill */}
      <div className="flex items-center gap-2">
        {/* Search trigger on mobile */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="sm:hidden p-2 text-steel-grey-500 hover:text-charcoal rounded-lg hover:bg-steel-grey-100 transition-colors"
          aria-label="Open search palette"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Local Storage Trust Badge */}
        <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-steel-grey-50 text-[11px] font-semibold text-steel-grey-600 border border-steel-grey-200 leading-none select-none">
          <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>On-device only</span>
        </div>
      </div>
    </header>
  );
};
