'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/context/AuthContext';
import { User, LogOut, Settings, ShieldCheck, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const UserMenu: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/auth/signin"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-coral hover:bg-coral-600 text-white font-medium text-xs shadow-2xs transition-colors"
      >
        <User className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </Link>
    );
  }

  const monogram = (user.name || user.email || 'U')[0].toUpperCase();

  return (
    <div className="relative select-none" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
        className="flex items-center gap-2 p-1 pl-1.5 rounded-full border border-steel-grey-200 bg-white hover:border-steel-grey-300 transition-colors focus:outline-none focus:ring-2 focus:ring-coral/20"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || 'User avatar'}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-coral text-white text-[11px] font-semibold flex items-center justify-center font-serif leading-none">
            {monogram}
          </div>
        )}
        <span className="hidden sm:inline-block text-xs font-semibold text-charcoal max-w-[100px] truncate">
          {user.name || user.email?.split('@')[0]}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-steel-grey-400 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-steel-grey-200 shadow-md py-2 z-50 text-charcoal animate-in fade-in zoom-in-95 duration-100">
          {/* User Profile Summary */}
          <div className="px-4 py-2.5 border-b border-steel-grey-100">
            <p className="text-sm font-semibold text-charcoal truncate">{user.name}</p>
            <p className="text-xs text-steel-grey-500 truncate">
              {user.email || user.phoneNumber || 'User'}
            </p>

            {/* Providers badges */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {user.providers.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-steel-grey-100 text-steel-grey-700 capitalize"
                >
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{p}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/auth/setup"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs text-steel-grey-700 hover:bg-steel-grey-50 hover:text-charcoal transition-colors font-medium"
            >
              <Settings className="w-3.5 h-3.5 text-steel-grey-400" />
              <span>Account setup & recovery</span>
            </Link>

            <Link
              href="/app/privacy"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs text-steel-grey-700 hover:bg-steel-grey-50 hover:text-charcoal transition-colors font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-steel-grey-400" />
              <span>Privacy & data trust</span>
            </Link>
          </div>

          {/* Sign Out Button */}
          <div className="border-t border-steel-grey-100 pt-1 mt-1">
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-coral-700 hover:bg-coral-50 hover:text-coral transition-colors font-medium text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-coral-600" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

