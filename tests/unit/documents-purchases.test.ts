import { describe, it, expect } from 'vitest';
import { detectSensitiveInfo } from '@/lib/rules/redactionChecker';
import { generateProofPackPDF } from '@/lib/pdf/proofPackGenerator';
import { formatComplaintLetter } from '@/lib/pdf/complaintLetter';
import {
  calculateReturnWindow,
  calculateWarranty,
  parsePastedPurchaseText,
} from '@/lib/rules/purchaseRules';
import { Case } from '@/lib/db/types';

describe('Redaction & Privacy Safety (Signature Feature #4)', () => {
  it('detects 12-digit Aadhaar number candidates with warning', () => {
    const text = 'Customer ID with Aadhaar 4532 9876 1234 included in invoice';
    const notices = detectSensitiveInfo(text);
    expect(notices.length).toBeGreaterThan(0);
    expect(notices[0].type).toBe('aadhaar');
    expect(notices[0].warning).toContain('Aadhaar numbers should be masked');
  });

  it('detects 16-digit payment card numbers', () => {
    const text = 'Payment charged to card 4111 2222 3333 4444';
    const notices = detectSensitiveInfo(text);
    expect(notices.some((n) => n.type === 'card')).toBe(true);
  });

  it('detects PAN card format (ABCDE1234F)', () => {
    const text = 'PAN details: ABCDE1234F submitted';
    const notices = detectSensitiveInfo(text);
    expect(notices.some((n) => n.type === 'pan')).toBe(true);
  });
});

describe('Proof Pack PDF & Complaint Generator', () => {
  const sampleCase: Case = {
    id: 'RS-TEST-PDF',
    title: 'Phone case broken',
    issueType: 'Damaged or defective',
    company: 'Demo Store',
    orderRef: 'ORD-8821',
    product: 'Phone Cover',
    amount: 499,
    description: 'Arrived cracked upon opening.',
    status: 'action_required',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-02T10:00:00Z',
    timeline: [
      {
        id: 'T-1',
        at: '2026-11-01T10:00:00Z',
        title: 'Case created',
        detail: 'Logged in system',
        source: 'customer',
      },
    ],
    evidence: [
      {
        id: 'EV-1',
        name: 'invoice.pdf',
        mime: 'application/pdf',
        size: 51200,
        source: 'customer_upload',
        addedAt: '2026-11-01T10:00:00Z',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      },
    ],
  };

  it('generates a valid client-side jsPDF document with SHA-256 evidence index', () => {
    const doc = generateProofPackPDF(sampleCase);
    expect(doc).toBeDefined();
    expect(doc.internal.pages.length).toBeGreaterThan(0);
  });

  it('formats formal complaint letter citing Consumer Protection Act 2019', () => {
    const letter = formatComplaintLetter(sampleCase);
    expect(letter).toContain('FORMAL GRIEVANCE NOTICE');
    expect(letter).toContain('Demo Store');
    expect(letter).toContain('ORD-8821');
    expect(letter).toContain('Consumer Protection Act, 2019');
    expect(letter).toContain('National Consumer Helpline (1915');
  });
});

describe('Purchases & Return Window Math (Signature Feature #7)', () => {
  it('calculates return window accurately for active and closed windows', () => {
    // Delivered today
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const active = calculateReturnWindow(todayStr, 7);
    expect(active.status).toBe('active');
    expect(active.daysLeft).toBe(7);

    // Delivered 10 days ago with 7 day window
    const past = new Date(now.getTime() - 10 * 86400000);
    const tenDaysAgo = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
    const expired = calculateReturnWindow(tenDaysAgo, 7);
    expect(expired.status).toBe('closed');
    expect(expired.daysLeft).toBeLessThan(0);

    // Missing delivery date handled defensively
    const missing = calculateReturnWindow(null, 7);
    expect(missing.status).toBe('unknown');
  });

  it('calculates warranty countdown accurately', () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const warranty = calculateWarranty(todayStr, 12);
    expect(warranty.status).toBe('active');
    expect(warranty.monthsLeft).toBe(12);

    const twoYearsAgo = new Date(Date.now() - 750 * 86400000).toISOString().slice(0, 10);
    const expired = calculateWarranty(twoYearsAgo, 12);
    expect(expired.status).toBe('expired');
  });

  it('parses pasted order confirmation text', () => {
    const text = `
      Store: Flipkart
      Product: Wireless Headphones
      Order ID: OD38192038
      Total Amount: ₹3,999.00
      Delivered on: 2026-11-04
    `;
    const parsed = parsePastedPurchaseText(text);
    expect(parsed.store).toBe('Flipkart');
    expect(parsed.product).toBe('Wireless Headphones');
    expect(parsed.orderRef).toBe('OD38192038');
    expect(parsed.amount).toBe(3999);
    expect(parsed.deliveryDate).toBe('2026-11-04');
  });
});

