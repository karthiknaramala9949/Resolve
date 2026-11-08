import React from 'react';
import { cn, formatINR } from '@/lib/utils';

interface MoneyDisplayProps {
  amount: number | string | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
  discrepancy?: {
    promised: number;
    received: number;
  };
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  size = 'md',
  label,
  className,
  discrepancy,
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base font-semibold',
    lg: 'text-xl font-bold',
    xl: 'text-3xl font-bold tracking-tight',
  };

  const formatted = formatINR(amount);

  return (
    <div className={cn('inline-flex flex-col', className)}>
      {label && (
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-0.5">
          {label}
        </span>
      )}
      <span className={cn('tabular-nums font-mono text-neutral-900 dark:text-neutral-100', sizeClasses[size])}>
        {formatted}
      </span>
      {discrepancy && discrepancy.promised !== discrepancy.received && (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
          Difference: {formatINR(discrepancy.promised - discrepancy.received)}
        </span>
      )}
    </div>
  );
};

