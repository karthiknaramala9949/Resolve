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
        'group relative flex flex-col justify-between rounded-2xl p-5 text-left transition-[border-color,box-shadow] duration-150',
        'bg-white border border-steel-grey-200',
        'shadow-xs hover:shadow-sm hover:border-steel-grey-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40',
        className
      )}
    >
      {/* Top Header: ID, Date, and Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-steel-grey-500 leading-none">
            {caseData.id}
          </span>
          <span className="text-steel-grey-300 leading-none">•</span>
          <span className="text-xs text-steel-grey-500 leading-none">
            {formatRelativeTime(caseData.updatedAt)}
          </span>
        </div>
        <StatusChip status={caseData.status} size="sm" className="shrink-0" />
      </div>

      {/* Main Content: Title, Company, Amount */}
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-medium text-charcoal group-hover:text-coral transition-colors line-clamp-1">
          {caseData.title}
        </h3>
        
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-steel-grey-600">
          <div className="flex items-center gap-1.5 font-normal">
            <Building2 className="w-4 h-4 text-steel-grey-400 shrink-0" aria-hidden="true" />
            <span>{caseData.company || 'Company unrecorded'}</span>
          </div>

          {caseData.amount !== undefined && caseData.amount !== null && (
            <div className="font-mono font-medium text-charcoal tabular-nums">
              {formatINR(caseData.amount)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer: Next Action Callout */}
      {caseData.nextAction && (
        <div className="mt-auto pt-3 border-t border-steel-grey-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-steel-grey-600 pr-2">
            <span className="font-semibold text-coral shrink-0">Next step:</span>
            <span className="line-clamp-1">{caseData.nextAction}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-steel-grey-400 group-hover:text-coral group-hover:translate-x-0.5 transition-transform duration-150 shrink-0" />
        </div>
      )}
    </div>
  );
};
