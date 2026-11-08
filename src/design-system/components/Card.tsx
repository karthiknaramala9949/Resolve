import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'elevated' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'bg-white dark:bg-surface-dark border border-neutral-200 dark:border-neutral-800 shadow-subtle',
      subtle:
        'bg-surface-light-subtle dark:bg-surface-dark-subtle border border-neutral-200/80 dark:border-neutral-800/80',
      elevated:
        'bg-white dark:bg-surface-dark border border-neutral-200/60 dark:border-neutral-800/60 shadow-elevated',
      interactive:
        'bg-white dark:bg-surface-dark border border-neutral-200 dark:border-neutral-800 shadow-subtle hover:shadow-elevated hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-xl p-5 text-neutral-900 dark:text-neutral-100', variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

