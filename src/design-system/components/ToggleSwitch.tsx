'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const switchId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const trackDimensions =
    size === 'sm' ? 'w-9 h-5 p-0.5' : 'w-11 h-6 p-0.5';
  const knobDimensions =
    size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const translateDistance =
    size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      {(label || description) && (
        <div className="flex-1 select-none pr-2">
          {label && (
            <label
              htmlFor={switchId}
              className={cn(
                'block text-sm font-semibold text-charcoal cursor-pointer',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-steel-grey-500 font-normal mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle setting'}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 focus-visible:ring-offset-2',
          trackDimensions,
          checked ? 'bg-coral' : 'bg-steel-grey-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-out motion-reduce:transition-none',
            knobDimensions,
            checked ? translateDistance : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
};

