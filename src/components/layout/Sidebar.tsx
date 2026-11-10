'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  Home,
  FolderKanban,
  FileText,
  ShoppingBag,
  HelpCircle,
  Clock,
  ShieldCheck,
  Plus,
  LogOut,
  User,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { activeCaseCount } = useAppStore();
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  const primaryNav = [
    { to: '/app/overview', label: 'Overview', icon: Home },
    { to: '/app/cases', label: 'Cases', icon: FolderKanban, badge: activeCaseCount },
    { to: '/app/documents', label: 'Documents & proof', icon: FileText },
    { to: '/app/purchases', label: 'Purchases', icon: ShoppingBag },
    { to: '/app/help', label: 'Rights & routes', icon: HelpCircle },
  ];

  const secondaryNav = [
    { to: '/app/reminders', label: 'Reminders', icon: Clock },
    { to: '/app/privacy', label: 'Privacy & trust', icon: ShieldCheck },
  ];

  return (
    <aside
      className={cn(
        'w-64 shrink-0 flex flex-col justify-between border-r border-steel-grey-200 bg-white text-charcoal h-screen sticky top-0 px-4 py-5 select-none transition-colors duration-150 overflow-y-auto scroll-smooth',
        className
      )}
    >
      <div>
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 px-2 mb-6 group focus-visible:outline-none">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center text-white shadow-xs font-serif font-medium text-lg leading-none">
            R
          </div>
          <div>
            <span className="font-serif font-medium text-lg tracking-tight text-charcoal group-hover:text-coral transition-colors">
              RESOLVE-ONE
            </span>
            <span className="block text-[11px] text-steel-grey-500 font-normal">
              Consumer dispute care
            </span>
          </div>
        </Link>

        {/* Quick Action: New Case CTA */}
        <div className="mb-6 px-1">
          <Link
            href="/app/cases?new=true"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-coral hover:bg-coral-600 text-white font-medium text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 leading-none min-h-[40px]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Tell us what happened</span>
          </Link>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1">
          <span className="px-3 text-xs font-medium text-steel-grey-500">
            Workspace
          </span>
          <nav className="mt-1.5 space-y-0.5">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.to || (item.to !== '/app/overview' && pathname?.startsWith(item.to));

              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors group',
                    isActive
                      ? 'bg-coral-50 text-coral font-medium border border-coral-200/50 shadow-2xs'
                      : 'text-steel-grey-600 hover:bg-steel-grey-50 hover:text-charcoal font-normal'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-coral' : 'text-steel-grey-400 group-hover:text-charcoal')} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-coral text-white leading-none shrink-0">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Secondary Navigation */}
        <div className="mt-6 pt-4 border-t border-steel-grey-100 space-y-1">
          <span className="px-3 text-xs font-medium text-steel-grey-500">
            Controls
          </span>
          <nav className="mt-1.5 space-y-0.5">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.to;

              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors group',
                    isActive
                      ? 'bg-coral-50 text-coral font-medium border border-coral-200/50 shadow-2xs'
                      : 'text-steel-grey-600 hover:bg-steel-grey-50 hover:text-charcoal font-normal'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-coral' : 'text-steel-grey-400 group-hover:text-charcoal')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer: User Account & Storage Status */}
      <div className="pt-4 border-t border-steel-grey-100 space-y-3">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-steel-grey-50 border border-steel-grey-200">
            <Link href="/auth/setup" className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-coral text-white text-xs font-semibold flex items-center justify-center font-serif shrink-0">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-charcoal truncate">{user.name}</p>
                <p className="text-[10px] text-steel-grey-500 truncate">{user.email || user.phoneNumber}</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-steel-grey-400 hover:text-coral hover:bg-steel-grey-100 rounded-lg transition-colors shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-steel-grey-200 bg-white hover:bg-steel-grey-50 text-xs font-semibold text-charcoal transition-colors shadow-2xs"
          >
            <User className="w-3.5 h-3.5 text-steel-grey-500" />
            <span>Sign In to Sync</span>
          </Link>
        )}

        <div className="flex items-center justify-between px-2 text-xs text-steel-grey-500 font-normal">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-mono text-xs">IndexedDB local</span>
          </div>
          <span className="text-xs">v2.0</span>
        </div>
      </div>
    </aside>
  );
};
