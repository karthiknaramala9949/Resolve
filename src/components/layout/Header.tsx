'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { Search, Shield } from 'lucide-react';
import { UserMenu } from './UserMenu';

export const Header: React.FC = () => {
  const { openCommandPalette } = useAppStore();
  const pathname = usePathname();

  const getPageTitle = () => {
    const path = pathname || '';
    if (path.includes('/app/overview')) return 'Overview';
    if (path.includes('/app/cases')) return 'Cases';
    if (path.includes('/app/documents')) return 'Documents & proof';
    if (path.includes('/app/purchases')) return 'Purchases';
    if (path.includes('/app/help')) return 'Rights & official routes';
    if (path.includes('/app/reminders')) return 'Reminders';
    if (path.includes('/app/privacy')) return 'Privacy & trust';
    return 'RESOLVE-ONE';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3 bg-white/95 backdrop-blur-md border-b border-steel-grey-200 select-none">
      {/* Left: Mobile Brand & Desktop Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link href="/" className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-coral flex items-center justify-center text-white font-serif font-medium text-sm leading-none">
            R
          </div>
        </Link>
        <h1 className="text-base sm:text-lg font-serif font-medium text-charcoal tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center: Command Palette Quick Search Button */}
      <div className="hidden sm:flex items-center">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-steel-grey-200 bg-steel-grey-50 text-xs text-steel-grey-600 hover:border-steel-grey-300 transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-steel-grey-400" />
          <span>Search or jump to</span>
          <kbd className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-steel-grey-200 text-steel-grey-600 font-normal">
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
          <Search className="w-4 h-4" />
        </button>

        {/* Storage Trust Badge */}
        <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-steel-grey-50 text-xs font-normal text-steel-grey-600 border border-steel-grey-200 leading-none select-none">
          <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Private & protected</span>
        </div>

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
};
