import { describe, it, expect } from 'vitest';
import { parseComplaintText } from '@/lib/rules/intakeParser';
import { computeNextStep } from '@/lib/rules/nextStepEngine';
import { Case } from '@/lib/db/types';

describe('Intake Rule Parser (Signature Feature #1)', () => {
  it('extracts company, amount, order ID, and issue type from conversational text', () => {
    const text =
      'I ordered a phone case from Example Store on Oct 28 for ₹499. Order #EX-2048. I returned it via pickup but the refund has not appeared in my account.';
    const parsed = parseComplaintText(text);

    expect(parsed.issueType).toBe('Refund not received');
    expect(parsed.amount).toBe(499);
    expect(parsed.orderRef).toBe('EX-2048');
    expect(parsed.desiredOutcome).toBe('Refund');
    expect(parsed.signals.length).toBeGreaterThan(0);
  });

  it('handles Indian currency variants (₹, Rs., Rs, INR, comma separators)', () => {
    const t1 = parseComplaintText('I bought a phone for Rs. 1,299.50 from Flipkart');
    expect(t1.company).toBe('Flipkart');
    expect(t1.amount).toBe(1299.5);

    const t2 = parseComplaintText('Ordered shoes from Myntra for INR 3,499');
    expect(t2.company).toBe('Myntra');
    expect(t2.amount).toBe(3499);

    const t3 = parseComplaintText('Air conditioner worth ₹38,990 from Croma arrived damaged');
    expect(t3.company).toBe('Croma');
    expect(t3.amount).toBe(38990);
    expect(t3.issueType).toBe('Damaged or defective');
  });

  it('detects damaged / defective keywords and suggests replacement', () => {
    const text = 'Earbuds arrived with left side dead on arrival and broken. I want replacement.';
    const parsed = parseComplaintText(text);
    expect(parsed.issueType).toBe('Damaged or defective');
    expect(parsed.desiredOutcome).toBe('Replacement');
  });

  it('extracts date candidates accurately', () => {
    const text = 'Purchased on 2026-10-30 and delivered on 02/11/2026.';
    const parsed = parseComplaintText(text);
    expect(parsed.dateCandidates).toContain('2026-10-30');
    expect(parsed.dateCandidates).toContain('02/11/2026');
  });
});

describe('Next Step Engine (Signature Feature #2)', () => {
  it('recommends adding photo proof for damaged items with 0 evidence', () => {
    const testCase: Case = {
      id: 'RS-DEFECT',
      title: 'Broken screen',
      issueType: 'Damaged or defective',
      company: 'Amazon India',
      orderRef: '402-1234567',
      description: 'Screen was cracked upon opening package.',
      status: 'action_required',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
      evidence: [], // 0 evidence
    };

    const nextStep = computeNextStep(testCase);
    expect(nextStep.priority).toBe('High');
    expect(nextStep.action).toContain('Add a clear photo of the defect');
    expect(nextStep.reason).toContain('Refunds for damaged or missing items are almost always decided on photographic proof');
  });

  it('recommends checking bank statement when company claims refund is initiated', () => {
    const testCase: Case = {
      id: 'RS-REFUND',
      title: 'Refund pending',
      issueType: 'Refund not received',
      company: 'Flipkart',
      orderRef: 'OD-9921',
      description: 'Waiting for refund',
      status: 'waiting_company',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      threeStateOutcome: {
        companyStated: {
          date: '2026-11-04',
          amount: 499,
          note: 'Refund processed via UPI',
        },
        customerConfirmed: undefined, // Not confirmed yet
      },
      timeline: [],
      evidence: [{ id: 'EV-1', name: 'receipt.pdf', mime: 'application/pdf', size: 100, source: 'customer', addedAt: '' }],
    };

    const nextStep = computeNextStep(testCase);
    expect(nextStep.action).toContain('Compare company refund claim against your UPI / bank statement');
    expect(nextStep.priority).toBe('High');
  });

  it('recommends NCH 1915 escalation when waiting for company exceeds 7 days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
    const testCase: Case = {
      id: 'RS-OLD',
      title: 'Delayed issue',
      issueType: 'Delivery problem',
      company: 'Courier Co',
      orderRef: 'AWB-1234',
      description: 'No update',
      status: 'waiting_company',
      createdAt: eightDaysAgo,
      updatedAt: eightDaysAgo,
      timeline: [],
      evidence: [{ id: 'EV-1', name: 'receipt.pdf', mime: 'application/pdf', size: 100, source: 'customer', addedAt: '' }],
    };

    const nextStep = computeNextStep(testCase);
    expect(nextStep.action).toContain('NCH 1915');
    expect(nextStep.priority).toBe('High');
  });
});

