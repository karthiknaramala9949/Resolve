import { z } from 'zod';

export const EvidenceMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  mime: z.string(),
  size: z.number(),
  source: z.string().default('customer_upload'),
  addedAt: z.string(),
  sha256: z.string().optional(),
  redactionHint: z.string().optional(),
});
export type EvidenceMeta = z.infer<typeof EvidenceMetaSchema>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  title: z.string(),
  detail: z.string(),
  source: z.string().default('customer'),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const ExtractedFactSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.string(),
  source: z.string().default('rule_parser'),
  at: z.string(),
});
export type ExtractedFact = z.infer<typeof ExtractedFactSchema>;

export const CaseStatusSchema = z.enum([
  'action_required',
  'waiting_company',
  'response_received',
  'resolved',
  'closed',
]);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const ThreeStateOutcomeSchema = z.object({
  companyStated: z
    .object({
      date: z.string().optional(),
      amount: z.number().optional(),
      note: z.string().optional(),
    })
    .optional(),
  evidenceFound: z
    .object({
      date: z.string().optional(),
      reference: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
  customerConfirmed: z
    .object({
      date: z.string().optional(),
      amountReceived: z.number().optional(),
      note: z.string().optional(),
    })
    .optional(),
});
export type ThreeStateOutcome = z.infer<typeof ThreeStateOutcomeSchema>;

export const CaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  issueType: z.string(),
  company: z.string(),
  orderRef: z.string().optional(),
  product: z.string().optional(),
  amount: z.number().nullable().optional(),
  purchasedAt: z.string().optional(),
  desiredOutcome: z.string().optional(),
  description: z.string(),
  status: CaseStatusSchema.default('action_required'),
  createdAt: z.string(),
  updatedAt: z.string(),
  nextAction: z.string().optional(),
  nextStepReason: z.string().optional(),
  claimedOutcome: z.string().optional(),
  customerConfirmedOutcome: z.string().optional(),
  threeStateOutcome: ThreeStateOutcomeSchema.optional(),
  evidence: z.array(EvidenceMetaSchema).default([]),
  timeline: z.array(TimelineEventSchema).default([]),
  extractedFacts: z.array(ExtractedFactSchema).optional(),
  tags: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  customerNotes: z.string().optional(),
});
export type Case = z.infer<typeof CaseSchema>;

export const PurchaseSchema = z.object({
  id: z.string(),
  store: z.string(),
  product: z.string(),
  orderRef: z.string().optional(),
  amount: z.number().nullable().optional(),
  purchaseDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  returnWindowDays: z.number().default(7),
  warrantyMonths: z.number().default(12),
  notes: z.string().optional(),
  serialNo: z.string().optional(),
  createdAt: z.string().optional(),
});
export type Purchase = z.infer<typeof PurchaseSchema>;

export const ReminderSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  title: z.string(),
  date: z.string(),
  done: z.boolean().default(false),
  createdAt: z.string().optional(),
});
export type Reminder = z.infer<typeof ReminderSchema>;

export const PolicySnapshotSchema = z.object({
  id: z.string(),
  company: z.string(),
  returnWindowDays: z.number().default(7),
  policyUrl: z.string().optional(),
  summary: z.string(),
  verifiedAt: z.string(),
  source: z.string().default('customer_saved'),
  version: z.number().default(1),
});
export type PolicySnapshot = z.infer<typeof PolicySnapshotSchema>;

export const EvidenceBlobRecordSchema = z.object({
  id: z.string(),
  blob: z.any(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  sha256: z.string().default(''),
  at: z.string(),
});
export type EvidenceBlobRecord = z.infer<typeof EvidenceBlobRecordSchema>;
