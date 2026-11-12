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

/**
 * Sanitizes an uploaded filename to prevent directory traversal and header injection (A-07, G-10).
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'unnamed_file.bin';
  }

  // Strip null bytes, CRLF, and non-printable control characters
  let clean = fileName.replace(/[\0\r\n\x00-\x1f\x7f]/g, '');

  // Strip directory traversal sequences (e.g. ../, ..\)
  clean = clean.replace(/(\.\.[\/\\])+/g, '').replace(/[\/\\]/g, '_').trim();

  // Strip leading dots or hyphens
  clean = clean.replace(/^[\.\-_]+/, '');

  if (!clean) {
    return 'unnamed_file.bin';
  }

  // Restrict filename length to 128 characters preserving extension
  if (clean.length > 128) {
    const parts = clean.split('.');
    if (parts.length > 1) {
      const ext = parts.pop();
      const base = parts.join('.');
      clean = `${base.slice(0, 120)}.${ext}`;
    } else {
      clean = clean.slice(0, 128);
    }
  }

  return clean;
}

/**
 * Validates file basic properties (size, extension).
 */
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

/**
 * Validates raw file buffer magic bytes against disguised executables or malicious formats (G-10 File Upload Vulnerabilities).
 */
export function validateFileMagicBytes(buffer: ArrayBuffer, fileName: string): FileValidationResult {
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File exceeds maximum allowed size of 15 MB.',
    };
  }

  if (buffer.byteLength < 4) {
    return {
      valid: false,
      error: 'Corrupted or empty file buffer.',
    };
  }

  const bytes = new Uint8Array(buffer.slice(0, 32));

  // 1. Block dangerous executable signatures
  // Windows PE / EXE / DLL ("MZ")
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
    return {
      valid: false,
      error: 'Security violation: Executable binaries (PE/EXE/DLL) are strictly prohibited.',
    };
  }

  // Linux ELF ("\x7fELF")
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
    return {
      valid: false,
      error: 'Security violation: Executable binaries (ELF) are strictly prohibited.',
    };
  }

  // Mach-O binaries (macOS executables)
  const isMachO =
    (bytes[0] === 0xfe && bytes[1] === 0xed && bytes[2] === 0xfa && (bytes[3] === 0xce || bytes[3] === 0xcf)) ||
    (bytes[0] === 0xce && bytes[1] === 0xfa && bytes[2] === 0xed && bytes[3] === 0xfe) ||
    (bytes[0] === 0xcf && bytes[1] === 0xfa && bytes[2] === 0xed && bytes[3] === 0xfe);
  if (isMachO) {
    return {
      valid: false,
      error: 'Security violation: Executable binaries (Mach-O) are strictly prohibited.',
    };
  }

  // 2. Validate magic bytes match claimed extension
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    // PDF must start with "%PDF-" (0x25, 0x50, 0x44, 0x46)
    if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
      return {
        valid: false,
        error: 'Invalid PDF format: File header does not match PDF signature.',
      };
    }
  }

  if (extension === 'png') {
    // PNG signature: 0x89, 0x50, 0x4E, 0x47
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
      return {
        valid: false,
        error: 'Invalid PNG format: File header does not match PNG signature.',
      };
    }
  }

  if (extension === 'jpg' || extension === 'jpeg') {
    // JPEG signature: 0xFF, 0xD8, 0xFF
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return {
        valid: false,
        error: 'Invalid JPEG format: File header does not match JPEG signature.',
      };
    }
  }

  if (extension === 'webp') {
    // WEBP signature: "RIFF" .... "WEBP"
    const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    if (!isRiff || !isWebp) {
      return {
        valid: false,
        error: 'Invalid WEBP format: File header does not match WEBP signature.',
      };
    }
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
