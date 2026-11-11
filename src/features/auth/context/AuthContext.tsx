'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, LoginFormData, RegisterFormData } from '../types';
import { syncEngine } from '@/lib/sync/syncEngine';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterFormData) => Promise<{
    success: boolean;
    user?: UserProfile;
    verificationRequired?: 'email' | 'phone';
    debugOtp?: string;
    debugVerificationToken?: string;
    error?: string;
  }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        if (data.sessionToken) {
          syncEngine.setSessionToken(data.sessionToken);
        } else {
          syncEngine.setSessionToken(null);
        }
      } else {
        setUser(null);
        syncEngine.setSessionToken(null);
      }
    } catch {
      setUser(null);
      syncEngine.setSessionToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (data: LoginFormData) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to sign in.' };
      }

      setUser(result.user);
      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Network connection error. Please check your connection and try again.',
      };
    }
  };

  const register = async (data: RegisterFormData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to register.' };
      }

      setUser(result.user);
      return {
        success: true,
        user: result.user,
        verificationRequired: result.verificationRequired,
        debugOtp: result.debugOtp,
        debugVerificationToken: result.debugVerificationToken,
      };
    } catch {
      return {
        success: false,
        error: 'Network connection error. Please check your connection and try again.',
      };
    }
  };

  const logout = async () => {
    try {
      syncEngine.setSessionToken(null);
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      setUser(null);
      router.push('/auth/signin');
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
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

