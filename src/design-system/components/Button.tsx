import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isSuccess?: boolean;
  successText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, isSuccess, successText, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 focus-visible:ring-offset-1 active:scale-[0.98] motion-reduce:transform-none disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap leading-none';

    const variants = {
      primary:
        isSuccess
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
          : 'bg-coral hover:bg-coral-600 text-white shadow-xs',
      secondary:
        'bg-steel-grey-100 hover:bg-steel-grey-200 text-charcoal border border-steel-grey-200 shadow-2xs',
      outline:
        'border border-steel-grey-200 bg-white hover:bg-steel-grey-50 text-charcoal shadow-2xs',
      ghost:
        'hover:bg-steel-grey-100 text-steel-grey-600 hover:text-charcoal',
      danger:
        'bg-coral-700 hover:bg-coral-800 text-white shadow-xs focus-visible:ring-coral-500/40',
    };

    const sizes = {
      sm: 'text-xs sm:text-sm px-3.5 py-2 min-h-[36px] gap-1.5 leading-none',
      md: 'text-sm px-4 py-2.5 min-h-[40px] gap-2 leading-none',
      lg: 'text-sm sm:text-base px-5 py-3 min-h-[44px] gap-2 leading-none',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        aria-live={isLoading || isSuccess ? 'polite' : undefined}
        aria-busy={isLoading ? 'true' : undefined}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-3.5 w-3.5 shrink-0 text-current motion-reduce:animate-none"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        )}
        {isSuccess && (
          <Check
            className="w-4 h-4 shrink-0 text-current animate-in zoom-in-50 duration-200 motion-reduce:transform-none"
            aria-hidden="true"
          />
        )}
        {isSuccess && successText ? successText : children}
      </button>
    );
  }
);
Button.displayName = 'Button';
