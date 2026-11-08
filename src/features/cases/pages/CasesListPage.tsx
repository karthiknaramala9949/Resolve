import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, CaseCard, EmptyState, Input, Select } from '@/design-system';
import { Plus, Search } from 'lucide-react';
import { caseRepository } from '@/lib/db/repositories';
import { Case } from '@/lib/db/types';
import { IntakeModal } from '../components/IntakeModal';

export const CasesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<Case[]>([]);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  // Check URL query parameter ?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsIntakeOpen(true);
    }
  }, [searchParams]);

  const loadCases = async () => {
    const items = await caseRepository.getAll({
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
    searchParams.delete('new');
    searchParams.delete('story');
    searchParams.delete('store');
    searchParams.delete('orderRef');
    searchParams.delete('amount');
    searchParams.delete('product');
    setSearchParams(searchParams);
    loadCases();
  };

  const prefill = {
    store: searchParams.get('store') || undefined,
    product: searchParams.get('product') || undefined,
    orderRef: searchParams.get('orderRef') || undefined,
    amount: searchParams.get('amount') ? parseFloat(searchParams.get('amount')!) : undefined,
    story: searchParams.get('story') || undefined,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
            My Cases
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Track and resolve consumer disputes step-by-step.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          className="w-full sm:w-auto shrink-0 shadow-sm"
          onClick={() => setIsIntakeOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span>Tell Us What Happened</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by case ID, store, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="w-full sm:w-56">
          <Select
            aria-label="Filter cases by status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Cases' },
              { value: 'action_required', label: 'Action Required' },
              { value: 'waiting_company', label: 'Waiting for Company' },
              { value: 'response_received', label: 'Reply Received' },
              { value: 'resolved', label: 'Confirmed Resolved' },
            ]}
          />
        </div>
      </div>

      {/* Cases List */}
      {cases.length === 0 ? (
        <EmptyState
          title="No cases match your filter"
          description="Try clearing your search or tell us what happened to start a new dispute case."
          actionLabel="Tell Us What Happened"
          onAction={() => setIsIntakeOpen(true)}
          illustration="cases"
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
              onClick={() => navigate(`/app/cases/${c.id}`)}
            />
          ))}
        </div>
      )}

      {/* 60-Second Conversational Intake Modal */}
      <IntakeModal
        isOpen={isIntakeOpen}
        onClose={handleCloseIntake}
        prefill={prefill}
      />
    </div>
  );
};
