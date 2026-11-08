import { Case } from '../db/types';

export interface NextStepRecommendation {
  action: string;
  reason: string;
  priority: 'High' | 'Normal' | 'Low';
  suggestedRoute?: string;
}

export function computeNextStep(c: Case): NextStepRecommendation {
  const now = Date.now();
  const daysSinceUpdate = Math.floor(
    (now - new Date(c.updatedAt || c.createdAt || now).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (c.status === 'resolved') {
    return {
      action: 'Case confirmed resolved. Save proof pack for your records.',
      reason: 'You confirmed in your bank account that the resolution or refund was completed.',
      priority: 'Low',
    };
  }

  if (c.status === 'closed') {
    return {
      action: 'Case is closed. No further action pending.',
      reason: 'This dispute record has been archived.',
      priority: 'Low',
    };
  }

  // 1. Missing Essential Facts
  if (!c.company || c.company.trim() === '') {
    return {
      action: 'Add company or merchant name',
      reason: 'Every formal complaint or NCH docket requires identifying the seller entity.',
      priority: 'High',
    };
  }

  if (!c.orderRef || c.orderRef.trim() === '') {
    return {
      action: 'Add order, ticket, or booking reference number',
      reason: 'Merchant customer care and National Consumer Helpline require a valid transaction ID to track records.',
      priority: 'Normal',
    };
  }

  // 2. Evidence Gaps
  const evidenceCount = (c.evidence || []).length;
  if ((c.issueType === 'Damaged or defective' || c.issueType === 'Wrong or missing item') && evidenceCount === 0) {
    return {
      action: 'Add a clear photo of the defect or unboxing package',
      reason: 'Refunds for damaged or missing items are almost always decided on photographic proof. Add unedited images before proceeding.',
      priority: 'High',
    };
  }

  // 3. Waiting for Company checks
  if (c.status === 'waiting_company') {
    if (c.threeStateOutcome?.companyStated && !c.threeStateOutcome?.customerConfirmed) {
      return {
        action: 'Compare company refund claim against your UPI / bank statement',
        reason: 'The merchant claims a refund was processed. Do not close until you verify the funds are credited in your account.',
        priority: 'High',
      };
    }

    if (daysSinceUpdate >= 7) {
      return {
        action: 'Follow up with customer support or escalate to NCH 1915',
        reason: `No update has been recorded for ${daysSinceUpdate} days. Consumer protection norms specify standard 48-72 hour response windows.`,
        priority: 'High',
        suggestedRoute: 'National Consumer Helpline (1915)',
      };
    }

    return {
      action: 'Await company response window (standard 48-72 hours)',
      reason: 'You logged that the complaint was submitted. Allow the merchant reasonable time to respond before escalating.',
      priority: 'Normal',
    };
  }

  // 4. Response Received
  if (c.status === 'response_received') {
    return {
      action: 'Review company offer or rejection reason',
      reason: 'The company has sent a reply. Decide whether to accept their proposed resolution or escalate to official authorities.',
      priority: 'High',
    };
  }

  // 5. Default Action Required
  return {
    action: 'Copy formal dispute letter and lodge ticket via company portal',
    reason: 'Your facts and proof are organized. Submit your initial formal ticket to give the seller an opportunity to resolve.',
    priority: 'Normal',
  };
}

