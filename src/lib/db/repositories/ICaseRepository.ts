import { Case, TimelineEvent, EvidenceMeta } from '../types';

export interface ICaseRepository {
  getAll(filter?: { status?: string; search?: string }): Promise<Case[]>;
  getById(id: string): Promise<Case | undefined>;
  create(caseData: Omit<Case, 'createdAt' | 'updatedAt'>): Promise<Case>;
  update(id: string, updates: Partial<Case>): Promise<Case>;
  delete(id: string): Promise<void>;
  addTimelineEvent(caseId: string, event: Omit<TimelineEvent, 'id' | 'at'>): Promise<TimelineEvent>;
  addEvidenceMeta(caseId: string, evidenceMeta: EvidenceMeta): Promise<void>;
  removeEvidenceMeta(caseId: string, evidenceId: string): Promise<void>;
}

