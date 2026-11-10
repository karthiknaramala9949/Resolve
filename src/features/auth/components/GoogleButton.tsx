'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface GoogleButtonProps {
  label?: string;
  className?: string;
  returnTo?: string;
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({
  label = 'Continue with Google',
  className,
  returnTo = '/app/overview',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleClick = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/auth/google/url?returnTo=${encodeURIComponent(returnTo)}`);
      if (!res.ok) throw new Error('Failed to fetch Google auth URL');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={isLoading}
      aria-label="Continue with Google"
      className={cn(
        'w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-steel-grey-200 bg-white hover:bg-steel-grey-50 text-charcoal font-medium text-sm transition-all duration-150 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/30 min-h-[44px] disabled:opacity-50 select-none cursor-pointer',
        className
      )}
    >
      {isLoading ? (
        <svg
          className="animate-spin text-steel-grey-600 shrink-0"
          width="18"
          height="18"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          style={{ width: '18px', height: '18px' }}
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        /* Official Google 'G' standard SVG */
        <svg
          className="w-5 h-5 shrink-0"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span className="leading-none">{label}</span>
    </button>
  );
};

export const AuthDivider: React.FC<{ label?: string }> = ({ label = 'OR' }) => {
  return (
    <div className="relative my-5 select-none">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-steel-grey-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-3 font-semibold tracking-wider text-steel-grey-400">
          {label}
        </span>
      </div>
    </div>
  );
};

