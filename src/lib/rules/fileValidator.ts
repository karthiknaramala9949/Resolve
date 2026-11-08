import { z } from 'zod';
import { CaseSchema, PurchaseSchema, ReminderSchema } from '@/lib/db/types';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'heic',
  'mp4',
  'txt',
  'eml',
  'csv',
  'json',
] as const;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'video/mp4',
  'text/plain',
  'message/rfc822',
  'text/csv',
  'application/json',
  'application/octet-stream', // Generic fallback
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUploadedFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File exceeds maximum allowed size of 15 MB (your file is ${sizeMb} MB). Please choose a smaller file.`,
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as any)) {
    return {
      valid: false,
      error: `Unsupported file extension .${extension || 'unknown'}. Allowed formats: PDF, PNG, JPG, WEBP, HEIC, MP4, TXT, EML, CSV, JSON.`,
    };
  }

  return { valid: true };
}

// Zod schema for full backup imports
export const BackupImportBundleSchema = z.object({
  app: z.string().optional(),
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  data: z.object({
    cases: z.array(CaseSchema).optional().default([]),
    purchases: z.array(PurchaseSchema).optional().default([]),
    reminders: z.array(ReminderSchema).optional().default([]),
  }),
});

export function validateImportPayload(payload: unknown) {
  const result = BackupImportBundleSchema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      valid: false,
      error: `Import format invalid: ${firstIssue?.path.join('.') || 'root'} - ${firstIssue?.message}`,
      data: null,
    };
  }
  return {
    valid: true,
    data: result.data,
  };
}

