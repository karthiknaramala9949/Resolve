'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxStrikeProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  subtext?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const CheckboxStrike: React.FC<CheckboxStrikeProps> = ({
  id,
  checked,
  onChange,
  label,
  subtext,
  disabled = false,
  className = '',
}) => {
  const checkboxId = id || `check-${Math.random().toString(36).substring(2, 7)}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={cn('flex items-start gap-3 select-none', className)}>
      <button
        id={checkboxId}
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : 'Toggle checklist item'}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 focus-visible:ring-offset-1',
          checked
            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
            : 'bg-white border-steel-grey-300 hover:border-coral',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Check
          className={cn(
            'w-3.5 h-3.5 stroke-[2.5] transform transition-transform duration-150 ease-out motion-reduce:transition-none',
            checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => !disabled && onChange(!checked)}
      >
        <div className="relative inline-block max-w-full">
          <span
            className={cn(
              'block text-sm font-medium transition-colors duration-200',
              checked ? 'text-steel-grey-400 line-through' : 'text-charcoal'
            )}
          >
            {label}
          </span>
          {/* Animated strikethrough line */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-1/2 h-[1.5px] w-full bg-steel-grey-400 origin-left transform transition-transform duration-250 ease-out motion-reduce:transition-none',
              checked ? 'scale-x-100' : 'scale-x-0'
            )}
          />
        </div>

        {subtext && (
          <div
            className={cn(
              'text-xs text-steel-grey-500 font-normal mt-0.5 transition-opacity duration-200',
              checked && 'opacity-60'
            )}
          >
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};
