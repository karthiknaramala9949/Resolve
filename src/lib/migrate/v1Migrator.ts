import { db } from '../db/db';
import {
  Case,
  CaseSchema,
  Purchase,
  PurchaseSchema,
  Reminder,
  ReminderSchema,
  PolicySnapshot,
  PolicySnapshotSchema,
} from '../db/types';

export interface MigrationReport {
  success: boolean;
  casesCount: number;
  purchasesCount: number;
  remindersCount: number;
  evidenceBlobsCount: number;
  errors: string[];
}

export async function detectV1Data(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('resolve-one-prototype-v1');
}

export async function migrateV1Data(): Promise<MigrationReport> {
  const report: MigrationReport = {
    success: false,
    casesCount: 0,
    purchasesCount: 0,
    remindersCount: 0,
    evidenceBlobsCount: 0,
    errors: [],
  };

  if (typeof window === 'undefined') {
    report.errors.push('No browser environment.');
    return report;
  }

  const raw = localStorage.getItem('resolve-one-prototype-v1');
  if (!raw) {
    report.errors.push('No resolve-one-prototype-v1 localStorage key found.');
    return report;
  }

  try {
    const parsed = JSON.parse(raw);

    // 1. Migrate Cases
    if (Array.isArray(parsed.cases)) {
      for (const c of parsed.cases) {
        try {
          const validated = CaseSchema.parse({
            id: c.id,
            title: c.title || 'Untitled Case',
            issueType: c.issueType || 'Refund not received',
            company: c.company || 'Unknown Store',
            orderRef: c.orderRef || '',
            product: c.product || '',
            amount: c.amount ? Number(c.amount) : null,
            purchasedAt: c.purchasedAt || '',
            desiredOutcome: c.desiredOutcome || 'Refund',
            description: c.description || '',
            status: c.status || 'action_required',
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || new Date().toISOString(),
            nextAction: c.nextAction || '',
            nextStepReason: '',
            claimedOutcome: c.claimedOutcome || '',
            customerConfirmedOutcome: c.customerConfirmedOutcome || '',
            evidence: Array.isArray(c.evidence)
              ? c.evidence.map((ev: any) => ({
                  id: ev.id,
                  name: ev.name || 'unnamed-file',
                  mime: ev.mime || 'application/octet-stream',
                  size: ev.size || 0,
                  source: ev.source || 'customer_upload',
                  addedAt: ev.addedAt || new Date().toISOString(),
                  sha256: ev.sha256 || '',
                }))
              : [],
            timeline: Array.isArray(c.timeline)
              ? c.timeline.map((t: any) => ({
                  id: t.id,
                  at: t.at || new Date().toISOString(),
                  title: t.title || 'Event',
                  detail: t.detail || '',
                  source: t.source || 'customer',
                }))
              : [],
          });

          await db.cases.put(validated);
          report.casesCount++;
        } catch (err: any) {
          report.errors.push(`Error parsing case ${c.id}: ${err.message}`);
        }
      }
    }

    // 2. Migrate Purchases
    if (Array.isArray(parsed.purchases)) {
      for (const p of parsed.purchases) {
        try {
          const validated = PurchaseSchema.parse({
            id: p.id || `PUR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            store: p.store || 'Unknown',
            product: p.product || 'Purchased Item',
            orderRef: p.orderRef || '',
            amount: p.amount ? Number(p.amount) : null,
            purchaseDate: p.purchaseDate || '',
            deliveryDate: p.deliveryDate || '',
            returnWindowDays: Number(p.returnWindowDays) || 7,
            warrantyMonths: Number(p.warrantyMonths) || 12,
            notes: p.notes || '',
            serialNo: p.serialNo || '',
          });

          await db.purchases.put(validated);
          report.purchasesCount++;
        } catch (err: any) {
          report.errors.push(`Error parsing purchase ${p.id}: ${err.message}`);
        }
      }
    }

    // 3. Migrate Reminders
    if (Array.isArray(parsed.reminders)) {
      for (const r of parsed.reminders) {
        try {
          const validated = ReminderSchema.parse({
            id: r.id || `REM-${Date.now()}`,
            caseId: r.caseId || '',
            title: r.title || 'Reminder',
            date: r.date || new Date().toISOString().slice(0, 10),
            done: !!r.done,
          });

          await db.reminders.put(validated);
          report.remindersCount++;
        } catch (err: any) {
          report.errors.push(`Error parsing reminder ${r.id}: ${err.message}`);
        }
      }
    }

    // 4. Migrate Evidence Blobs from legacy IndexedDB resolve-one-evidence-v1
    if ('indexedDB' in window) {
      try {
        const legacyReq = indexedDB.open('resolve-one-evidence-v1', 1);
        await new Promise<void>((resolve) => {
          legacyReq.onsuccess = async () => {
            const legacyDb = legacyReq.result;
            if (legacyDb.objectStoreNames.contains('files')) {
              const tx = legacyDb.transaction('files', 'readonly');
              const store = tx.objectStore('files');
              const getAllReq = store.getAll();
              getAllReq.onsuccess = async () => {
                const files = getAllReq.result || [];
                for (const f of files) {
                  try {
                    await db.evidenceBlobs.put({
                      id: f.id,
                      blob: f.blob,
                      name: f.name || 'migrated-file',
                      type: f.type || 'application/octet-stream',
                      size: f.size || (f.blob ? f.blob.size : 0),
                      sha256: f.sha256 || '',
                      at: f.at || new Date().toISOString(),
                    });
                    report.evidenceBlobsCount++;
                  } catch {
                    // Blob skipped
                  }
                }
                legacyDb.close();
                resolve();
              };
              getAllReq.onerror = () => {
                legacyDb.close();
                resolve();
              };
            } else {
              legacyDb.close();
              resolve();
            }
          };
          legacyReq.onerror = () => resolve();
          legacyReq.onblocked = () => resolve();
        });
      } catch (err: any) {
        report.errors.push(`Legacy evidence IndexedDB error: ${err.message}`);
      }
    }

    // Backup old key safely
    const backupKey = `resolve-one-backup-v1-${Date.now()}`;
    localStorage.setItem(backupKey, raw);

    report.success = true;
    return report;
  } catch (err: any) {
    report.errors.push(`Critical migration error: ${err.message}`);
    return report;
  }
}

/**
 * Initializes the database with rich sample data if empty.
 */
export async function initializeDatabaseWithSampleData(): Promise<void> {
  const caseCount = await db.cases.count();
  if (caseCount > 0) return; // Already has data

  const now = Date.now();
  const sampleCases: Case[] = [
    {
      id: 'RS-00492',
      title: 'Refund not received for phone case',
      issueType: 'Refund not received',
      company: 'Example Store',
      orderRef: 'EX-2048',
      product: 'Silicone Shockproof Phone Case',
      amount: 499,
      purchasedAt: '2026-10-28',
      desiredOutcome: 'Refund',
      description:
        'I returned the phone case via pickup on Oct 30, but the refund has not appeared in my bank account yet. The store return status shows completed. I want the ₹499 refund to be credited.',
      status: 'waiting_company',
      createdAt: new Date(now - 5 * 86400000).toISOString(),
      updatedAt: new Date(now - 1 * 86400000).toISOString(),
      nextAction: 'Check company response against your bank UPI record.',
      nextStepReason:
        'The store states a refund was initiated 4 days ago. NPCI UPI banking settlement requires 2-4 business days. Compare your bank statement before following up.',
      claimedOutcome: 'Refund initiated (store notification)',
      customerConfirmedOutcome: '',
      threeStateOutcome: {
        companyStated: {
          date: '2026-11-04',
          amount: 499,
          note: 'Store email claims ₹499 initiated via UPI.',
        },
        evidenceFound: {
          date: '2026-11-01',
          reference: 'AWB-8839120',
          note: 'Return pickup receipt attached.',
        },
        customerConfirmed: undefined,
      },
      evidence: [
        {
          id: 'EV-1001',
          name: 'order-invoice.pdf',
          mime: 'application/pdf',
          size: 245760,
          source: 'customer_upload',
          addedAt: new Date(now - 4 * 86400000).toISOString(),
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        },
        {
          id: 'EV-1002',
          name: 'return-pickup-receipt.png',
          mime: 'image/png',
          size: 1048576,
          source: 'customer_upload',
          addedAt: new Date(now - 4 * 86400000).toISOString(),
          sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        },
      ],
      timeline: [
        {
          id: 'T-1',
          at: new Date(now - 5 * 86400000).toISOString(),
          title: 'Case created',
          detail: 'Problem and order details saved in local database.',
          source: 'customer',
        },
        {
          id: 'T-2',
          at: new Date(now - 4 * 86400000).toISOString(),
          title: 'Evidence logged',
          detail: 'Invoice and return confirmation uploaded with SHA-256 hashes.',
          source: 'evidence',
        },
        {
          id: 'T-3',
          at: new Date(now - 1 * 86400000).toISOString(),
          title: 'Company stated refund initiated',
          detail: 'Store email notification recorded claiming ₹499 sent.',
          source: 'company',
        },
      ],
      tags: ['Refund', 'UPI', 'Accessories'],
      assignee: 'You',
    },
    {
      id: 'RS-00486',
      title: 'Return request rejected for wireless earbuds',
      issueType: 'Return or replacement issue',
      company: 'Sample Market',
      orderRef: 'SM-7761',
      product: 'Wireless Noise-Canceling Earbuds',
      amount: 2499,
      purchasedAt: '2026-10-30',
      desiredOutcome: 'Replacement',
      description:
        'My earbuds arrived with one side dead on arrival. I requested a return within 48 hours, but the seller rejected it citing non-returnable category policy. I need replacement or full refund under Consumer Protection Act.',
      status: 'action_required',
      createdAt: new Date(now - 3 * 86400000).toISOString(),
      updatedAt: new Date(now - 2 * 86400000).toISOString(),
      nextAction: 'Add a clear photo or short unboxing video of the defect.',
      nextStepReason:
        'Sellers frequently reject electronic returns automatically. Clear photo proof of the serial number and defect overrides automated refusal under CPA 2019 guidelines.',
      claimedOutcome: 'Return request rejected by seller',
      customerConfirmedOutcome: '',
      threeStateOutcome: {
        companyStated: {
          date: '2026-11-02',
          note: 'Seller automated rejection: Non-returnable item',
        },
      },
      evidence: [
        {
          id: 'EV-1003',
          name: 'order-summary.pdf',
          mime: 'application/pdf',
          size: 184320,
          source: 'customer_upload',
          addedAt: new Date(now - 2 * 86400000).toISOString(),
          sha256: 'bc9e73d3ea7e20e8b3b3a0df47a4f913d8a5fb3f9cfbfa23b20e0ffb304c478a',
        },
      ],
      timeline: [
        {
          id: 'T-4',
          at: new Date(now - 3 * 86400000).toISOString(),
          title: 'Case created',
          detail: 'Return rejection recorded.',
          source: 'customer',
        },
        {
          id: 'T-5',
          at: new Date(now - 2 * 86400000).toISOString(),
          title: 'Evidence gap noted',
          detail: 'Defect photo recommended before escalating to National Consumer Helpline.',
          source: 'rule_calculation',
        },
      ],
      tags: ['Electronics', 'Defective', 'High Priority'],
      assignee: 'You',
    },
  ];

  for (const c of sampleCases) {
    await db.cases.put(c);
  }

  // Sample purchases
  const samplePurchases: Purchase[] = [
    {
      id: 'PUR-01',
      store: 'Flipkart',
      product: 'Wireless Noise-Canceling Earbuds',
      orderRef: 'OD330192841',
      amount: 2499,
      purchaseDate: '2026-10-30',
      deliveryDate: '2026-11-02',
      returnWindowDays: 7,
      warrantyMonths: 12,
      notes: 'Delivered with left earbud defective',
      serialNo: 'SN-99821038',
    },
    {
      id: 'PUR-02',
      store: 'Amazon India',
      product: 'Mechanical Ergonomic Keyboard',
      orderRef: '402-1928472-918231',
      amount: 4299,
      purchaseDate: '2026-10-15',
      deliveryDate: '2026-10-18',
      returnWindowDays: 10,
      warrantyMonths: 24,
      notes: 'Working normally',
      serialNo: 'KB-8827391',
    },
  ];

  for (const p of samplePurchases) {
    await db.purchases.put(p);
  }

  // Sample reminders
  const sampleReminders: Reminder[] = [
    {
      id: 'REM-01',
      caseId: 'RS-00492',
      title: 'Check refund response from Example Store',
      date: '2026-11-10',
      done: false,
    },
    {
      id: 'REM-02',
      caseId: 'RS-00486',
      title: 'Add photo of wireless earbuds defect',
      date: '2026-11-09',
      done: false,
    },
  ];

  for (const r of sampleReminders) {
    await db.reminders.put(r);
  }
}

