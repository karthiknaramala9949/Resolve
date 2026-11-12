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
      }
    } catch {
      setUser(null);
      setSessionToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
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
      await authService.logout();
    } catch {
      // Ignore
    } finally {
      setUser(null);
      router.push('/');
      router.refresh();
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

