'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, CaseCard, EmptyState, Input, Select } from '@/design-system';
import { Plus, Search } from 'lucide-react';
import { caseService } from '@/services';
import { Case } from '@/lib/db/types';
import { IntakeModal } from '../components/IntakeModal';

export const CasesListPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<Case[]>([]);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  // Check URL query parameter ?new=true
  useEffect(() => {
    if (searchParams?.get('new') === 'true') {
      setIsIntakeOpen(true);
    }
  }, [searchParams]);

  const loadCases = async () => {
    const items = await caseService.listCases({
      status: filter,
      search: search,
    });
    setCases(items);
  };

  useEffect(() => {
    loadCases();
  }, [filter, search]);

  const handleCloseIntake = () => {
    setIsIntakeOpen(false);
    router.replace('/app/cases');
    loadCases();
  };

  const prefill = {
    store: searchParams?.get('store') || undefined,
    product: searchParams?.get('product') || undefined,
    orderRef: searchParams?.get('orderRef') || undefined,
    amount: searchParams?.get('amount') ? parseFloat(searchParams.get('amount')!) : undefined,
    story: searchParams?.get('story') || undefined,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-medium text-charcoal tracking-tight">
            Dispute cases
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 mt-1 font-normal">
            Track and resolve consumer disputes step by step
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          className="w-full sm:w-auto shrink-0 shadow-2xs"
          onClick={() => setIsIntakeOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span>Tell us what happened</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search cases, stores, or products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-steel-grey-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="w-full sm:w-56">
          <Select
            aria-label="Filter cases by status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All cases' },
              { value: 'action_required', label: 'Action needed' },
              { value: 'waiting_company', label: 'Waiting for company' },
              { value: 'response_received', label: 'Reply received' },
              { value: 'resolved', label: 'Resolved' },
            ]}
          />
        </div>
      </div>

      {/* Cases List */}
      {cases.length === 0 ? (
        <EmptyState
          illustration="cases"
          title={search || filter !== 'all' ? 'No cases match your search' : 'No dispute cases yet'}
          description={
            search || filter !== 'all'
              ? 'Try changing your search or filter to see more cases.'
              : 'Tell us what happened with a store or order to create your first case.'
          }
          actionLabel="Tell us what happened"
          onAction={() => setIsIntakeOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c) => (
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

      {/* Intake Modal */}
      <IntakeModal
        isOpen={isIntakeOpen}
        onClose={handleCloseIntake}
        prefill={prefill}
      />
    </div>
  );
};
