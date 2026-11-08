import { Case } from '../db/types';
import { formatINR } from '../utils';

export function formatComplaintLetter(c: Case): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `FORMAL GRIEVANCE NOTICE
Date: ${dateStr}

To:
Grievance Officer / Customer Support
${c.company || 'Merchant / Service Provider'}

Subject: Formal Grievance regarding Order #${c.orderRef || '[Order Number]'} — ${c.issueType}

Dear Sir/Madam,

I am writing to formally lodge a grievance regarding my transaction for "${c.product || 'the purchased item'}" (Order Reference: ${c.orderRef || 'N/A'}), purchased on ${c.purchasedAt || 'recent date'} for an amount of ${formatINR(c.amount)}.

STATEMENT OF ISSUE:
${c.description}

DEMANDED RESOLUTION:
In accordance with consumer rights under the Consumer Protection Act, 2019, I request a prompt ${c.desiredOutcome || 'full refund of ' + formatINR(c.amount)} to my original payment source.

SUPPORTING EVIDENCE:
Supporting proof including invoice, delivery receipts, and photographic evidence with cryptographic SHA-256 verification hashes have been prepared and are available for inspection.

I look forward to your written response and resolution within the standard 48 to 72 hours turnaround period, failing which I reserve the right to escalate this matter to the National Consumer Helpline (1915 / consumerhelpline.gov.in) and the appropriate Consumer Commission (e-Jagriti).

Yours sincerely,
[Your Name]
[Your Registered Phone / Email]`;
}

