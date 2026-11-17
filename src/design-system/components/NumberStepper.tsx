'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 365,
  step = 1,
  label,
  unit,
  disabled = false,
  className = '',
}) => {
  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled || value <= min) return;
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled || value >= max) return;
    onChange(Math.min(max, value + step));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement(e as any);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement(e as any);
    }
  };

  return (
    <div className={cn('space-y-1.5 text-left', className)}>
      {label && (
        <label className="block text-sm font-semibold text-charcoal">
          {label}
        </label>
      )}

      <div className="inline-flex items-center rounded-xl border border-steel-grey-200 bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label || 'value'}`}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-steel-grey-600 transition-all duration-150',
            'hover:bg-steel-grey-100 hover:text-charcoal active:scale-90 motion-reduce:transform-none',
            'disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40'
          )}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div className="flex items-center justify-center px-3 min-w-[3.5rem]">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            disabled={disabled}
            onChange={(e) => {
              const num = parseInt(e.target.value, 10);
              if (!isNaN(num)) {
                onChange(Math.min(max, Math.max(min, num)));
              }
            }}
            onKeyDown={handleKeyDown}
            aria-label={label || 'Quantity'}
            className="w-12 text-center text-sm font-semibold text-charcoal bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && (
            <span className="text-xs text-steel-grey-500 font-normal ml-0.5 select-none">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label || 'value'}`}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-steel-grey-600 transition-all duration-150',
            'hover:bg-steel-grey-100 hover:text-charcoal active:scale-90 motion-reduce:transform-none',
            'disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40'
          )}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

