import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CaseCard, MoneyDisplay } from '@/design-system';
import { Plus, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { caseRepository } from '@/lib/db/repositories';
import { Case } from '@/lib/db/types';
import { computeNextStep } from '@/lib/rules/nextStepEngine';
import { IntakeModal } from '../components/IntakeModal';
import { useAppStore } from '@/store/useAppStore';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveCaseCount } = useAppStore();
  const [cases, setCases] = useState<Case[]>([]);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  const loadCases = async () => {
    const all = await caseRepository.getAll();
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-white via-surface-light-subtle to-brand-50/30 dark:from-surface-dark dark:via-surface-dark-subtle dark:to-brand-950/20 border border-neutral-200/80 dark:border-neutral-800 shadow-subtle">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100/60 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 text-xs font-semibold mb-3 leading-none select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
            <span>Customer-controlled dispute support</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-neutral-900 dark:text-neutral-100 tracking-tight">
            Sort it out. <span className="italic text-brand-600 dark:text-brand-400">One step at a time.</span>
          </h2>
          <p className="mt-2 text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Every step requires your explicit approval. RESOLVE-ONE never contacts anyone, files complaints, or claims legal authority without you.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsIntakeOpen(true)}
            className="w-full md:w-auto shadow-elevated"
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span>Tell Us What Happened</span>
          </Button>
        </div>
      </div>

      {/* Metrics & Case Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card variant="default" className="p-4 md:p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Disputes</span>
            <AlertCircle className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
            {activeCount}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Under your management</p>
        </Card>

        <Card variant="default" className="p-4 md:p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Action Needed</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            {actionRequiredCount}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Next step pending</p>
        </Card>

        <Card variant="default" className="p-4 md:p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Company</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
            {waitingCompanyCount}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Response window</p>
        </Card>

        <Card variant="default" className="p-4 md:p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {resolvedCount}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Verified by bank check</p>
        </Card>
      </div>

      {/* Dominant Next Step Card (Signature Feature #2) */}
      {priorityCase && nextStep && (
        <Card variant="elevated" className="border-l-4 border-l-brand-500 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Priority Next Action
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-neutral-500 font-mono">{priorityCase.id}</span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {nextStep.action}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {nextStep.reason}
              </p>
            </div>

            <div className="shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/app/cases/${priorityCase.id}`)}
                className="w-full md:w-auto"
              >
                <span>Take Next Step</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Active Cases Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
            Recent Cases
          </h3>
          <button
            type="button"
            onClick={() => navigate('/app/cases')}
            className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 leading-none"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

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
              onClick={() => navigate(`/app/cases/${c.id}`)}
            />
          ))}
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
