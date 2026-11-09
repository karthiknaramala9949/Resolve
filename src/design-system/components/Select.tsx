import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, id, options, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-charcoal">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            aria-label={props['aria-label'] || label || 'Select option'}
            className={cn(
              'w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border bg-white text-base text-charcoal transition-colors cursor-pointer',
              'border-steel-grey-200 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20',
              'disabled:opacity-50 disabled:bg-steel-grey-50',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-steel-grey-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {hint && !error && <p className="text-xs text-steel-grey-600 font-medium">{hint}</p>}
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
