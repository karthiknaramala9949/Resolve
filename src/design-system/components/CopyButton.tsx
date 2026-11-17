'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  label?: string;
  successDurationMs?: number;
  variant?: 'outline' | 'ghost' | 'subtle';
  size?: 'sm' | 'md';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label = 'Copy',
  successDurationMs = 2000,
  variant = 'outline',
  size = 'sm',
  className = '',
  ...props
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, successDurationMs);
    } catch (err) {
      console.warn('[CopyButton] Clipboard copy failed:', err);
    }
  };

  const variants = {
    outline:
      'border border-steel-grey-200 bg-white hover:bg-steel-grey-50 text-steel-grey-700 hover:text-charcoal shadow-2xs',
    ghost:
      'bg-transparent hover:bg-steel-grey-100 text-steel-grey-600 hover:text-charcoal',
    subtle:
      'bg-steel-grey-100 hover:bg-steel-grey-200 text-charcoal border border-steel-grey-200',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 h-7 gap-1.5 rounded-lg',
    md: 'text-xs sm:text-sm px-3.5 py-2 h-9 gap-2 rounded-xl',
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? (label ? `Copied ${label} to clipboard` : 'Copied to clipboard') : `Copy ${label}`}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 select-none active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40',
        copied
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
          : variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {copied ? (
        <>
          <Check
            className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-in zoom-in-50 duration-150 motion-reduce:transform-none"
            aria-hidden="true"
          />
          <span className="font-semibold text-emerald-700 animate-in fade-in duration-150">
            Copied!
          </span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 shrink-0 text-steel-grey-400" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
