import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clearLocalUserData } from '@/lib/db/db';
import { caseService } from '@/services/caseService';
import { purchaseService } from '@/services/purchaseService';
import { reminderService } from '@/services/reminderService';
import { dashboardService } from '@/services/dashboardService';
import { documentService } from '@/services/documentService';
import { setSessionToken } from '@/lib/auth/sessionToken';
import { setupUserMasterKey, encryptDocument, decryptDocument } from '@/lib/crypto/e2ee';
import { getFunctionName } from 'convex/server';

// In-memory Convex database state
let mockCases: any[] = [];
let mockPurchases: any[] = [];
let mockReminders: any[] = [];
let mockDocuments: any[] = [];

vi.mock('@/components/providers/ConvexClientProvider', () => ({
  getConvexClient: () => ({
    query: vi.fn(async (queryRef: any, args: any) => {
      const fnName = getFunctionName(queryRef);

      if (fnName === 'dashboard:getStats') {
        const activeCount = mockCases.filter(
          (c) => c.status !== 'resolved' && c.status !== 'closed'
        ).length;
        const actionRequiredCount = mockCases.filter((c) => c.status === 'action_required').length;
        const waitingCompanyCount = mockCases.filter((c) => c.status === 'waiting_company').length;
        const resolvedCount = mockCases.filter((c) => c.status === 'resolved').length;
        const totalClaimAmount = mockCases.reduce((sum, c) => sum + (c.amount || 0), 0);

        return {
          activeCount,
          actionRequiredCount,
          waitingCompanyCount,
          resolvedCount,
          totalClaimAmount,
          recentCases: mockCases.slice(0, 5),
          upcomingReminders: mockReminders.filter((r) => !r.done).slice(0, 5),
        };
      }

      if (fnName === 'cases:list') {
        let results = [...mockCases];
        if (args?.status && args.status !== 'all') {
          results = results.filter((c) => c.status === args.status);
        }
        if (args?.search) {
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

      if (fnName === 'cases:getById') {
        return mockCases.find((c) => c._id === args.id || c.clientGeneratedId === args.id);
      }

      if (fnName === 'purchases:list') {
        return [...mockPurchases];
      }

      if (fnName === 'reminders:list') {
        if (args?.caseId) {
          return mockReminders.filter((r) => r.caseId === args.caseId);
        }
        return [...mockReminders];
      }

      if (fnName === 'documents:getDownloadUrl') {
        const doc = mockDocuments.find(
          (d) => d._id === args.documentId || d.storageId === args.documentId
        );
        return {
          downloadUrl: `https://mock-storage.convex.cloud/${args.documentId}`,
          document: doc || { isEncrypted: false },
        };
      }

      return [];
    }),

    mutation: vi.fn(async (mutationRef: any, args: any) => {
      const fnName = getFunctionName(mutationRef);

      if (fnName === 'cases:create') {
        const newCase = {
          _id: `convex_case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          clientGeneratedId: args.clientGeneratedId || `RS-${Date.now().toString().slice(-5)}`,
          title: args.title,
          issueType: args.issueType,
          company: args.company,
          orderRef: args.orderRef,
          product: args.product,
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
          version: 1,
        };
        mockCases.push(newCase);
        return newCase;
      }

      if (fnName === 'cases:update') {
        const found = mockCases.find(
          (c) => c._id === args.id || c.clientGeneratedId === args.id
        );
        if (found) {
          if (args.status) found.status = args.status;
          if (args.title) found.title = args.title;
          if (args.evidence) found.evidence = args.evidence;
          found.updatedAt = new Date().toISOString();
          return found;
        }
      }

      if (fnName === 'cases:setArchived') {
        const found = mockCases.find(
          (c) => c._id === args.id || c.clientGeneratedId === args.id
        );
        if (found) {
          found.status = 'closed';
          found.isArchived = args.isArchived;
          found.updatedAt = new Date().toISOString();
          return found;
        }
      }

      if (fnName === 'cases:addTimelineEvent') {
        const found = mockCases.find(
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

      if (fnName === 'cases:removeEvidence') {
        const found = mockCases.find(
          (c) => c._id === args.caseId || c.clientGeneratedId === args.caseId
        );
        if (found) {
          found.evidence = (found.evidence || []).filter(
            (e: any) => e.id !== args.evidenceId
          );
          return { success: true };
        }
      }

      if (fnName === 'cases:deleteCase') {
        mockCases = mockCases.filter(
          (c) => c._id !== args.id && c.clientGeneratedId !== args.id
        );
        return { success: true };
      }

      if (fnName === 'purchases:create') {
        const purchase = {
          _id: `convex_pur_${Date.now()}`,
          clientGeneratedId: args.clientGeneratedId || `PUR-${Date.now().toString().slice(-4)}`,
          store: args.store,
          product: args.product,
          orderRef: args.orderRef,
          amount: args.amount,
          returnWindowDays: args.returnWindowDays,
          warrantyMonths: args.warrantyMonths,
          createdAt: new Date().toISOString(),
        };
        mockPurchases.push(purchase);
        return purchase;
      }

      if (fnName === 'purchases:update') {
        const found = mockPurchases.find(
          (p) => p._id === args.id || p.clientGeneratedId === args.id
        );
        if (found) {
          Object.assign(found, args);
          return found;
        }
      }

      if (fnName === 'purchases:deletePurchase') {
        mockPurchases = mockPurchases.filter(
          (p) => p._id !== args.id && p.clientGeneratedId !== args.id
        );
        return { success: true };
      }

      if (fnName === 'reminders:create') {
        const reminder = {
          _id: `convex_rem_${Date.now()}`,
          clientGeneratedId: args.clientGeneratedId || `REM-${Date.now().toString().slice(-4)}`,
          caseId: args.caseId,
          title: args.title,
          date: args.date,
          done: args.done ?? false,
          createdAt: new Date().toISOString(),
        };
        mockReminders.push(reminder);
        return reminder;
      }

      if (fnName === 'reminders:toggleDone') {
        const found = mockReminders.find(
          (r) => r._id === args.id || r.clientGeneratedId === args.id
        );
        if (found) {
          found.done = args.done;
          return found;
        }
      }

      if (fnName === 'reminders:deleteReminder') {
        mockReminders = mockReminders.filter(
          (r) => r._id !== args.id && r.clientGeneratedId !== args.id
        );
        return { success: true };
      }

      if (fnName === 'documents:deleteDocument') {
        mockDocuments = mockDocuments.filter(
          (d) => d._id !== args.documentId && d.storageId !== args.documentId
        );
        return { success: true };
      }

      return { success: true };
    }),
  }),
}));

describe('RESOLVE-ONE Backend Integration & Service Layer (Convex Single Source of Truth)', () => {
  beforeEach(async () => {
    mockCases = [];
    mockPurchases = [];
    mockReminders = [];
    mockDocuments = [];
    setSessionToken('mock-active-session-token');
    await clearLocalUserData();
  });

  afterEach(async () => {
    setSessionToken(null);
    await clearLocalUserData();
    vi.restoreAllMocks();
  });

  describe('1. Case Service Operations via Convex', () => {
    it('creates, retrieves, updates, and archives a dispute case in Convex', async () => {
      const created = await caseService.createCase({
        id: 'RS-INT-001',
        title: 'Damaged Smart TV delivery',
        issueType: 'Damaged or defective',
        company: 'MegaElectronics India',
        orderRef: 'ORD-9921',
        amount: 34999,
        description: 'Screen was cracked upon delivery unboxing.',
        status: 'action_required',
        timeline: [],
        evidence: [],
      });

      expect(created.id).toBe('RS-INT-001');
      expect(created.title).toBe('Damaged Smart TV delivery');
      expect(created.status).toBe('action_required');

      // Retrieve by ID
      const retrieved = await caseService.getCaseById('RS-INT-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.company).toBe('MegaElectronics India');

      // Update case
      const updated = await caseService.updateCase('RS-INT-001', {
        status: 'waiting_company',
      });
      expect(updated.status).toBe('waiting_company');

      // Archive case
      const archived = await caseService.archiveCase('RS-INT-001');
      expect(archived.status).toBe('closed');

      // Reopen case
      const reopened = await caseService.reopenCase('RS-INT-001');
      expect(reopened.status).toBe('action_required');

      // Delete case
      await caseService.deleteCase('RS-INT-001');
      const afterDelete = await caseService.getCaseById('RS-INT-001');
      expect(afterDelete).toBeUndefined();
    });

    it('adds timeline events to a case in Convex', async () => {
      await caseService.createCase({
        id: 'RS-INT-002',
        title: 'Late Delivery Groceries',
        issueType: 'Delivery problem',
        company: 'QuickBasket',
        description: 'Perishables spoiled after 6 hour delay',
        status: 'action_required',
        timeline: [],
        evidence: [],
      });

      const event = await caseService.addTimelineEvent('RS-INT-002', {
        title: 'Sent complaint email',
        detail: 'Dispatched formal legal notice with invoice attachment.',
        source: 'customer',
      });

      expect(event.title).toBe('Sent complaint email');
      const retrieved = await caseService.getCaseById('RS-INT-002');
      expect(retrieved?.timeline.some((t) => t.title === 'Sent complaint email')).toBe(true);
    });
  });

  describe('2. Purchase Service Operations via Convex', () => {
    it('saves, retrieves, and deletes purchase warranty records in Convex', async () => {
      const saved = await purchaseService.savePurchase({
        id: 'PUR-INT-001',
        store: 'Appliance Hub',
        product: 'Microwave Oven 28L',
        orderRef: 'ORD-MIC-44',
        amount: 8500,
        purchaseDate: '2026-10-15',
        deliveryDate: '2026-10-18',
        returnWindowDays: 10,
        warrantyMonths: 24,
      });

      expect(saved.id).toBe('PUR-INT-001');
      expect(saved.product).toBe('Microwave Oven 28L');

      const all = await purchaseService.listPurchases();
      expect(all).toHaveLength(1);
      expect(all[0].store).toBe('Appliance Hub');

      await purchaseService.deletePurchase('PUR-INT-001');
      const afterDelete = await purchaseService.listPurchases();
      expect(afterDelete).toHaveLength(0);
    });
  });

  describe('3. Reminder Service Operations via Convex', () => {
    it('creates, retrieves, toggles completion, and deletes reminders in Convex', async () => {
      const reminder = await reminderService.saveReminder({
        id: 'REM-INT-001',
        caseId: 'RS-INT-001',
        title: 'Statutory 48h ombudsman follow-up',
        date: '2026-11-20',
        done: false,
      });

      expect(reminder.id).toBe('REM-INT-001');
      expect(reminder.done).toBe(false);

      const byCase = await reminderService.getRemindersByCaseId('RS-INT-001');
      expect(byCase).toHaveLength(1);

      const toggled = await reminderService.toggleReminder('REM-INT-001');
      expect(toggled).toBe(true);

      await reminderService.deleteReminder('REM-INT-001');
      const allAfterDelete = await reminderService.listReminders();
      expect(allAfterDelete).toHaveLength(0);
    });
  });

  describe('4. Dashboard Analytics Service via Convex', () => {
    it('computes live aggregate statistics from Convex database', async () => {
      await caseService.createCase({
        id: 'RS-STAT-1',
        title: 'Pending Case',
        issueType: 'Refund not received',
        company: 'Store A',
        amount: 5000,
        description: 'Waiting',
        status: 'action_required',
        timeline: [],
        evidence: [],
      });

      await caseService.createCase({
        id: 'RS-STAT-2',
        title: 'Waiting Case',
        issueType: 'Refund not received',
        company: 'Store B',
        amount: 15000,
        description: 'Under review',
        status: 'waiting_company',
        timeline: [],
        evidence: [],
      });

      await caseService.createCase({
        id: 'RS-STAT-3',
        title: 'Resolved Case',
        issueType: 'Defective item',
        company: 'Store C',
        amount: 2500,
        description: 'Resolved successfully',
        status: 'resolved',
        timeline: [],
        evidence: [],
      });

      await reminderService.saveReminder({
        id: 'REM-STAT-1',
        title: 'Follow up with Store A',
        date: '2026-11-25',
        done: false,
      });

      const stats = await dashboardService.getStats();

      expect(stats.activeCount).toBe(2); // RS-STAT-1 + RS-STAT-2
      expect(stats.actionRequiredCount).toBe(1);
      expect(stats.waitingCompanyCount).toBe(1);
      expect(stats.resolvedCount).toBe(1);
      expect(stats.totalClaimAmount).toBe(22500);
      expect(stats.upcomingReminders).toHaveLength(1);
    });
  });

  describe('5. Convex Single Source of Truth & Local Storage Restrictions', () => {
    it('clears session tokens and temporary storage without touching persistent Convex backend', async () => {
      await caseService.createCase({
        id: 'RS-PERSIST-1',
        title: 'Persistent Convex Case',
        issueType: 'Defective item',
        company: 'Convex Store',
        description: 'Must persist in Convex',
        status: 'action_required',
        timeline: [],
        evidence: [],
      });

      expect((await caseService.listCases()).length).toBe(1);

      // Execute local session cache cleanup
      await clearLocalUserData();

      // Persistent Convex data remains untouched
      expect(mockCases).toHaveLength(1);
      expect(mockCases[0].clientGeneratedId).toBe('RS-PERSIST-1');
    });
  });

  describe('6. Document Operations & End-to-End Cryptography', () => {
    it('performs client-side envelope encryption and decrypts with verified integrity', async () => {
      const { masterKey } = await setupUserMasterKey('TestUserSecret#2026');

      const plainText = 'LEGAL NOTICE: Demand for full refund under CPA 2019 Section 35.';
      const encoder = new TextEncoder();
      const plainBuffer = encoder.encode(plainText).buffer as ArrayBuffer;

      // Encrypt document with AES-256-GCM envelope encryption
      const encrypted = await encryptDocument(plainBuffer, masterKey);

      expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);
      expect(encrypted.wrappedDekHex).toBeDefined();
      expect(encrypted.ivHex).toHaveLength(24);
      expect(encrypted.sha256Hex).toHaveLength(64);

      // Decrypt document and verify contents
      const decryptedBuffer = await decryptDocument(
        encrypted.ciphertext,
        encrypted.wrappedDekHex,
        encrypted.ivHex,
        encrypted.dekIvHex,
        encrypted.sha256Hex,
        masterKey
      );

      const decoder = new TextDecoder();
      const recoveredText = decoder.decode(decryptedBuffer);
      expect(recoveredText).toBe(plainText);
    });

    it('detaches evidence and deletes cloud document on documentService.deleteDocument', async () => {
      // Create case with evidence
      await caseService.createCase({
        id: 'RS-DOC-CASE',
        title: 'Document Test Case',
        issueType: 'Defective goods',
        company: 'Seller XYZ',
        description: 'Test case for document deletion',
        status: 'action_required',
        timeline: [],
        evidence: [
          {
            id: 'EV-DEL-01',
            name: 'receipt.pdf',
            mime: 'application/pdf',
            size: 2048,
            source: 'customer_upload',
            addedAt: new Date().toISOString(),
            storageId: 'mock-storage-id-123',
          },
        ],
      });

      mockDocuments.push({
        _id: 'mock-storage-id-123',
        storageId: 'mock-storage-id-123',
        name: 'receipt.pdf',
      });

      // Delete document via documentService
      await documentService.deleteDocument('RS-DOC-CASE', 'EV-DEL-01', 'mock-storage-id-123');

      // Verify evidence is removed from the case
      const updatedCase = await caseService.getCaseById('RS-DOC-CASE');
      expect(updatedCase?.evidence.some((e) => e.id === 'EV-DEL-01')).toBe(false);

      // Verify document is deleted from cloud storage
      expect(mockDocuments).toHaveLength(0);
    });
  });
});
