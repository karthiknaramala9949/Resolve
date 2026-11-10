'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col justify-between p-4 sm:p-6 md:p-8 selection:bg-coral-100 selection:text-coral-900">
      {/* Top Header */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2.5 group focus-visible:outline-none">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center text-white font-serif font-medium text-lg leading-none shadow-2xs group-hover:bg-coral-600 transition-colors">
            R
          </div>
          <span className="font-serif font-medium text-xl tracking-tight text-charcoal">
            RESOLVE-ONE
          </span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-steel-grey-600 bg-white px-2.5 py-1 rounded-full border border-steel-grey-200 shadow-2xs">
          <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>256-bit encryption</span>
        </div>
      </header>

      {/* Main Auth Card Container */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="text-center mb-6 space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-charcoal tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-steel-grey-600 font-normal max-w-sm mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-steel-grey-200 p-6 sm:p-8 shadow-xs">
          {children}
        </div>
      </main>

      {/* Bottom Trust Guarantee */}
      <footer className="max-w-xl w-full mx-auto text-center py-4 text-xs text-steel-grey-500 space-y-1">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero Credential Capture &bull; Strictly Consumer-Controlled</span>
        </div>
        <p className="text-[11px] text-steel-grey-400">
          Governed by the Consumer Protection Act, 2019 principles &bull; Private & Secure
        </p>
      </footer>
    </div>
  );
};

