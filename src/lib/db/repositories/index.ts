/**
 * Centralized Repository Registry (Convex-First Backend)
 *
 * All persistent business records are stored exclusively in Convex.
 * Dexie and IndexedDB repositories have been removed.
 */

import {
  ConvexCaseRepository,
  ConvexEvidenceRepository,
  ConvexPurchaseRepository,
  ConvexReminderRepository,
} from './ConvexRepositories';

export * from './ICaseRepository';
export * from './IEvidenceRepository';
export * from './IPurchaseRepository';
export * from './IReminderRepository';
export * from './ConvexRepositories';

export const caseRepository = new ConvexCaseRepository();
export const evidenceRepository = new ConvexEvidenceRepository();
export const purchaseRepository = new ConvexPurchaseRepository();
export const reminderRepository = new ConvexReminderRepository();
