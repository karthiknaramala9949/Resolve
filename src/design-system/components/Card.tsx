import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'elevated' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'bg-white border border-steel-grey-200 shadow-xs',
      subtle:
        'bg-steel-grey-50 border border-steel-grey-200',
      elevated:
        'bg-white border border-steel-grey-200 shadow-sm',
      interactive:
        'bg-white border border-steel-grey-200 shadow-xs hover:border-steel-grey-300 hover:shadow-sm transition-[border-color,box-shadow] duration-150 cursor-pointer',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl p-5 text-charcoal', variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
