import { DexieCaseRepository } from './DexieCaseRepository';
import { DexieEvidenceRepository } from './DexieEvidenceRepository';
import { DexiePurchaseRepository } from './DexiePurchaseRepository';
import { DexieReminderRepository } from './DexieReminderRepository';

export * from './ICaseRepository';
export * from './DexieCaseRepository';
export * from './IEvidenceRepository';
export * from './DexieEvidenceRepository';
export * from './IPurchaseRepository';
export * from './DexiePurchaseRepository';
export * from './IReminderRepository';
export * from './DexieReminderRepository';

export const caseRepository = new DexieCaseRepository();
export const evidenceRepository = new DexieEvidenceRepository();
export const purchaseRepository = new DexiePurchaseRepository();
export const reminderRepository = new DexieReminderRepository();

