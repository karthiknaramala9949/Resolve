'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string = string> {
  id?: T;
  value?: T;
  label: React.ReactNode;
  badge?: number | string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  ariaLabel = 'View options',
}: SegmentedControlProps<T>) {
  const getOptValue = (opt: SegmentOption<T>): T => (opt.value ?? opt.id) as T;
  const selectedIndex = options.findIndex((opt) => getOptValue(opt) === value);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onChange(getOptValue(options[nextIndex]));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onChange(getOptValue(options[prevIndex]));
    }
  };

  const sizes = {
    sm: 'p-0.5 text-xs h-8',
    md: 'p-1 text-xs sm:text-sm h-10',
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex items-center rounded-xl bg-steel-grey-100 border border-steel-grey-200 select-none shadow-2xs',
        sizes[size],
        className
      )}
    >
      {options.map((option, index) => {
        const optVal = getOptValue(option);
        const isSelected = optVal === value;

        return (
          <button
            key={optVal}
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(optVal)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 px-3 py-1 font-medium rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40',
              isSelected
                ? 'text-charcoal font-semibold shadow-xs bg-white'
                : 'text-steel-grey-600 hover:text-charcoal'
            )}
          >
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono transition-colors',
                  isSelected
                    ? 'bg-coral text-white'
                    : 'bg-steel-grey-200 text-steel-grey-700'
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
