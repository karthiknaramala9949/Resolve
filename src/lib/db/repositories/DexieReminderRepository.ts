import { IReminderRepository } from './IReminderRepository';
import { db, ResolveOneDB } from '../db';
import { Reminder } from '../types';
import { syncEngine } from '@/lib/sync/syncEngine';

export class DexieReminderRepository implements IReminderRepository {
  private database: ResolveOneDB;

  constructor(database: ResolveOneDB = db) {
    this.database = database;
  }

  async getAll(): Promise<Reminder[]> {
    return this.database.reminders.reverse().sortBy('date');
  }

  async getByCaseId(caseId: string): Promise<Reminder[]> {
    return this.database.reminders.where('caseId').equals(caseId).toArray();
  }

  async save(reminder: Reminder): Promise<Reminder> {
    const existing = await this.database.reminders.get(reminder.id);
    await this.database.reminders.put(reminder);

    try {
      await this.database.syncQueue.put({
        id: `SQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        entity: 'reminders',
        operation: existing ? 'update' : 'create',
        clientGeneratedId: reminder.id,
        data: reminder,
        timestamp: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      });
      if (typeof window !== 'undefined') {
        syncEngine.triggerSync();
      }
    } catch {}

    return reminder;
  }

  async toggleDone(id: string): Promise<boolean> {
    const existing = await this.database.reminders.get(id);
    if (!existing) return false;
    const nextState = !existing.done;
    await this.database.reminders.update(id, { done: nextState });

    try {
      const updated = await this.database.reminders.get(id);
      if (updated) {
        await this.database.syncQueue.put({
          id: `SQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          entity: 'reminders',
          operation: 'update',
          clientGeneratedId: id,
          data: updated,
          timestamp: new Date().toISOString(),
          status: 'pending',
          retryCount: 0,
        });
        if (typeof window !== 'undefined') {
          syncEngine.triggerSync();
        }
      }
    } catch {}

    return nextState;
  }

  async delete(id: string): Promise<void> {
    await this.database.reminders.delete(id);

    try {
      await this.database.syncQueue.put({
        id: `SQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        entity: 'reminders',
        operation: 'delete',
        clientGeneratedId: id,
        data: {},
        timestamp: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      });
      if (typeof window !== 'undefined') {
        syncEngine.triggerSync();
      }
    } catch {}
  }
}
