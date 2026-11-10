import React from 'react';
import { cn, formatDateTime } from '@/lib/utils';
import { CheckCircle2, Clock, User, Building, FileText, SlidersHorizontal } from 'lucide-react';

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
          color: 'bg-blue-50 text-blue-900 border-blue-200',
        };
      case 'rule_calculation':
      case 'rule_extraction_preview':
        return {
          label: 'Local rule check',
          icon: SlidersHorizontal,
          color: 'bg-steel-grey-100 text-steel-grey-700 border-steel-grey-200',
        };
      case 'evidence':
        return {
          label: 'Evidence reference',
          icon: FileText,
          color: 'bg-amber-50 text-amber-900 border-amber-200',
        };
      case 'customer':
      default:
        return {
          label: 'You',
          icon: User,
          color: 'bg-steel-grey-100 text-steel-grey-700 border-steel-grey-200',
        };
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Three-State Outcome Verification Bar */}
      {threeStateOutcome && (
        <div className="rounded-xl border border-steel-grey-200 bg-white p-4 shadow-subtle">
          <div className="text-xs font-medium text-steel-grey-600 mb-3">
            Outcome verification status (3 independent stages)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stage 1 */}
            <div
              className={cn(
                'rounded-lg p-3 border transition-colors',
                threeStateOutcome.companyStated
                  ? 'border-blue-200 bg-blue-50/50 text-blue-900'
                  : 'border-steel-grey-200 bg-steel-grey-50 text-steel-grey-600'
              )}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-white border border-steel-grey-200">
                  1
                </span>
                <span>Company says refund</span>
              </div>
              <p className="mt-1 text-xs text-steel-grey-600">
                {threeStateOutcome.companyStated?.note || 'Not yet recorded'}
              </p>
            </div>

            {/* Stage 2 */}
            <div
              className={cn(
                'rounded-lg p-3 border transition-colors',
                threeStateOutcome.evidenceFound
                  ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900'
                  : 'border-steel-grey-200 bg-steel-grey-50 text-steel-grey-600'
              )}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-white border border-steel-grey-200">
                  2
                </span>
                <span>Payment evidence logged</span>
              </div>
              <p className="mt-1 text-xs text-steel-grey-600">
                {threeStateOutcome.evidenceFound?.note || 'No UTR/receipt reference yet'}
              </p>
            </div>

            {/* Stage 3 */}
            <div
              className={cn(
                'rounded-lg p-3 border transition-colors',
                threeStateOutcome.customerConfirmed
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                  : 'border-steel-grey-200 bg-steel-grey-50 text-steel-grey-600'
              )}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-white border border-steel-grey-200">
                  3
                </span>
                <span>You confirmed received</span>
              </div>
              <p className="mt-1 text-xs text-steel-grey-600">
                {threeStateOutcome.customerConfirmed?.note || 'Pending your bank check'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Narrative Event Stream */}
      <div className="relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-steel-grey-200 space-y-4">
        {events.map((event) => {
          const badge = getSourceBadge(event.source);
          const Icon = badge.icon;

          return (
            <div key={event.id} className="relative group">
              {/* Circle Marker */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-steel-grey-300 group-hover:border-coral transition-colors flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-steel-grey-400 group-hover:bg-coral transition-colors" />
              </div>

              {/* Event Content */}
              <div className="bg-white rounded-xl border border-steel-grey-200 p-4 shadow-subtle hover:border-steel-grey-300 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-medium text-charcoal">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-normal px-2 py-0.5 rounded-md border leading-none shrink-0',
                        badge.color
                      )}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{badge.label}</span>
                    </span>
                    <time className="text-xs text-steel-grey-500 tabular-nums leading-none">
                      {formatDateTime(event.at)}
                    </time>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed whitespace-pre-line font-normal">
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
