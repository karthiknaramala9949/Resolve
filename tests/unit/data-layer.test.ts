import { describe, it, expect, beforeEach } from 'vitest';
import { ResolveOneDB } from '@/lib/db/db';
import { DexieCaseRepository } from '@/lib/db/repositories/DexieCaseRepository';
import { DexieEvidenceRepository } from '@/lib/db/repositories/DexieEvidenceRepository';
import { detectV1Data, migrateV1Data } from '@/lib/migrate/v1Migrator';

describe('Data Layer & Repositories', () => {
  let testDb: ResolveOneDB;
  let caseRepo: DexieCaseRepository;
  let evidenceRepo: DexieEvidenceRepository;

  beforeEach(async () => {
    testDb = new ResolveOneDB();
    await testDb.delete();
    await testDb.open();
    caseRepo = new DexieCaseRepository(testDb);
    evidenceRepo = new DexieEvidenceRepository(testDb);
  });

  it('creates and retrieves a case via CaseRepository', async () => {
    const created = await caseRepo.create({
      id: 'RS-TEST-01',
      title: 'Missing Delivery Package',
      issueType: 'Delivery problem',
      company: 'Speedy Express',
      amount: 1500,
      description: 'Package shows delivered but never arrived at my address.',
      status: 'action_required',
      timeline: [],
      evidence: [],
    });

    expect(created.id).toBe('RS-TEST-01');
    expect(created.createdAt).toBeDefined();
    expect(created.timeline.length).toBeGreaterThan(0); // Auto-logs creation event

    const fetched = await caseRepo.getById('RS-TEST-01');
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Missing Delivery Package');
    expect(fetched?.company).toBe('Speedy Express');
  });

  it('filters and searches cases accurately', async () => {
    await caseRepo.create({
      id: 'RS-A',
      title: 'Earbuds broken',
      issueType: 'Damaged or defective',
      company: 'Tech Mart',
      description: 'One earbud dead',
      status: 'action_required',
      timeline: [],
      evidence: [],
    });

    await caseRepo.create({
      id: 'RS-B',
      title: 'Refund delayed',
      issueType: 'Refund not received',
      company: 'Cloth Shop',
      description: 'Waiting for 2 weeks',
      status: 'waiting_company',
      timeline: [],
      evidence: [],
    });

    // Filter by status
    const waitingCases = await caseRepo.getAll({ status: 'waiting_company' });
    expect(waitingCases.length).toBe(1);
    expect(waitingCases[0].id).toBe('RS-B');

    // Search by keyword
    const searchResults = await caseRepo.getAll({ search: 'Tech Mart' });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].id).toBe('RS-A');
  });

  it('adds timeline events to an existing case', async () => {
    await caseRepo.create({
      id: 'RS-TIME',
      title: 'Wrong Item',
      issueType: 'Wrong or missing item',
      company: 'Shoe Hub',
      description: 'Sent wrong size',
      status: 'action_required',
      timeline: [],
      evidence: [],
    });

    const event = await caseRepo.addTimelineEvent('RS-TIME', {
      title: 'Customer called support',
      detail: 'Representative promised resolution in 48 hours.',
      source: 'customer',
    });

    expect(event.id).toBeDefined();
    expect(event.title).toBe('Customer called support');

    const updated = await caseRepo.getById('RS-TIME');
    expect(updated?.timeline[0].title).toBe('Customer called support');
  });

  it('calculates SHA-256 fingerprint for evidence files', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('Hello RESOLVE-ONE evidence hash');
    const hash = await evidenceRepo.calculateSHA256(data.buffer);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('Legacy Prototype Migration', () => {
  it('detects and migrates resolve-one-prototype-v1 data into Dexie', async () => {
    const legacyPayload = {
      cases: [
        {
          id: 'RS-MIG-1',
          title: 'Old refund issue',
          issueType: 'Refund not received',
          company: 'Legacy Store',
          amount: 899,
          description: 'Migrated case from prototype v1',
          status: 'waiting_company',
          createdAt: '2026-10-01T12:00:00Z',
          updatedAt: '2026-10-05T12:00:00Z',
          evidence: [
            {
              id: 'EV-MIG-1',
              name: 'invoice.pdf',
              mime: 'application/pdf',
              size: 1024,
            },
          ],
          timeline: [
            {
              id: 'T-MIG-1',
              at: '2026-10-01T12:00:00Z',
              title: 'Legacy case created',
              detail: 'Imported from old format',
              source: 'sample',
            },
          ],
        },
      ],
      purchases: [
        {
          id: 'PUR-MIG-1',
          store: 'Legacy Shop',
          product: 'Leather Wallet',
          amount: 499,
          returnWindowDays: 14,
        },
      ],
      reminders: [
        {
          id: 'REM-MIG-1',
          caseId: 'RS-MIG-1',
          title: 'Follow up on refund',
          date: '2026-10-10',
          done: false,
        },
      ],
    };

    localStorage.setItem('resolve-one-prototype-v1', JSON.stringify(legacyPayload));

    expect(await detectV1Data()).toBe(true);
    const report = await migrateV1Data();

    expect(report.success).toBe(true);
    expect(report.casesCount).toBe(1);
    expect(report.purchasesCount).toBe(1);
    expect(report.remindersCount).toBe(1);
    expect(report.errors).toHaveLength(0);

    // Verify backup key was created
    const keys = Object.keys(localStorage);
    const backupKey = keys.find((k) => k.startsWith('resolve-one-backup-v1-'));
    expect(backupKey).toBeDefined();

    localStorage.clear();
  });
});

