'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, LoginFormData, RegisterFormData } from '../types';
import { setSessionToken, clearSessionToken } from '@/lib/auth/sessionToken';
import { clearLocalUserData } from '@/lib/db/db';
import { authService, ApiError } from '@/services';

export interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isOnline: boolean;
  login: (data: LoginFormData) => Promise<{ success: boolean; isOffline?: boolean; error?: string }>;
  register: (data: RegisterFormData) => Promise<{
    success: boolean;
    user?: UserProfile;
    verificationRequired?: 'email' | 'phone';
    error?: string;
    isOffline?: boolean;
  }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

const AUTH_CHANNEL_NAME = 'resolve_auth_channel';
const AUTH_STORAGE_KEY = 'resolve_auth_sync';

export function broadcastAuthEvent(type: 'login' | 'logout'): void {
  if (typeof window === 'undefined') return;
  const payload = { type, timestamp: Date.now() };
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.postMessage(payload);
      setTimeout(() => {
        try {
          channel.close();
        } catch {}
      }, 1000);
    }
  } catch {
    // Ignore
  }
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const router = useRouter();

  // Network status listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    // If offline, don't query remote server
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      if (data && data.user) {
        setUser(data.user);
        if (data.sessionToken) {
          setSessionToken(data.sessionToken);
        } else {
          setSessionToken(null);
        }
      } else {
        setUser(null);
        setSessionToken(null);
        // Clear dead cookies server-side to prevent redirect loops between /app/* and /login
        authService.logout().catch(() => {});
      }
    } catch {
      setUser(null);
      setSessionToken(null);
      authService.logout().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Multi-tab sync, BroadcastChannel, storage events, throttled tab focus verification, and BFCache protection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastFocusCheckTime = 0;
    const FOCUS_THROTTLE_MS = 30000; // Throttle to at most once per 30s

    const handleRemoteLogout = async () => {
      clearSessionToken();
      await clearLocalUserData();
      try {
        await authService.logout();
      } catch {
        // Ignore
      }
      setUser(null);
      if (window.location.pathname.startsWith('/app')) {
        window.location.replace('/');
      }
    };

    const handleRemoteLogin = () => {
      refreshUser();
    };

    // 1. BroadcastChannel listener across tabs
    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        channel.onmessage = async (event) => {
          if (event.data?.type === 'logout') {
            await handleRemoteLogout();
          } else if (event.data?.type === 'login') {
            handleRemoteLogin();
          }
        };
      } catch {
        // Ignore
      }
    }

    // 2. Storage event listener (cross-window and fallback sync)
    const handleStorage = async (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'logout') {
            await handleRemoteLogout();
          } else if (data.type === 'login') {
            handleRemoteLogin();
          }
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Tab focus & visibility change listener (session check on tab focus throttled to 30s)
    const handleFocusOrVisible = async () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        if (window.location.pathname.startsWith('/app')) {
          const now = Date.now();
          if (lastFocusCheckTime !== 0 && now - lastFocusCheckTime < FOCUS_THROTTLE_MS) {
            return;
          }
          lastFocusCheckTime = now;

          try {
            const data = await authService.getMe();
            if (!data || !data.user) {
              await handleRemoteLogout();
            }
          } catch {
            await handleRemoteLogout();
          }
        }
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // 4. Back-forward cache listener (pageshow event when user presses Back after sign-out)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && window.location.pathname.startsWith('/app')) {
        handleFocusOrVisible();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [refreshUser]);

  const login = async (data: LoginFormData) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        isOffline: true,
        error: 'You are currently offline. Please connect to the internet to sign in.',
      };
    }

    try {
      const result = await authService.login(data);
      setUser(result.user);
      if (result.sessionToken) {
        setSessionToken(result.sessionToken);
      }
      await refreshUser();
      broadcastAuthEvent('login');
      return { success: true };
    } catch (err: any) {
      const isOfflineError =
        err?.isOffline ||
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (err instanceof TypeError && err.message.toLowerCase().includes('fetch'));

      return {
        success: false,
        isOffline: isOfflineError,
        error: isOfflineError
          ? 'You are currently offline. Please connect to the internet to sign in.'
          : err.message || 'Could not sign in. Please check your credentials and try again.',
      };
    }
  };

  const register = async (data: RegisterFormData) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        isOffline: true,
        error: 'You are currently offline. Please connect to the internet to create an account.',
      };
    }

    try {
      const result = await authService.register(data);
      setUser(result.user);
      if (result.sessionToken) {
        setSessionToken(result.sessionToken);
      }
      await refreshUser();
      broadcastAuthEvent('login');
      return {
        success: true,
        user: result.user,
        verificationRequired: result.verificationRequired,
      };
    } catch (err: any) {
      const isOfflineError =
        err?.isOffline ||
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (err instanceof TypeError && err.message.toLowerCase().includes('fetch'));

      return {
        success: false,
        isOffline: isOfflineError,
        error: isOfflineError
          ? 'You are currently offline. Please connect to the internet to create an account.'
          : err.message || 'Could not create account. Please try again.',
      };
    }
  };

  const logout = async () => {
    try {
      clearSessionToken();
      await clearLocalUserData();
      // Await server invalidation and cookie clearing first, then broadcast to other tabs
      await authService.logout();
      broadcastAuthEvent('logout');
    } catch {
      // Ignore
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      } else {
        router.push('/');
        router.refresh();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        isGuest: false,
        isOnline,
        login,
        register,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

