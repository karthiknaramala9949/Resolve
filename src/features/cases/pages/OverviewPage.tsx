'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CaseCard, EmptyState } from '@/design-system';
import { Plus, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { caseRepository } from '@/lib/db/repositories';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl bg-white border border-steel-grey-200 shadow-xs">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-steel-grey-50 text-steel-grey-700 border border-steel-grey-200 text-xs font-semibold mb-3 leading-none select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
            <span>Customer-controlled dispute support</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black font-sans text-charcoal tracking-tight">
            Sort it out. One step at a <span className="text-coral">time</span>.
          </h2>
          <p className="mt-2 text-base text-steel-grey-600 leading-relaxed font-normal">
            Every step requires your explicit approval. RESOLVE-ONE never contacts anyone, files complaints, or claims legal authority without you.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsIntakeOpen(true)}
            className="w-full md:w-auto shadow-sm"
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span>Tell Us What Happened</span>
          </Button>
        </div>
      </div>

      {/* Metrics & Case Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card variant="default" className="p-4 md:p-5 bg-white border border-steel-grey-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-steel-grey-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Disputes</span>
            <AlertCircle className="w-4 h-4 text-coral" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-charcoal tabular-nums">
            {activeCount}
          </div>
          <p className="mt-1 text-xs text-steel-grey-600">Under your management</p>
        </Card>

        <Card variant="default" className="p-4 md:p-5 bg-white border border-steel-grey-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-steel-grey-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Action Needed</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-amber-600 tabular-nums">
            {actionRequiredCount}
          </div>
          <p className="mt-1 text-xs text-steel-grey-600">Next step pending</p>
        </Card>

        <Card variant="default" className="p-4 md:p-5 bg-white border border-steel-grey-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-steel-grey-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting Company</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-blue-600 tabular-nums">
            {waitingCompanyCount}
          </div>
          <p className="mt-1 text-xs text-steel-grey-600">Response window</p>
        </Card>

        <Card variant="default" className="p-4 md:p-5 bg-white border border-steel-grey-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-steel-grey-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-emerald-600 tabular-nums">
            {resolvedCount}
          </div>
          <p className="mt-1 text-xs text-steel-grey-600">Verified by bank check</p>
        </Card>
      </div>

      {/* Dominant Next Step Card (Signature Feature #2) */}
      {priorityCase && nextStep && (
        <Card variant="elevated" className="border border-steel-grey-200 border-l-4 border-l-coral bg-white p-6 rounded-2xl shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-coral">
                  Priority Next Action
                </span>
                <span className="text-xs text-steel-grey-300">•</span>
                <span className="text-xs text-steel-grey-500 font-mono">{priorityCase.id}</span>
              </div>
              <h3 className="text-lg font-bold text-charcoal">
                {nextStep.action}
              </h3>
              <p className="text-sm text-steel-grey-600">
                {nextStep.reason}
              </p>
            </div>

            <div className="shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push(`/app/cases/${priorityCase.id}`)}
                className="w-full md:w-auto shadow-sm"
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
          <h3 className="text-xl font-bold font-sans text-charcoal">
            Recent Cases
          </h3>
          {cases.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/app/cases')}
              className="text-sm font-bold text-charcoal hover:text-coral inline-flex items-center gap-1 leading-none transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>

        {cases.length === 0 ? (
          <EmptyState
            icon="cases"
            title="No active disputes yet"
            description="When a store rejects your refund, delays delivery, or denies return, start your case here to organize proof and generate official letters."
            action={{
              label: 'Tell Us What Happened',
              onClick: () => setIsIntakeOpen(true),
            }}
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
        <h3 className="text-xl font-bold font-sans text-charcoal">
          Essential Consumer Tools
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            variant="default"
            className="p-5 flex flex-col justify-between space-y-3 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => router.push('/app/purchases')}
          >
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Return Vault
              </span>
              <h4 className="text-base font-bold text-charcoal group-hover:text-coral transition-colors">
                Return Window Countdown
              </h4>
              <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
                Never forfeit your statutory right to return. Automatically calculates return deadlines from delivery dates.
              </p>
            </div>
            <div className="pt-2 border-t border-steel-grey-100 flex items-center justify-between text-xs font-bold text-charcoal group-hover:text-coral transition-colors">
              <span>View return countdowns</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-coral" />
            </div>
          </Card>

          <Card
            variant="default"
            className="p-5 flex flex-col justify-between space-y-3 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => router.push('/app/documents')}
          >
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Evidence Vault
              </span>
              <h4 className="text-base font-bold text-charcoal group-hover:text-coral transition-colors">
                PDF Proof Pack Builder
              </h4>
              <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
                Compile invoices, chat logs, and defect photos with SHA-256 integrity hashes for airtight legal standing.
              </p>
            </div>
            <div className="pt-2 border-t border-steel-grey-100 flex items-center justify-between text-xs font-bold text-charcoal group-hover:text-coral transition-colors">
              <span>Build proof pack</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-coral" />
            </div>
          </Card>

          <Card
            variant="default"
            className="p-5 flex flex-col justify-between space-y-3 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => router.push('/app/help')}
          >
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Statutory Escalation
              </span>
              <h4 className="text-base font-bold text-charcoal group-hover:text-coral transition-colors">
                Official India Routes & Decision Tree
              </h4>
              <p className="text-xs text-steel-grey-600 leading-relaxed font-normal">
                Direct connections to National Consumer Helpline (1915), e-Jagriti Commission, and RBI Ombudsman.
              </p>
            </div>
            <div className="pt-2 border-t border-steel-grey-100 flex items-center justify-between text-xs font-bold text-charcoal group-hover:text-coral transition-colors">
              <span>Explore official routes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-coral" />
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
