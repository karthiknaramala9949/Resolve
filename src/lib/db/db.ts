import Dexie, { type Table } from 'dexie';
import {
  Case,
  Purchase,
  Reminder,
  PolicySnapshot,
  EvidenceBlobRecord,
  SyncQueueItem,
} from './types';

export class ResolveOneDB extends Dexie {
  cases!: Table<Case, string>;
  purchases!: Table<Purchase, string>;
  reminders!: Table<Reminder, string>;
  policies!: Table<PolicySnapshot, string>;
  evidenceBlobs!: Table<EvidenceBlobRecord, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('resolve-one-v2');

    this.version(1).stores({
      cases: 'id, company, status, issueType, createdAt, updatedAt',
      purchases: 'id, store, product, purchaseDate, deliveryDate',
      reminders: 'id, caseId, date, done',
      policies: 'id, company, returnWindowDays',
      evidenceBlobs: 'id, sha256, at',
    });

    this.version(2).stores({
      syncQueue: 'id, entity, operation, status, timestamp',
    });
  }
}

export const db = new ResolveOneDB();

