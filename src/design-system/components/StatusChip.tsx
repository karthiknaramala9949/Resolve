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
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-300',
  },
  waiting_company: {
    label: 'Waiting for company',
    icon: Clock,
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-300',
  },
  response_received: {
    label: 'Reply received',
    icon: MessageSquare,
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-300',
  },
  resolved: {
    label: 'Outcome confirmed',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
  },
  closed: {
    label: 'Closed',
    icon: Archive,
    bg: 'bg-steel-grey-100',
    text: 'text-steel-grey-700',
    border: 'border-steel-grey-200',
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
    bg: 'bg-steel-grey-100',
    text: 'text-charcoal',
    border: 'border-steel-grey-200',
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
