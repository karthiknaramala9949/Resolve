import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AuthDatabaseSchema,
  UserRecord,
  UserProfile,
  SessionRecord,
  VerificationToken,
  TokenType,
  AuthProvider,
} from './types';
import { generateRandomToken } from '../auth/crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'auth_db.json');
const CURRENT_VERSION = 1;

class AuthStore {
  private data: AuthDatabaseSchema = {
    version: CURRENT_VERSION,
    users: [],
    sessions: [],
    tokens: [],
  };
  private isLoaded = false;
  private writeLock = Promise.resolve();

  constructor() {
    this.loadSync();
  }

  private loadSync(): void {
    if (this.isLoaded) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.version === 'number') {
          this.data = {
            version: parsed.version || CURRENT_VERSION,
            users: Array.isArray(parsed.users) ? parsed.users : [],
            sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
            tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
          };
        }
      } else {
        this.saveSync();
      }
    } catch (err) {
      console.error('[AuthStore] Error loading auth database:', err);
    }
    this.isLoaded = true;
  }

  private saveSync(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[AuthStore] Error saving auth database sync:', err);
    }
  }

  private async persist(): Promise<void> {
    this.writeLock = this.writeLock.then(async () => {
      try {
        await fs.promises.mkdir(DATA_DIR, { recursive: true });
        const tmpFile = `${DB_FILE}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        await fs.promises.writeFile(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
        await fs.promises.rename(tmpFile, DB_FILE);
      } catch (err) {
        console.error('[AuthStore] Error persisting database:', err);
      }
    });
    return this.writeLock;
  }

  // ===================== USER MANAGEMENT =====================

  public toUserProfile(user: UserRecord): UserProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      image: user.image,
      providers: user.providers,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerified: user.phoneVerified,
      phoneVerifiedAt: user.phoneVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    this.loadSync();
    return this.data.users.find((u) => u.id === id) || null;
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    this.loadSync();
    const normalized = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email?.toLowerCase() === normalized) || null;
  }

  public async findUserByPhone(phone: string): Promise<UserRecord | null> {
    this.loadSync();
    // Normalize phone by stripping non-digit chars except leading '+'
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    return this.data.users.find((u) => u.phoneNumber?.replace(/[^\d+]/g, '') === cleanPhone) || null;
  }

  public async findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
    this.loadSync();
    return this.data.users.find((u) => u.googleId === googleId) || null;
  }

  public async createUser(data: {
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    image?: string | null;
    passwordHash?: string | null;
    passwordSalt?: string | null;
    googleId?: string | null;
    providers: AuthProvider[];
    emailVerified?: boolean;
    phoneVerified?: boolean;
  }): Promise<UserRecord> {
    this.loadSync();
    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      email: data.email ? data.email.trim().toLowerCase() : null,
      phoneNumber: data.phoneNumber ? data.phoneNumber.trim() : null,
      image: data.image || null,
      providers: Array.from(new Set(data.providers)),
      emailVerified: Boolean(data.emailVerified),
      emailVerifiedAt: data.emailVerified ? now : null,
      phoneVerified: Boolean(data.phoneVerified),
      phoneVerifiedAt: data.phoneVerified ? now : null,
      passwordHash: data.passwordHash || null,
      passwordSalt: data.passwordSalt || null,
      googleId: data.googleId || null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    this.data.users.push(newUser);
    await this.persist();
    return newUser;
  }

  public async updateUser(
    id: string,
    updates: Partial<Omit<UserRecord, 'id' | 'createdAt'>>
  ): Promise<UserRecord | null> {
    this.loadSync();
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const existing = this.data.users[index];
    const now = new Date().toISOString();

    const updated: UserRecord = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    if (updates.email) {
      updated.email = updates.email.trim().toLowerCase();
    }
    if (updates.providers) {
      updated.providers = Array.from(new Set([...existing.providers, ...updates.providers]));
    }

    this.data.users[index] = updated;
    await this.persist();
    return updated;
  }

  public async linkProvider(
    userId: string,
    provider: AuthProvider,
    extra?: {
      email?: string;
      phone?: string;
      googleId?: string;
      image?: string | null;
      name?: string;
    }
  ): Promise<UserRecord | null> {
    this.loadSync();
    const user = await this.findUserById(userId);
    if (!user) return null;

    const providers = Array.from(new Set([...user.providers, provider]));
    const updates: Partial<UserRecord> = { providers };

    if (extra?.googleId && !user.googleId) {
      updates.googleId = extra.googleId;
    }
    if (provider === 'google') {
      updates.emailVerified = true;
      if (!user.emailVerifiedAt) {
        updates.emailVerifiedAt = new Date().toISOString();
      }
    }
    if (extra?.email && !user.email) {
      updates.email = extra.email.trim().toLowerCase();
      updates.emailVerified = true;
      updates.emailVerifiedAt = new Date().toISOString();
    }
    if (extra?.phone && !user.phoneNumber) {
      updates.phoneNumber = extra.phone.trim();
      updates.phoneVerified = true;
      updates.phoneVerifiedAt = new Date().toISOString();
    }
    if (extra?.image && !user.image) {
      updates.image = extra.image;
    }

    return this.updateUser(userId, updates);
  }

  // ===================== SESSIONS =====================

  public async createSession(
    userId: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<SessionRecord> {
    this.loadSync();
    const token = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      userId,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    };

    this.data.sessions.push(session);

    // Update lastLoginAt on user
    const userIndex = this.data.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      this.data.users[userIndex].lastLoginAt = new Date().toISOString();
    }

    await this.persist();
    return session;
  }

  public async findSessionByToken(token: string): Promise<SessionRecord | null> {
    this.loadSync();
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.deleteSession(token);
      return null;
    }

    return session;
  }

  public async deleteSession(token: string): Promise<void> {
    this.loadSync();
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    if (this.data.sessions.length !== initialLen) {
      await this.persist();
    }
  }

  public async deleteUserSessions(userId: string): Promise<void> {
    this.loadSync();
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    await this.persist();
  }

  // ===================== VERIFICATION TOKENS & OTPS =====================

  public async createToken(
    identifier: string,
    token: string,
    type: TokenType,
    expiresInMinutes: number
  ): Promise<VerificationToken> {
    this.loadSync();
    const cleanId = identifier.trim().toLowerCase();
    // Invalidate existing tokens of same type for this identifier
    this.data.tokens = this.data.tokens.filter(
      (t) => !(t.identifier === cleanId && t.type === type)
    );

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const record: VerificationToken = {
      id: crypto.randomUUID(),
      identifier: cleanId,
      token,
      type,
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    this.data.tokens.push(record);
    await this.persist();
    return record;
  }

  public async findToken(
    identifier: string,
    token: string,
    type: TokenType
  ): Promise<VerificationToken | null> {
    this.loadSync();
    const cleanId = identifier.trim().toLowerCase();
    const found = this.data.tokens.find(
      (t) => t.identifier === cleanId && t.token === token && t.type === type
    );
    if (!found) return null;

    if (new Date(found.expiresAt).getTime() < Date.now()) {
      await this.consumeToken(found.id);
      return null;
    }

    return found;
  }

  public async incrementTokenAttempts(id: string): Promise<number> {
    this.loadSync();
    const target = this.data.tokens.find((t) => t.id === id);
    if (!target) return 0;

    target.attempts += 1;
    if (target.attempts >= 5) {
      // Invalidate token after 5 failed attempts
      await this.consumeToken(id);
      return target.attempts;
    }

    await this.persist();
    return target.attempts;
  }

  public async consumeToken(id: string): Promise<void> {
    this.loadSync();
    this.data.tokens = this.data.tokens.filter((t) => t.id !== id);
    await this.persist();
  }
}

export const authStore = new AuthStore();
