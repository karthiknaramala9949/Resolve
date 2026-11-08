import { IReminderRepository } from './IReminderRepository';
import { db, ResolveOneDB } from '../db';
import { Reminder } from '../types';

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
    await this.database.reminders.put(reminder);
    return reminder;
  }

  async toggleDone(id: string): Promise<boolean> {
    const existing = await this.database.reminders.get(id);
    if (!existing) return false;
    const nextState = !existing.done;
    await this.database.reminders.update(id, { done: nextState });
    return nextState;
  }

  async delete(id: string): Promise<void> {
    await this.database.reminders.delete(id);
  }
}

