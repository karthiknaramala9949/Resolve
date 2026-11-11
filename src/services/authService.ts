/**
 * Centralized Authentication Service
 *
 * Encapsulates all backend authentication API calls via apiClient.
 */

import { apiClient, ApiError } from './apiClient';
import { UserProfile, LoginFormData, RegisterFormData } from '@/features/auth/types';
import { setSessionToken, clearSessionToken } from '@/lib/auth/sessionToken';
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { api } from '../../convex/_generated/api';

export interface MeResponse {
  user: UserProfile | null;
  sessionToken?: string | null;
}

export interface AuthSuccessResponse {
  success: boolean;
  user: UserProfile;
  sessionToken?: string;
  verificationRequired?: 'email' | 'phone';
}

export interface SetupProfilePayload {
  name?: string;
  phoneNumber?: string;
  password?: string;
}

export const authService = {
  /**
   * Retrieves the currently authenticated user session.
   */
  async getMe(): Promise<MeResponse> {
    try {
      const res = await apiClient.get<MeResponse>('/api/auth/me', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.sessionToken) {
        setSessionToken(res.sessionToken);
      }
      return res;
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 401 || err.isOffline)) {
        return { user: null, sessionToken: null };
      }
      throw err;
    }
  },

  /**
   * Signs in with email/phone and password.
   */
  async login(data: LoginFormData): Promise<AuthSuccessResponse> {
    const res = await apiClient.post<AuthSuccessResponse>('/api/auth/login', data);
    if (res.sessionToken) {
      setSessionToken(res.sessionToken);
    }
    // Auto-unlock vault if master key bundle is present and password matches
    if (
      res.user?.encryptedMasterKey &&
      res.user?.masterKeySalt &&
      res.user?.masterKeyIv &&
      data.password
    ) {
      try {
        const { unlockMasterKeyWithPassphrase, setActiveMasterKey } = await import('@/lib/crypto/e2ee');
        const masterKey = await unlockMasterKeyWithPassphrase(
          data.password,
          res.user.encryptedMasterKey,
          res.user.masterKeySalt,
          res.user.masterKeyIv
        );
        setActiveMasterKey(masterKey);
      } catch {
        // Vault passphrase differs from account password; left locked for user prompt
      }
    }
    return res;
  },

  /**
   * Registers a new account.
   */
  async register(data: RegisterFormData): Promise<AuthSuccessResponse> {
    const res = await apiClient.post<AuthSuccessResponse>('/api/auth/register', data);
    if (res.sessionToken) {
      setSessionToken(res.sessionToken);
    }
    // Auto-initialize master key vault for new account
    if (data.password) {
      try {
        const { setupUserMasterKey, setActiveMasterKey } = await import('@/lib/crypto/e2ee');
        const { masterKey, bundle } = await setupUserMasterKey(data.password);
        setActiveMasterKey(masterKey);

        const convex = getConvexClient();
        await convex.mutation(api.auth.updateE2EEKeys, {
          sessionToken: res.sessionToken || '',
          encryptedMasterKey: bundle.wrappedMasterKeyHex,
          masterKeySalt: bundle.saltHex,
          masterKeyIv: bundle.ivHex,
          recoveryKeyHash: bundle.recoveryKeyHashHex,
          recoveryWrappedMasterKey: bundle.recoveryWrappedMasterKeyHex,
        });

        // Store recovery key in session for display in onboarding
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('resolve_recovery_key', bundle.recoveryKey);
        }
      } catch (err) {
        console.warn('[Register] Automatic vault initialization deferred:', err);
      }
    }
    return res;
  },

  /**
   * Signs out the current session.
   */
  async logout(): Promise<{ success: boolean }> {
    clearSessionToken();
    try {
      const { setActiveMasterKey } = await import('@/lib/crypto/e2ee');
      setActiveMasterKey(null);
    } catch {}
    try {
      return await apiClient.post<{ success: boolean }>('/api/auth/logout');
    } catch {
      return { success: true };
    }
  },

  /**
   * Creates an authoritative guest session in Convex via server-side HttpOnly cookie issuance.
   */
  async continueAsGuest(name?: string): Promise<AuthSuccessResponse> {
    const res = await apiClient.post<AuthSuccessResponse>('/api/auth/guest', { name });
    if (res.sessionToken) {
      setSessionToken(res.sessionToken);
    }
    return res;
  },

  /**
   * Updates profile information (e.g. name, phone number, password).
   */
  async setupProfile(payload: SetupProfilePayload): Promise<{ success: boolean; user: UserProfile }> {
    return apiClient.post<{ success: boolean; user: UserProfile }>('/api/auth/setup', payload);
  },

  /**
   * Sends an OTP for phone verification or password reset.
   */
  async sendOtp(phoneNumber: string, type: string = 'phone_otp'): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/api/auth/otp/send', { phoneNumber, type });
  },

  /**
   * Verifies a 6-digit phone OTP.
   */
  async verifyOtp(phoneNumber: string, otp: string, type: string = 'phone_otp'): Promise<{ success: boolean; user?: UserProfile }> {
    return apiClient.post('/api/auth/otp/verify', { phoneNumber, otp, type });
  },

  /**
   * Requests a password recovery link/code.
   */
  async requestPasswordReset(identifier: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/api/auth/forgot-password', { identifier });
  },

  /**
   * Resets password using verification token or code.
   */
  async resetPassword(data: {
    identifier: string;
    token: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    return apiClient.post('/api/auth/reset-password', data);
  },

  /**
   * Verifies an email confirmation token.
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    return apiClient.get('/api/auth/verify-email', {
      params: { token },
    });
  },
};

