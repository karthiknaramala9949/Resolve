import React from 'react';
import { cn, formatDateTime } from '@/lib/utils';
import { CheckCircle2, Clock, User, Building, FileText, Sparkles } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  source: 'customer' | 'company' | 'rule_calculation' | 'evidence' | 'sample' | string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
  threeStateOutcome?: {
    companyStated?: { date?: string; note?: string };
    evidenceFound?: { date?: string; note?: string };
    customerConfirmed?: { date?: string; note?: string };
  };
}

export const Timeline: React.FC<TimelineProps> = ({ events, className, threeStateOutcome }) => {
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'company':
        return {
          label: 'Company statement',
          icon: Building,
          color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-900',
        };
      case 'rule_calculation':
      case 'rule_extraction_preview':
        return {
          label: 'Local rule check',
          icon: Sparkles,
          color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-900',
        };
      case 'evidence':
        return {
          label: 'Evidence reference',
          icon: FileText,
          color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        };
      case 'customer':
      default:
        return {
          label: 'You',
          icon: User,
          color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
        };
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Three-State Outcome Verification Bar */}
      {threeStateOutcome && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark p-4 shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
            Outcome Verification Status (3 Independent Stages)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stage 1 */}
            <div
              className={cn(
                'rounded-lg p-3 border transition-colors',
                threeStateOutcome.companyStated
                  ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200'
                  : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400'
              )}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-white dark:bg-neutral-800 border">
                  1
                </span>
                <span>Company says refund</span>
              </div>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                {threeStateOutcome.companyStated?.note || 'Not yet recorded'}
              </p>
            </div>

            {/* Stage 2 */}
            <div
              className={cn(
                'rounded-lg p-3 border transition-colors',
                threeStateOutcome.evidenceFound
                  ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                  : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400'
              )}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-white dark:bg-neutral-800 border">
                  2
                </span>
                <span>Payment evidence logged</span>
              </div>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                {threeStateOutcome.evidenceFound?.note || 'No UTR/receipt reference yet'}
              </p>
            </div>

            {/* Stage 3 */}
            <div
              className={cn(
                'rounded-lg p-3 border transition-colors',
                threeStateOutcome.customerConfirmed
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                  : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400'
              )}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-white dark:bg-neutral-800 border">
                  3
                </span>
                <span>You confirmed received</span>
              </div>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                {threeStateOutcome.customerConfirmed?.note || 'Pending your bank check'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Narrative Event Stream */}
      <div className="relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800 space-y-6">
        {events.map((event) => {
          const badge = getSourceBadge(event.source);
          const Icon = badge.icon;

          return (
            <div key={event.id} className="relative group">
              {/* Circle Marker */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white dark:bg-surface-dark border-2 border-neutral-300 dark:border-neutral-700 group-hover:border-brand-500 transition-colors flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 group-hover:bg-brand-500 transition-colors" />
              </div>

              {/* Event Content */}
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-subtle hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border leading-none shrink-0',
                        badge.color
                      )}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{badge.label}</span>
                    </span>
                    <time className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums leading-none">
                      {formatDateTime(event.at)}
                    </time>
                  </div>
                </div>

                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                  {event.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

