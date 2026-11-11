'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CaseCard, EmptyState } from '@/design-system';
import { Plus, ArrowRight } from 'lucide-react';
import { caseService, dashboardService } from '@/services';
import { Case } from '@/lib/db/types';
import { computeNextStep } from '@/lib/rules/nextStepEngine';
import { IntakeModal } from '../components/IntakeModal';
import { useAppStore } from '@/store/useAppStore';

export const OverviewPage: React.FC = () => {
  const router = useRouter();
  const { setActiveCaseCount } = useAppStore();
  const [cases, setCases] = useState<Case[]>([]);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  const loadCases = async () => {
    const all = await caseService.listCases();
    setCases(all);
    setActiveCaseCount(all.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length);
  };

  useEffect(() => {
    loadCases();
  }, []);

  const activeCount = cases.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length;
  const actionRequiredCount = cases.filter((c) => c.status === 'action_required').length;
  const waitingCompanyCount = cases.filter((c) => c.status === 'waiting_company').length;
  const resolvedCount = cases.filter((c) => c.status === 'resolved').length;

  // Find priority case for dominant Next Step
  const priorityCase = cases.find((c) => c.status === 'action_required') || cases[0];
  const nextStep = priorityCase ? computeNextStep(priorityCase) : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-7 rounded-2xl bg-white border border-steel-grey-200 shadow-xs">
        <div className="max-w-2xl space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-steel-grey-50 text-steel-grey-700 border border-steel-grey-200 text-xs font-normal select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
            <span>Customer-directed dispute workspace</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-medium text-charcoal tracking-tight">
            Sort it out. One step at a time.
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
            Every step requires your explicit approval. RESOLVE-ONE never contacts stores, files complaints, or claims legal authority without you.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsIntakeOpen(true)}
            className="w-full md:w-auto shadow-2xs"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Tell us what happened</span>
          </Button>
        </div>
      </div>

      {/* Metrics & Case Health - Pure Numbers Per Tokens Guideline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card variant="default" className="p-4 bg-white border border-steel-grey-200 rounded-xl shadow-2xs">
          <span className="text-xs text-steel-grey-500 font-normal block mb-1">
            Active disputes
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-medium text-charcoal tabular-nums">
            {activeCount}
          </div>
          <p className="mt-1 text-xs text-steel-grey-500">Under management</p>
        </Card>

        <Card variant="default" className="p-4 bg-white border border-steel-grey-200 rounded-xl shadow-2xs">
          <span className="text-xs text-steel-grey-500 font-normal block mb-1">
            Action needed
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-medium text-amber-800 tabular-nums">
            {actionRequiredCount}
          </div>
          <p className="mt-1 text-xs text-steel-grey-500">Next step pending</p>
        </Card>

        <Card variant="default" className="p-4 bg-white border border-steel-grey-200 rounded-xl shadow-2xs">
          <span className="text-xs text-steel-grey-500 font-normal block mb-1">
            Awaiting company
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-medium text-blue-800 tabular-nums">
            {waitingCompanyCount}
          </div>
          <p className="mt-1 text-xs text-steel-grey-500">Response window</p>
        </Card>

        <Card variant="default" className="p-4 bg-white border border-steel-grey-200 rounded-xl shadow-2xs">
          <span className="text-xs text-steel-grey-500 font-normal block mb-1">
            Confirmed resolved
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-medium text-emerald-800 tabular-nums">
            {resolvedCount}
          </div>
          <p className="mt-1 text-xs text-steel-grey-500">Bank verified</p>
        </Card>
      </div>

      {/* Dominant Next Step Card */}
      {priorityCase && nextStep && (
        <Card variant="elevated" className="border border-steel-grey-200 bg-white p-5 sm:p-6 rounded-2xl shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-coral">
                  Priority next action
                </span>
                <span className="text-steel-grey-300">•</span>
                <span className="text-xs text-steel-grey-500 font-mono">{priorityCase.id}</span>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-charcoal">
                {nextStep.action}
              </h3>
              <p className="text-xs sm:text-sm text-steel-grey-600 font-normal max-w-2xl">
                {nextStep.reason}
              </p>
            </div>

            <div className="shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push(`/app/cases/${priorityCase.id}`)}
                className="w-full md:w-auto shadow-2xs"
              >
                <span>Take next step</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Active Cases Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif font-medium text-charcoal">
            Recent cases
          </h3>
          {cases.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/app/cases')}
              className="text-xs font-medium text-steel-grey-600 hover:text-charcoal inline-flex items-center gap-1 leading-none transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>

        {cases.length === 0 ? (
          <EmptyState
            illustration="cases"
            title="No active disputes yet"
            description="When a store rejects your refund, delays delivery, or denies a return, start your case here to organize proof and generate official letters."
            actionLabel="Tell us what happened"
            onAction={() => setIsIntakeOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.slice(0, 4).map((c) => (
              <CaseCard
                key={c.id}
                caseData={{
                  id: c.id,
                  title: c.title,
                  issueType: c.issueType,
                  company: c.company,
                  amount: c.amount,
                  status: c.status,
                  nextAction: c.nextAction,
                  updatedAt: c.updatedAt,
                }}
                onClick={() => router.push(`/app/cases/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Dispute Pathways / Tools */}
      <div className="pt-2 space-y-4">
        <h3 className="text-lg font-serif font-medium text-charcoal">
          Essential consumer tools
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            variant="default"
            className="p-5 flex flex-col justify-between space-y-3 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 transition-[border-color] cursor-pointer group"
            onClick={() => router.push('/app/purchases')}
          >
            <div className="space-y-1.5 text-left">
              <span className="text-xs font-medium text-coral">
                Return vault
              </span>
              <h4 className="text-base font-medium text-charcoal group-hover:text-coral transition-colors">
                Return window countdown
              </h4>
              <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
                Never forfeit statutory return rights. Automatically calculates return deadlines from confirmed delivery dates.
              </p>
            </div>
            <div className="pt-2 border-t border-steel-grey-100 flex items-center justify-between text-xs font-medium text-steel-grey-600 group-hover:text-charcoal transition-colors">
              <span>View return countdowns</span>
              <ArrowRight className="w-3.5 h-3.5 text-coral" />
            </div>
          </Card>

          <Card
            variant="default"
            className="p-5 flex flex-col justify-between space-y-3 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 transition-[border-color] cursor-pointer group"
            onClick={() => router.push('/app/documents')}
          >
            <div className="space-y-1.5 text-left">
              <span className="text-xs font-medium text-coral">
                Evidence vault
              </span>
              <h4 className="text-base font-medium text-charcoal group-hover:text-coral transition-colors">
                PDF proof pack builder
              </h4>
              <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
                Compile invoices, chat logs, and defect photos with SHA-256 integrity hashes for airtight legal standing.
              </p>
            </div>
            <div className="pt-2 border-t border-steel-grey-100 flex items-center justify-between text-xs font-medium text-steel-grey-600 group-hover:text-charcoal transition-colors">
              <span>Build proof pack</span>
              <ArrowRight className="w-3.5 h-3.5 text-coral" />
            </div>
          </Card>

          <Card
            variant="default"
            className="p-5 flex flex-col justify-between space-y-3 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 transition-[border-color] cursor-pointer group"
            onClick={() => router.push('/app/help')}
          >
            <div className="space-y-1.5 text-left">
              <span className="text-xs font-medium text-coral">
                Statutory escalation
              </span>
              <h4 className="text-base font-medium text-charcoal group-hover:text-coral transition-colors">
                Official routes & decision tree
              </h4>
              <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
                Direct connections to National Consumer Helpline (1915), e-Jagriti Commission, and RBI Ombudsman.
              </p>
            </div>
            <div className="pt-2 border-t border-steel-grey-100 flex items-center justify-between text-xs font-medium text-steel-grey-600 group-hover:text-charcoal transition-colors">
              <span>Explore official routes</span>
              <ArrowRight className="w-3.5 h-3.5 text-coral" />
            </div>
          </Card>
        </div>
      </div>

      {/* Intake Modal */}
      <IntakeModal
        isOpen={isIntakeOpen}
        onClose={() => {
          setIsIntakeOpen(false);
          loadCases();
        }}
      />
    </div>
  );
};
