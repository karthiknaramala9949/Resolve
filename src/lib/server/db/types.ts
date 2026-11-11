import { z } from 'zod';

export type AuthProvider = 'email' | 'phone' | 'google' | 'local' | 'guest';

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().nullable(),
  phoneNumber: z.string().nullable(),
  image: z.string().nullable(),
  providers: z.array(z.enum(['email', 'phone', 'google', 'local', 'guest'])),
  emailVerified: z.boolean(),
  emailVerifiedAt: z.string().nullable(),
  phoneVerified: z.boolean(),
  phoneVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export interface UserRecord extends UserProfile {
  passwordHash: string | null;
  passwordSalt: string | null;
  googleId: string | null;
}

export const SessionRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});
export type SessionRecord = z.infer<typeof SessionRecordSchema>;

export type TokenType =
  | 'email_verification'
  | 'phone_otp'
  | 'password_reset_email'
  | 'password_reset_phone';

export const VerificationTokenSchema = z.object({
  id: z.string(),
  identifier: z.string(), // email or phone
  token: z.string(), // 6-digit OTP or hex string
  type: z.enum([
    'email_verification',
    'phone_otp',
    'password_reset_email',
    'password_reset_phone',
  ]),
  expiresAt: z.string(),
  attempts: z.number().default(0),
  createdAt: z.string(),
});
export type VerificationToken = z.infer<typeof VerificationTokenSchema>;

export interface AuthDatabaseSchema {
  version: number;
  users: UserRecord[];
  sessions: SessionRecord[];
  tokens: VerificationToken[];
}

