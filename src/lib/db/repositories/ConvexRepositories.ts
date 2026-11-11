/**
 * Convex-First Repositories
 *
 * Implements repository interfaces directly on top of the Convex service layer.
 * Dexie and IndexedDB persistence have been completely removed.
 */

import { ICaseRepository } from './ICaseRepository';
import { IPurchaseRepository } from './IPurchaseRepository';
import { IReminderRepository } from './IReminderRepository';
import { IEvidenceRepository } from './IEvidenceRepository';
import { Case, TimelineEvent, EvidenceMeta, Purchase, Reminder, EvidenceBlobRecord } from '../types';
import { caseService } from '@/services/caseService';
import { purchaseService } from '@/services/purchaseService';
import { reminderService } from '@/services/reminderService';
import { calculateSHA256 } from '@/lib/crypto/e2ee';

export class ConvexCaseRepository implements ICaseRepository {
  async getAll(filter?: { status?: string; search?: string }): Promise<Case[]> {
    return caseService.listCases(filter);
  }

  async getById(id: string): Promise<Case | undefined> {
    return caseService.getCaseById(id);
  }

  async create(caseData: Omit<Case, 'createdAt' | 'updatedAt'>): Promise<Case> {
    return caseService.createCase(caseData);
  }

  async update(id: string, updates: Partial<Case>): Promise<Case> {
    return caseService.updateCase(id, updates);
  }

  async delete(id: string): Promise<void> {
    return caseService.deleteCase(id);
  }

  async addTimelineEvent(caseId: string, event: Omit<TimelineEvent, 'id' | 'at'>): Promise<TimelineEvent> {
    return caseService.addTimelineEvent(caseId, event);
  }

  async addEvidenceMeta(caseId: string, evidenceMeta: EvidenceMeta): Promise<void> {
    return caseService.addEvidence(caseId, evidenceMeta);
  }

  async removeEvidenceMeta(caseId: string, evidenceId: string): Promise<void> {
    return caseService.removeEvidence(caseId, evidenceId);
  }
}

export class ConvexPurchaseRepository implements IPurchaseRepository {
  async getAll(): Promise<Purchase[]> {
    return purchaseService.listPurchases();
  }

  async getById(id: string): Promise<Purchase | undefined> {
    return purchaseService.getPurchaseById(id);
  }

  async save(purchase: Purchase): Promise<Purchase> {
    return purchaseService.savePurchase(purchase);
  }

  async delete(id: string): Promise<void> {
    return purchaseService.deletePurchase(id);
  }

  async importBatch(purchases: Purchase[]): Promise<number> {
    let count = 0;
    for (const p of purchases) {
      await purchaseService.savePurchase(p);
      count++;
    }
    return count;
  }
}

export class ConvexReminderRepository implements IReminderRepository {
  async getAll(): Promise<Reminder[]> {
    return reminderService.listReminders();
  }

  async getByCaseId(caseId: string): Promise<Reminder[]> {
    return reminderService.getRemindersByCaseId(caseId);
  }

  async save(reminder: Reminder): Promise<Reminder> {
    return reminderService.saveReminder(reminder);
  }

  async toggleDone(id: string): Promise<boolean> {
    return reminderService.toggleReminder(id);
  }

  async delete(id: string): Promise<void> {
    return reminderService.deleteReminder(id);
  }
}

export class ConvexEvidenceRepository implements IEvidenceRepository {
  async saveBlob(file: File | Blob, metadata: { id: string; name: string; type: string; size: number }): Promise<EvidenceBlobRecord> {
    const buf = await file.arrayBuffer();
    const sha256 = await calculateSHA256(buf);
    return {
      id: metadata.id,
      blob: file,
      name: metadata.name,
      type: metadata.type,
      size: metadata.size,
      sha256,
      at: new Date().toISOString(),
    };
  }

  async getBlob(_id: string): Promise<EvidenceBlobRecord | undefined> {
    return undefined;
  }

  async deleteBlob(_id: string): Promise<void> {}

  async calculateSHA256(data: ArrayBuffer): Promise<string> {
    return calculateSHA256(data);
  }

  async clearAll(): Promise<void> {}
}

