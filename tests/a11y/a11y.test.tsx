import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import axe from 'axe-core';
import { StatusChip } from '@/design-system/components/StatusChip';
import { CaseCard } from '@/design-system/components/CaseCard';
import { MoneyDisplay } from '@/design-system/components/MoneyDisplay';
import { Stepper } from '@/design-system/components/Stepper';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Input } from '@/design-system/components/Input';
import { ToggleSwitch } from '@/design-system/components/ToggleSwitch';
import { CheckboxStrike } from '@/design-system/components/CheckboxStrike';
import { CopyButton } from '@/design-system/components/CopyButton';
import { NumberStepper } from '@/design-system/components/NumberStepper';
import { ProgressRing } from '@/design-system/components/ProgressRing';
import { Accordion } from '@/design-system/components/Accordion';
import { SegmentedControl } from '@/design-system/components/SegmentedControl';
import { SwipeRow } from '@/design-system/components/SwipeRow';

async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
    rules: {
      // Region/landmark checks can be skipped on isolated unit primitives
      region: { enabled: false },
    },
  });

  const seriousViolations = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  if (seriousViolations.length > 0) {
    const errorMessages = seriousViolations
      .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`)
      .join('\n');
    throw new Error(`axe-core accessibility violations found:\n${errorMessages}`);
  }

  expect(seriousViolations.length).toBe(0);
}

describe('Accessibility Audits (axe-core WCAG 2.2 AA)', () => {
  it('StatusChip passes WCAG 2.2 AA rules', async () => {
    const { container } = render(<StatusChip status="action_required" />);
    await expectNoViolations(container);
  });

  it('CaseCard passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <CaseCard
        caseData={{
          id: 'RS-A11Y',
          title: 'Defective phone case',
          issueType: 'Damaged or defective',
          company: 'Test Mart',
          amount: 499,
          status: 'action_required',
          nextAction: 'Upload photo proof',
          updatedAt: new Date().toISOString(),
        }}
      />
    );
    await expectNoViolations(container);
  });

  it('MoneyDisplay passes WCAG 2.2 AA rules', async () => {
    const { container } = render(<MoneyDisplay amount={2499} label="Claim Amount" />);
    await expectNoViolations(container);
  });

  it('Stepper passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <Stepper
        steps={[
          { id: 1, label: 'Problem' },
          { id: 2, label: 'Evidence' },
          { id: 3, label: 'Review' },
        ]}
        currentStep={1}
      />
    );
    await expectNoViolations(container);
  });

  it('Form Input with explicit label passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <Input
        label="Order Reference Number"
        placeholder="e.g. OD123456"
        hint="Found in your confirmation email"
      />
    );
    await expectNoViolations(container);
  });

  it('EmptyState passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <EmptyState
        title="No cases found"
        description="Try adjusting your filter or start a new case."
        actionLabel="Start Case"
        onAction={() => {}}
      />
    );
    await expectNoViolations(container);
  });

  it('ToggleSwitch passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <ToggleSwitch id="a11y-toggle" label="SMS Alerts" checked={true} onChange={() => {}} />
    );
    await expectNoViolations(container);
  });

  it('CheckboxStrike passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <CheckboxStrike label="Check UPI refund status" checked={false} onChange={() => {}} />
    );
    await expectNoViolations(container);
  });

  it('CopyButton passes WCAG 2.2 AA rules', async () => {
    const { container } = render(<CopyButton value="RESOLVE-100" label="case ID" />);
    await expectNoViolations(container);
  });

  it('NumberStepper passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <NumberStepper label="Return days" value={7} min={0} max={30} onChange={() => {}} />
    );
    await expectNoViolations(container);
  });

  it('ProgressRing passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <ProgressRing progress={75} aria-label="Outcome progress" />
    );
    await expectNoViolations(container);
  });

  it('Accordion passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <Accordion
        items={[
          { id: '1', title: 'How does NCH work?', content: 'Free helpline for Indian consumers.' },
        ]}
      />
    );
    await expectNoViolations(container);
  });

  it('SegmentedControl passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <SegmentedControl
        value="open"
        options={[
          { id: 'open', label: 'Open cases' },
          { id: 'resolved', label: 'Resolved cases' },
        ]}
        onChange={() => {}}
      />
    );
    await expectNoViolations(container);
  });

  it('SwipeRow passes WCAG 2.2 AA rules', async () => {
    const { container } = render(
      <SwipeRow onDelete={() => {}} actionLabel="Delete reminder">
        <div>Follow-up reminder row</div>
      </SwipeRow>
    );
    await expectNoViolations(container);
  });
});

