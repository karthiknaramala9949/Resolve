import { Reminder } from '../types';

export interface IReminderRepository {
  getAll(): Promise<Reminder[]>;
  getByCaseId(caseId: string): Promise<Reminder[]>;
  save(reminder: Reminder): Promise<Reminder>;
  toggleDone(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

