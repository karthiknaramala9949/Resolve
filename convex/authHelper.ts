import { QueryCtx, MutationCtx } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';

export interface SafeUserProfile {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  image: string | null;
  providers: string[];
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt: string | null;
  role?: string;
  encryptedMasterKey?: string;
  masterKeySalt?: string;
  masterKeyIv?: string;
  recoveryWrappedMasterKey?: string;
  preferences?: {
    theme?: string;
    simpleLanguageMode?: boolean;
    notificationsEnabled?: boolean;
  };
  isGuest?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export function toSafeUserProfile(user: Doc<'users'>): SafeUserProfile {
  const isGuest = Boolean(
    user.role === 'guest' ||
    user.providers?.includes('guest') ||
    user.providers?.includes('local')
  );

  return {
    id: user._id,
    name: user.name,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    image: user.image || null,
    providers: user.providers,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt || null,
    phoneVerified: user.phoneVerified,
    phoneVerifiedAt: user.phoneVerifiedAt || null,
    role: user.role,
    encryptedMasterKey: user.encryptedMasterKey,
    masterKeySalt: user.masterKeySalt,
    masterKeyIv: user.masterKeyIv,
    recoveryWrappedMasterKey: user.recoveryWrappedMasterKey,
    preferences: user.preferences,
    isGuest,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Validates a session token and retrieves the authenticated user document.
 * Throws an error if invalid, expired, or non-existent.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string
): Promise<{ user: Doc<'users'>; session: Doc<'sessions'> }> {
  if (!sessionToken || sessionToken.trim() === '') {
    throw new Error('UNAUTHORIZED: Missing session token');
  }

  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q) => q.eq('token', sessionToken))
    .first();

  if (!session) {
    throw new Error('UNAUTHORIZED: Invalid session');
  }

  const now = new Date().toISOString();
  if (session.expiresAt < now) {
    throw new Error('UNAUTHORIZED: Session expired');
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new Error('UNAUTHORIZED: User not found');
  }

  return { user, session };
}

/**
 * Synchronizes the profiles record with the authoritative users document.
 * Ensures both User and Profile records remain synchronized in real time.
 */
export async function syncUserProfileRecord(
  ctx: MutationCtx,
  user: Doc<'users'>,
  timestamp?: string
): Promise<Doc<'profiles'>> {
  const now = timestamp || new Date().toISOString();

  const existingProfile = await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', user._id))
    .first();

  const profileData = {
    name: user.name,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    image: user.image || null,
    role: user.role || 'consumer',
    phoneVerified: Boolean(user.phoneVerified),
    phoneVerifiedAt: user.phoneVerifiedAt || null,
    preferences: user.preferences,
    updatedAt: now,
  };

  if (existingProfile) {
    await ctx.db.patch(existingProfile._id, profileData);
    return (await ctx.db.get(existingProfile._id))!;
  } else {
    const profileId = await ctx.db.insert('profiles', {
      userId: user._id,
      createdAt: user.createdAt || now,
      ...profileData,
    });
    return (await ctx.db.get(profileId))!;
  }
}


