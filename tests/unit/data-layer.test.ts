import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  caseRepository,
  purchaseRepository,
  reminderRepository,
  evidenceRepository,
} from '@/lib/db/repositories';
import { setSessionToken } from '@/lib/auth/sessionToken';

// In-memory mock storage simulating Convex tables
let convexCases: any[] = [];
let convexPurchases: any[] = [];
let convexReminders: any[] = [];

vi.mock('@/components/providers/ConvexClientProvider', () => ({
  getConvexClient: () => ({
    query: vi.fn(async (queryRef: any, args: any) => {
      // Mock cases list
      if (args && 'status' in args && !('caseId' in args)) {
        let results = [...convexCases];
        if (args.status && args.status !== 'all') {
          results = results.filter((c) => c.status === args.status);
        }
        if (args.search) {
          const q = args.search.toLowerCase();
          results = results.filter(
            (c) =>
              c.title.toLowerCase().includes(q) ||
              c.company.toLowerCase().includes(q) ||
              c.clientGeneratedId.toLowerCase().includes(q)
          );
        }
        return results;
      }

      // Mock cases getById
      if (args && args.id && !('caseId' in args)) {
        return convexCases.find(
          (c) => c._id === args.id || c.clientGeneratedId === args.id
        );
      }

      // Mock purchases list
      if (queryRef?.name === 'purchases:list' || (!('status' in args) && !('caseId' in args) && !('documentId' in args))) {
        return convexPurchases;
      }

      // Mock reminders list
      if (args && 'caseId' in args) {
        if (args.caseId) {
          return convexReminders.filter((r) => r.caseId === args.caseId);
        }
        return convexReminders;
      }

      return [];
    }),

    mutation: vi.fn(async (mutationRef: any, args: any) => {
      // Create case
      if (args.title && args.company && !args.caseId) {
        const newCase = {
          _id: `convex_case_${Date.now()}`,
          clientGeneratedId: args.clientGeneratedId || `RS-${Date.now().toString().slice(-5)}`,
          title: args.title,
          issueType: args.issueType,
          company: args.company,
          amount: args.amount,
          description: args.description,
          status: args.status || 'action_required',
          timeline: [
            ...(args.timeline || []),
            {
              id: `EV-${Date.now()}`,
              at: new Date().toISOString(),
              title: 'Case created',
              detail: 'Dispute registered in RESOLVE-ONE platform.',
              source: 'customer',
            },
          ],
          evidence: args.evidence || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        convexCases.push(newCase);
        return newCase;
      }

      // Add timeline event
      if (args.caseId && args.detail) {
        const found = convexCases.find(
          (c) => c._id === args.caseId || c.clientGeneratedId === args.caseId
        );
        if (found) {
          const event = {
            id: `EV-${Date.now()}`,
            at: new Date().toISOString(),
            title: args.title,
            detail: args.detail,
            source: args.source || 'customer',
          };
          found.timeline.push(event);
          found.updatedAt = new Date().toISOString();
          return event;
        }
      }

      // Update case
      if (args.id && (args.status || args.title)) {
        const found = convexCases.find(
          (c) => c._id === args.id || c.clientGeneratedId === args.id
        );
        if (found) {
          if (args.status) found.status = args.status;
          if (args.title) found.title = args.title;
          found.updatedAt = new Date().toISOString();
          return found;
        }
      }

      // Delete case
      if (args.id && !args.store && !args.date) {
        convexCases = convexCases.filter(
          (c) => c._id !== args.id && c.clientGeneratedId !== args.id
        );
        return { success: true };
      }

      return { success: true };
    }),
  }),
}));

describe('Convex-First Data Layer & Repositories', () => {
  beforeEach(() => {
    convexCases = [];
    convexPurchases = [];
    convexReminders = [];
    setSessionToken('mock-active-session-token');
  });

  it('creates and retrieves a case via CaseRepository backed by Convex', async () => {
    const created = await caseRepository.create({
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

    const fetched = await caseRepository.getById('RS-TEST-01');
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Missing Delivery Package');
    expect(fetched?.company).toBe('Speedy Express');
  });

  it('filters and searches cases accurately in Convex', async () => {
    await caseRepository.create({
      id: 'RS-A',
      title: 'Earbuds broken',
      issueType: 'Damaged or defective',
      company: 'Tech Mart',
      description: 'One earbud dead',
      status: 'action_required',
      timeline: [],
      evidence: [],
    });

    await caseRepository.create({
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
    const waitingCases = await caseRepository.getAll({ status: 'waiting_company' });
    expect(waitingCases.length).toBe(1);
    expect(waitingCases[0].id).toBe('RS-B');

    // Search by keyword
    const searchResults = await caseRepository.getAll({ search: 'Tech Mart' });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].id).toBe('RS-A');
  });

  it('adds timeline events to an existing case in Convex', async () => {
    await caseRepository.create({
      id: 'RS-TIME',
      title: 'Wrong Item',
      issueType: 'Wrong or missing item',
      company: 'Shoe Hub',
      description: 'Sent wrong size',
      status: 'action_required',
      timeline: [],
      evidence: [],
    });

    const event = await caseRepository.addTimelineEvent('RS-TIME', {
      title: 'Customer called support',
      detail: 'Representative promised resolution in 48 hours.',
      source: 'customer',
    });

    expect(event.id).toBeDefined();
    expect(event.title).toBe('Customer called support');

    const updated = await caseRepository.getById('RS-TIME');
    expect(updated?.timeline.some((e) => e.title === 'Customer called support')).toBe(true);
  });

  it('calculates SHA-256 fingerprint for evidence files', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('Hello RESOLVE-ONE evidence hash');
    const hash = await evidenceRepository.calculateSHA256(data.buffer as ArrayBuffer);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
