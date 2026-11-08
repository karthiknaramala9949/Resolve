import { ICaseRepository } from './ICaseRepository';
import { db, ResolveOneDB } from '../db';
import { Case, TimelineEvent, EvidenceMeta } from '../types';

export class DexieCaseRepository implements ICaseRepository {
  private database: ResolveOneDB;

  constructor(database: ResolveOneDB = db) {
    this.database = database;
  }

  async getAll(filter?: { status?: string; search?: string }): Promise<Case[]> {
    let collection = this.database.cases.toCollection();

    if (filter?.status && filter.status !== 'all') {
      collection = this.database.cases.where('status').equals(filter.status);
    }

    let items = await collection.reverse().sortBy('updatedAt');

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.orderRef && c.orderRef.toLowerCase().includes(q))
      );
    }

    return items;
  }

  async getById(id: string): Promise<Case | undefined> {
    return this.database.cases.get(id);
  }

  async create(caseData: Omit<Case, 'createdAt' | 'updatedAt'>): Promise<Case> {
    const now = new Date().toISOString();
    const newCase: Case = {
      ...caseData,
      createdAt: now,
      updatedAt: now,
      timeline: [
        ...(caseData.timeline || []),
        {
          id: `EV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          at: now,
          title: 'Case created',
          detail: 'Problem recorded in RESOLVE-ONE local database.',
          source: 'customer',
        },
      ],
    };

    await this.database.cases.put(newCase);
    return newCase;
  }

  async update(id: string, updates: Partial<Case>): Promise<Case> {
    const existing = await this.database.cases.get(id);
    if (!existing) {
      throw new Error(`Case ${id} not found.`);
    }

    const updated: Case = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.database.cases.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.database.cases.get(id);
    if (existing?.evidence) {
      // Clean up linked blobs
      for (const ev of existing.evidence) {
        await this.database.evidenceBlobs.delete(ev.id);
      }
    }
    await this.database.cases.delete(id);
  }

  async addTimelineEvent(
    caseId: string,
    event: Omit<TimelineEvent, 'id' | 'at'>
  ): Promise<TimelineEvent> {
    const existing = await this.database.cases.get(caseId);
    if (!existing) throw new Error(`Case ${caseId} not found.`);

    const newEvent: TimelineEvent = {
      ...event,
      id: `EV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      at: new Date().toISOString(),
    };

    const updatedTimeline = [newEvent, ...(existing.timeline || [])];
    await this.database.cases.update(caseId, {
      timeline: updatedTimeline,
      updatedAt: new Date().toISOString(),
    });

    return newEvent;
  }

  async addEvidenceMeta(caseId: string, evidenceMeta: EvidenceMeta): Promise<void> {
    const existing = await this.database.cases.get(caseId);
    if (!existing) throw new Error(`Case ${caseId} not found.`);

    const updatedEvidence = [...(existing.evidence || []), evidenceMeta];
    await this.database.cases.update(caseId, {
      evidence: updatedEvidence,
      updatedAt: new Date().toISOString(),
    });
  }

  async removeEvidenceMeta(caseId: string, evidenceId: string): Promise<void> {
    const existing = await this.database.cases.get(caseId);
    if (!existing) return;

    const updatedEvidence = (existing.evidence || []).filter((e) => e.id !== evidenceId);
    await this.database.cases.update(caseId, {
      evidence: updatedEvidence,
      updatedAt: new Date().toISOString(),
    });

    // Also delete binary blob
    await this.database.evidenceBlobs.delete(evidenceId);
  }
}

