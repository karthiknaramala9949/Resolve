import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { formatINR, formatDate, formatRelativeTime } from '@/lib/utils';
import { StatusChip, CaseStatus } from '@/design-system/components/StatusChip';
import { MoneyDisplay } from '@/design-system/components/MoneyDisplay';
import { CaseCard } from '@/design-system/components/CaseCard';
import { Timeline } from '@/design-system/components/Timeline';

describe('Utility Formatters', () => {
  it('formats INR currency properly according to Indian numbering system', () => {
    expect(formatINR(499)).toMatch(/₹\s*499\.00/);
    expect(formatINR(2499)).toMatch(/₹\s*2,499\.00/);
    expect(formatINR(125000)).toMatch(/₹\s*1,25,000\.00/);
    expect(formatINR(null)).toBe('—');
    expect(formatINR(undefined)).toBe('—');
    expect(formatINR('')).toBe('—');
  });

  it('formats dates properly', () => {
    expect(formatDate('2026-11-08')).toContain('2026');
    expect(formatDate(null)).toBe('—');
  });
});

describe('Design System Primitives', () => {
  it('renders StatusChip correctly for all 5 status states', () => {
    const statuses: CaseStatus[] = [
      'action_required',
      'waiting_company',
      'response_received',
      'resolved',
      'closed',
    ];

    statuses.forEach((status) => {
      const { unmount } = render(<StatusChip status={status} />);
      if (status === 'action_required') {
        expect(screen.getByText('Action required')).toBeInTheDocument();
      } else if (status === 'waiting_company') {
        expect(screen.getByText('Waiting for company')).toBeInTheDocument();
      } else if (status === 'response_received') {
        expect(screen.getByText('Reply received')).toBeInTheDocument();
      } else if (status === 'resolved') {
        expect(screen.getByText('Outcome confirmed')).toBeInTheDocument();
      } else if (status === 'closed') {
        expect(screen.getByText('Closed')).toBeInTheDocument();
      }
      unmount();
    });
  });

  it('renders MoneyDisplay with discrepancy calculation', () => {
    render(
      <MoneyDisplay
        amount={3500}
        discrepancy={{ promised: 4999, received: 3500 }}
      />
    );
    expect(screen.getByText(/3,500/)).toBeInTheDocument();
    expect(screen.getByText(/Difference:.*1,499/)).toBeInTheDocument();
  });

  it('renders CaseCard with scannable details and handles click events', () => {
    const handleClick = vi.fn();
    render(
      <CaseCard
        caseData={{
          id: 'RS-TEST-1',
          title: 'Damaged package received',
          issueType: 'Damaged or defective',
          company: 'Test Mart',
          amount: 1299,
          status: 'action_required',
          nextAction: 'Upload unboxing photo',
          updatedAt: new Date().toISOString(),
        }}
        onClick={handleClick}
      />
    );

    expect(screen.getByText('RS-TEST-1')).toBeInTheDocument();
    expect(screen.getByText('Damaged package received')).toBeInTheDocument();
    expect(screen.getByText('Test Mart')).toBeInTheDocument();
    expect(screen.getByText(/1,299/)).toBeInTheDocument();
    expect(screen.getByText('Upload unboxing photo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Timeline with 3-state outcome verification', () => {
    render(
      <Timeline
        events={[
          {
            id: 'E1',
            at: '2026-11-08T10:00:00Z',
            title: 'Initial complaint filed',
            detail: 'Filed ticket with customer support.',
            source: 'customer',
          },
        ]}
        threeStateOutcome={{
          companyStated: { note: 'Promised refund in 3 days' },
        }}
      />
    );

    expect(screen.getByText('Initial complaint filed')).toBeInTheDocument();
    expect(screen.getByText('Filed ticket with customer support.')).toBeInTheDocument();
    expect(screen.getByText('Promised refund in 3 days')).toBeInTheDocument();
    expect(screen.getByText('Pending your bank check')).toBeInTheDocument();
  });
});

