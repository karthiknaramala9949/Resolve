/**
 * Centralized Reminders & Follow-Ups Service (Convex-First Single Source of Truth)
 *
 * Coordinates statutory reminders and milestone tracking directly via Convex.
 */

import { Reminder } from '@/lib/db/types';
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { ensureSessionToken } from '@/lib/auth/sessionToken';
import { api } from '../../convex/_generated/api';

function mapConvexReminderToAppReminder(doc: any): Reminder {
  return {
    id: doc.clientGeneratedId || doc._id,
    caseId: doc.caseId,
    title: doc.title,
    date: doc.date,
    done: doc.done,
    createdAt: doc.createdAt,
  };
}

export const reminderService = {
  /**
   * Retrieves all scheduled reminders for the user from Convex.
   */
  async listReminders(): Promise<Reminder[]> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const items = await convex.query(api.reminders.list, { sessionToken });
    return items.map(mapConvexReminderToAppReminder);
  },

  /**
   * Retrieves reminders for a specific dispute case from Convex.
   */
  async getRemindersByCaseId(caseId: string): Promise<Reminder[]> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const items = await convex.query(api.reminders.list, { sessionToken, caseId });
    return items.map(mapConvexReminderToAppReminder);
  },

  /**
   * Saves a new reminder in Convex.
   */
  async saveReminder(reminder: Reminder): Promise<Reminder> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const created = await convex.mutation(api.reminders.create, {
      sessionToken,
      clientGeneratedId: reminder.id,
      caseId: reminder.caseId,
      title: reminder.title,
      date: reminder.date,
      done: reminder.done,
    });
    return mapConvexReminderToAppReminder(created);
  },

  /**
   * Toggles completion status of a reminder in Convex.
   */
  async toggleReminder(id: string): Promise<boolean> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    const all = await this.listReminders();
    const existing = all.find((r) => r.id === id);
    const newDone = existing ? !existing.done : true;

    await convex.mutation(api.reminders.toggleDone, {
      sessionToken,
      id,
      done: newDone,
    });

    return newDone;
  },

  /**
   * Deletes a reminder from Convex.
   */
  async deleteReminder(id: string): Promise<void> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    await convex.mutation(api.reminders.deleteReminder, {
      sessionToken,
      id,
    });
  },
};
