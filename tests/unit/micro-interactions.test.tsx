import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ToggleSwitch,
  CheckboxStrike,
  Button,
  Input,
  CopyButton,
  NumberStepper,
  ProgressRing,
  Accordion,
  SegmentedControl,
  SwipeRow,
} from '@/design-system';
import { PasswordInput } from '@/features/auth/components/PasswordInput';

describe('Group 4 Micro-Interactions & Accessible Primitives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ToggleSwitch (Settings & Preferences)', () => {
    it('renders with role="switch", label, and correct aria-checked', () => {
      const handleChange = vi.fn();
      render(
        <ToggleSwitch
          id="sms-notifications"
          label="SMS Updates"
          checked={false}
          onChange={handleChange}
        />
      );

      const toggle = screen.getByRole('switch', { name: /sms updates/i });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(toggle);
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('toggles using keyboard Space and Enter keys', () => {
      const handleChange = vi.fn();
      render(
        <ToggleSwitch
          id="email-alerts"
          label="Email Alerts"
          checked={true}
          onChange={handleChange}
        />
      );

      const toggle = screen.getByRole('switch', { name: /email alerts/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.keyDown(toggle, { key: ' ' });
      expect(handleChange).toHaveBeenCalledWith(false);

      fireEvent.keyDown(toggle, { key: 'Enter' });
      expect(handleChange).toHaveBeenCalledTimes(2);
    });

    it('does not fire onChange when disabled', () => {
      const handleChange = vi.fn();
      render(
        <ToggleSwitch
          id="disabled-switch"
          label="Locked Setting"
          checked={false}
          disabled={true}
          onChange={handleChange}
        />
      );

      const toggle = screen.getByRole('switch', { name: /locked setting/i });
      fireEvent.click(toggle);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('CheckboxStrike (Checklist & Reminders)', () => {
    it('renders with role="checkbox", aria-checked, and triggers strikethrough', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <CheckboxStrike
          label="Follow up with store"
          checked={false}
          onChange={handleChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /follow up with store/i });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByText('Follow up with store')).not.toHaveClass('line-through');

      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalledWith(true);

      rerender(
        <CheckboxStrike
          label="Follow up with store"
          checked={true}
          onChange={handleChange}
        />
      );
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByText('Follow up with store')).toHaveClass('line-through');
    });

    it('toggles with keyboard Space key', () => {
      const handleChange = vi.fn();
      render(
        <CheckboxStrike
          label="Review bank statement"
          checked={false}
          onChange={handleChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /review bank statement/i });
      fireEvent.keyDown(checkbox, { key: ' ' });
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Button (Loading-to-Success transition & active state)', () => {
    it('renders checkmark and announces success when isSuccess is true', () => {
      render(
        <Button variant="primary" isSuccess={true} successText="Saved">
          Save changes
        </Button>
      );

      expect(screen.getByText('Saved')).toBeInTheDocument();
      const checkmark = document.querySelector('.lucide-check');
      expect(checkmark).toBeInTheDocument();
    });

    it('renders accessible live region for screen readers', () => {
      render(
        <Button variant="primary" isLoading={true}>
          Submitting
        </Button>
      );

      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Input & PasswordInput (Error shake & reveal)', () => {
    it('applies animate-shake and aria-invalid on input error', () => {
      render(
        <Input
          label="Amount"
          error="Amount is required"
        />
      );

      const input = screen.getByLabelText(/amount/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveClass('animate-shake');
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
    });

    it('toggles password visibility with accessible button and aria-label', () => {
      render(
        <PasswordInput
          label="Password"
          value="secret123"
          onChange={() => {}}
        />
      );

      const input = screen.getByLabelText(/^password/i);
      expect(input).toHaveAttribute('type', 'password');

      const revealBtn = screen.getByRole('button', { name: /show password/i });
      fireEvent.click(revealBtn);

      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
    });
  });

  describe('CopyButton (Share/Copy Link with feedback)', () => {
    it('copies value to clipboard and shows "Copied!" feedback', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(<CopyButton value="RESOLVE-CASE-9921" label="case number" />);

      const copyBtn = screen.getByRole('button', { name: /copy case number/i });
      expect(copyBtn).toBeInTheDocument();

      fireEvent.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith('RESOLVE-CASE-9921');

      // Feedback state
      expect(await screen.findByText('Copied!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copied case number to clipboard/i })).toBeInTheDocument();
    });
  });

  describe('NumberStepper (Quantity / Return & Warranty limits)', () => {
    it('increments and decrements within bounds', () => {
      const handleChange = vi.fn();
      render(
        <NumberStepper
          label="Return window"
          unit="days"
          value={7}
          min={0}
          max={14}
          onChange={handleChange}
        />
      );

      const incrementBtn = screen.getByRole('button', { name: /increase return window/i });
      const decrementBtn = screen.getByRole('button', { name: /decrease return window/i });

      fireEvent.click(incrementBtn);
      expect(handleChange).toHaveBeenCalledWith(8);

      fireEvent.click(decrementBtn);
      expect(handleChange).toHaveBeenCalledWith(6);
    });

    it('respects min and max bounds', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <NumberStepper
          label="Days"
          value={0}
          min={0}
          max={10}
          onChange={handleChange}
        />
      );

      const decrementBtn = screen.getByRole('button', { name: /decrease days/i });
      expect(decrementBtn).toBeDisabled();

      rerender(
        <NumberStepper
          label="Days"
          value={10}
          min={0}
          max={10}
          onChange={handleChange}
        />
      );

      const incrementBtn = screen.getByRole('button', { name: /increase days/i });
      expect(incrementBtn).toBeDisabled();
    });

    it('supports ArrowUp and ArrowDown keyboard inputs', () => {
      const handleChange = vi.fn();
      render(
        <NumberStepper
          label="Days"
          value={5}
          min={0}
          max={30}
          onChange={handleChange}
        />
      );

      const spinbutton = screen.getByRole('spinbutton', { name: /days/i });
      fireEvent.keyDown(spinbutton, { key: 'ArrowUp' });
      expect(handleChange).toHaveBeenCalledWith(6);

      fireEvent.keyDown(spinbutton, { key: 'ArrowDown' });
      expect(handleChange).toHaveBeenCalledWith(4);
    });
  });

  describe('ProgressRing (Dispute resolution & Uploads)', () => {
    it('renders with role="progressbar" and correct ARIA percentage values', () => {
      render(
        <ProgressRing
          progress={66}
          size={48}
          strokeWidth={4}
          aria-label="Dispute resolution progress"
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '66');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('SegmentedControl (View / Plan switches & tabs)', () => {
    it('renders options as tabs with aria-selected', () => {
      const handleChange = vi.fn();
      render(
        <SegmentedControl
          ariaLabel="Status filter"
          value="active"
          onChange={handleChange}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'resolved', label: 'Resolved' },
          ]}
        />
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(tabs[2]);
      expect(handleChange).toHaveBeenCalledWith('resolved');
    });

    it('navigates with ArrowRight and ArrowLeft keyboard keys', () => {
      const handleChange = vi.fn();
      render(
        <SegmentedControl
          ariaLabel="Status filter"
          value="all"
          onChange={handleChange}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'resolved', label: 'Resolved' },
          ]}
        />
      );

      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      expect(handleChange).toHaveBeenCalledWith('active');

      fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
      expect(handleChange).toHaveBeenCalledWith('resolved');
    });
  });

  describe('Accordion (Collapsible FAQ & Sections)', () => {
    it('expands and collapses panels with aria-expanded', () => {
      render(
        <Accordion
          items={[
            {
              id: 'faq-1',
              title: 'What is NCH?',
              content: 'National Consumer Helpline is a pre-litigation service.',
            },
            {
              id: 'faq-2',
              title: 'Is RESOLVE-ONE free?',
              content: 'Yes, basic consumer dispute tracking is free.',
            },
          ]}
        />
      );

      const trigger = screen.getByRole('button', { name: /what is nch\?/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('National Consumer Helpline is a pre-litigation service.')).toBeVisible();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('SwipeRow (Accessible swipe-to-delete with screen reader button)', () => {
    it('renders a visible accessible button alternative for keyboard & screen-reader users', () => {
      const handleDelete = vi.fn();
      render(
        <SwipeRow
          onDelete={() => handleDelete('item-123')}
          confirmMessage="Delete this reminder?"
          actionLabel="Delete reminder"
        >
          <div>Reminder item content</div>
        </SwipeRow>
      );

      expect(screen.getByText('Reminder item content')).toBeInTheDocument();

      // Screen-reader / keyboard button alternative
      const deleteButton = screen.getByRole('button', { name: /delete reminder/i });
      expect(deleteButton).toBeInTheDocument();

      // Window confirm mock
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      fireEvent.click(deleteButton);
      expect(confirmSpy).toHaveBeenCalledWith('Delete this reminder?');
      expect(handleDelete).toHaveBeenCalledWith('item-123');
      confirmSpy.mockRestore();
    });
  });
});
