'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  onResend?: () => Promise<void>;
  disabled?: boolean;
  error?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value = '',
  onChange,
  onComplete,
  onResend,
  disabled,
  error,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChange = (index: number, char: string) => {
    const cleanChar = char.replace(/[^\d]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    const combined = newDigits.join('');
    onChange(combined);

    if (cleanChar && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/[^\d]/g, '').slice(0, length);
    if (!pasted) return;

    onChange(pasted);
    const nextIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending || !onResend) return;
    try {
      setIsResending(true);
      await onResend();
      setResendCooldown(60);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 6 Digits Container */}
      <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {Array.from({ length }).map((_, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            disabled={disabled}
            aria-label={`Digit ${idx + 1}`}
            className={cn(
              'w-10 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-semibold rounded-xl border bg-white text-charcoal transition-all shadow-2xs',
              'border-steel-grey-200 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20',
              digits[idx] && 'border-coral-400 bg-coral-50/20',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-600',
              disabled && 'opacity-50 bg-steel-grey-50'
            )}
          />
        ))}
      </div>

      {error && <p className="text-center text-xs text-red-600 font-medium">{error}</p>}

      {/* Resend actions */}
      {onResend && (
        <div className="text-center pt-2">
          {resendCooldown > 0 ? (
            <p className="text-xs text-steel-grey-500 font-medium">
              Resend code in{' '}
              <span className="font-mono font-semibold text-charcoal">
                {resendCooldown}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendClick}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral hover:text-coral-700 transition-colors focus:outline-none"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isResending && 'animate-spin')} />
              <span>Resend verification code</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

