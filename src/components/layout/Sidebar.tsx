import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import {
  Home,
  FolderKanban,
  FileText,
  ShoppingBag,
  HelpCircle,
  Clock,
  ShieldCheck,
  Settings,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { activeCaseCount } = useAppStore();

  const primaryNav = [
    { to: '/app/overview', label: 'Home', icon: Home },
    { to: '/app/cases', label: 'Cases', icon: FolderKanban, badge: activeCaseCount },
    { to: '/app/documents', label: 'Documents', icon: FileText },
    { to: '/app/purchases', label: 'Purchases', icon: ShoppingBag },
    { to: '/app/help', label: 'Help & Rights', icon: HelpCircle },
  ];

  const secondaryNav = [
    { to: '/app/reminders', label: 'Reminders', icon: Clock },
    { to: '/app/privacy', label: 'Privacy & Data', icon: ShieldCheck },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'w-64 shrink-0 flex flex-col justify-between border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark h-screen sticky top-0 px-4 py-5 select-none',
        className
      )}
    >
      <div>
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 px-2 mb-6 group focus-visible:outline-none">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-sm font-bold text-lg font-serif">
            R
          </div>
          <div>
            <span className="font-serif font-bold text-lg tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              RESOLVE-ONE
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
              India Consumer Care
            </span>
          </div>
        </Link>

        {/* Quick Action: New Case CTA */}
        <div className="mb-6 px-1">
          <Link
            to="/app/cases?new=true"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tell Us What Happened</span>
          </Link>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1">
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Core Workspace
          </span>
          <nav className="mt-2 space-y-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400 font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Secondary Navigation */}
        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1">
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Tools & Controls
          </span>
          <nav className="mt-2 space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400 font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer: Storage Status */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 space-y-3">
        <div className="flex items-center justify-between px-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">IndexedDB Active</span>
          </div>
          <span className="text-[11px]">v2.0</span>
        </div>
      </div>
    </aside>
  );
};

