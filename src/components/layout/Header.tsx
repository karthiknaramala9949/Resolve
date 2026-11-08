import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Search, Shield } from 'lucide-react';

export const Header: React.FC = () => {
  const { openCommandPalette } = useAppStore();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/app/overview')) return 'Overview';
    if (path.includes('/app/cases')) return 'My Cases';
    if (path.includes('/app/documents')) return 'Documents & Proof';
    if (path.includes('/app/purchases')) return 'Purchases & Protection';
    if (path.includes('/app/help')) return 'Rights & Official Routes';
    if (path.includes('/app/reminders')) return 'Reminders';
    if (path.includes('/app/privacy')) return 'Privacy & Data Trust';
    if (path.includes('/app/settings')) return 'Settings';
    return 'RESOLVE-ONE';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3.5 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 select-none">
      {/* Left: Mobile Brand & Desktop Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link to="/" className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm font-serif">
            R
          </div>
        </Link>
        <h1 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-100 font-serif">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center: Command Palette Quick Search Button */}
      <div className="hidden sm:flex items-center">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-surface-light-subtle dark:bg-surface-dark-subtle text-xs text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
          <span>Search or jump to...</span>
          <kbd className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border text-neutral-600 dark:text-neutral-300 font-semibold">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Storage pill, Language, Theme */}
      <div className="flex items-center gap-2">
        {/* Search trigger on mobile */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="sm:hidden p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Open search palette"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Local Storage Trust Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
          <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>On-device only</span>
        </div>
      </div>
    </header>
  );
};

