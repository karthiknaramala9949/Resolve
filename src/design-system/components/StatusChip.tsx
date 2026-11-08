import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, Clock, CheckCircle2, MessageSquare, Archive } from 'lucide-react';

export type CaseStatus =
  | 'action_required'
  | 'waiting_company'
  | 'response_received'
  | 'resolved'
  | 'closed';

interface StatusChipProps {
  status: CaseStatus | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  CaseStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string }
> = {
  action_required: {
    label: 'Action required',
    icon: AlertCircle,
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
  },
  waiting_company: {
    label: 'Waiting for company',
    icon: Clock,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
  },
  response_received: {
    label: 'Reply received',
    icon: MessageSquare,
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-800 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/60',
  },
  resolved: {
    label: 'Outcome confirmed',
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
  },
  closed: {
    label: 'Closed',
    icon: Archive,
    bg: 'bg-neutral-100 dark:bg-neutral-800/60',
    text: 'text-neutral-700 dark:text-neutral-300',
    border: 'border-neutral-200 dark:border-neutral-700',
  },
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'md',
  className,
  showIcon = true,
}) => {
  const config = statusConfig[status as CaseStatus] || {
    label: status,
    icon: AlertCircle,
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-700 dark:text-neutral-300',
    border: 'border-neutral-200 dark:border-neutral-700',
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs font-semibold px-2.5 py-1 gap-1.5 leading-none',
    md: 'text-xs sm:text-sm font-semibold px-3 py-1.5 gap-1.5 leading-none',
    lg: 'text-sm font-semibold px-3.5 py-1.5 gap-2 leading-none',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border transition-colors select-none font-medium whitespace-nowrap leading-none',
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <IconComponent className={cn('shrink-0', iconSizes[size])} aria-hidden="true" />}
      <span className="leading-none">{config.label}</span>
    </span>
  );
};

