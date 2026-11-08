import React from 'react';
import { cn, formatINR, formatRelativeTime } from '@/lib/utils';
import { StatusChip, CaseStatus } from './StatusChip';
import { ArrowRight, Building2, ChevronRight } from 'lucide-react';

export interface CaseCardData {
  id: string;
  title: string;
  issueType: string;
  company: string;
  amount?: number | null;
  status: CaseStatus;
  nextAction?: string;
  updatedAt: string;
}

interface CaseCardProps {
  caseData: CaseCardData;
  onClick?: () => void;
  className?: string;
}

export const CaseCard: React.FC<CaseCardProps> = ({ caseData, onClick, className }) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'group relative flex flex-col justify-between rounded-xl p-5 text-left transition-all duration-200',
        'bg-white dark:bg-surface-dark border border-neutral-200/90 dark:border-neutral-800',
        'shadow-subtle hover:shadow-elevated hover:border-brand-300 dark:hover:border-brand-700/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className
      )}
    >
      {/* Top Header: ID, Date, and Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 leading-none">
            {caseData.id}
          </span>
          <span className="text-neutral-300 dark:text-neutral-700 leading-none">•</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 leading-none">
            {formatRelativeTime(caseData.updatedAt)}
          </span>
        </div>
        <StatusChip status={caseData.status} size="sm" className="shrink-0" />
      </div>

      {/* Main Content: Title, Company, Amount */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
          {caseData.title}
        </h3>
        
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-300">
          <div className="flex items-center gap-1.5 font-medium">
            <Building2 className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
            <span>{caseData.company || 'Company unrecorded'}</span>
          </div>

          {caseData.amount !== undefined && caseData.amount !== null && (
            <div className="font-mono font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
              {formatINR(caseData.amount)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer: Next Action Callout */}
      {caseData.nextAction && (
        <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 pr-2">
            <span className="font-semibold text-brand-600 dark:text-brand-400 shrink-0">Next step:</span>
            <span className="line-clamp-1">{caseData.nextAction}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      )}
    </div>
  );
};

