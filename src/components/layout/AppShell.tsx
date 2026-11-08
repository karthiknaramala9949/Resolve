import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { OfflineBanner } from './OfflineBanner';
import { StoragePersistenceBanner } from './StoragePersistenceBanner';
import { CommandPalette } from '@/design-system/components/CommandPalette';
import { useAppStore } from '@/store/useAppStore';
import { caseRepository } from '@/lib/db/repositories';
import { Case } from '@/lib/db/types';

export const AppShell: React.FC = () => {
  const { isCommandPaletteOpen, openCommandPalette, closeCommandPalette, setActiveCaseCount } = useAppStore();
  const [cases, setCases] = useState<Case[]>([]);
  const location = useLocation();

  const refreshCases = async () => {
    try {
      const all = await caseRepository.getAll();
      setCases(all);
      setActiveCaseCount(all.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    refreshCases();
  }, [location.pathname]);

  // Global ⌘K / Ctrl-K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, openCommandPalette, closeCommandPalette]);

  return (
    <div className="flex flex-col min-h-screen bg-surface-light-ground dark:bg-surface-dark-ground text-neutral-900 dark:text-neutral-100 selection:bg-brand-100 selection:text-brand-900">
      {/* Top Notification Banners in document flow */}
      <OfflineBanner />
      <StoragePersistenceBanner />

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar (hidden on mobile) */}
        <Sidebar className="hidden md:flex" />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
          <Header />
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <MobileNav />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        cases={cases.map((c) => ({
          id: c.id,
          title: c.title,
          company: c.company,
        }))}
      />
    </div>
  );
};
