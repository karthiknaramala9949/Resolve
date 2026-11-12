'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { GoogleButton, AuthDivider } from '@/features/auth/components/GoogleButton';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { Input, Button } from '@/design-system';
import { useAuth } from '@/features/auth/context/AuthContext';
import { sanitizeRedirectUrl } from '@/lib/server/auth/redirect';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next');
  const returnTo = sanitizeRedirectUrl(
    rawNext,
    typeof window !== 'undefined' ? window.location.origin : undefined,
    '/app/overview'
  );
  const errorParam = searchParams.get('error');
  const messageParam = searchParams.get('message');

  const { login, isOnline, isAuthenticated, isLoading, user } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOfflineError, setIsOfflineError] = useState(false);

  useEffect(() => {
    if (errorParam === 'oauth_cancelled') {
      setErrorMessage('Google sign-in was cancelled. Please try again or enter your password below.');
    } else if (errorParam === 'session_expired') {
      setErrorMessage('Your session has ended. Please sign in again.');
    } else if (errorParam) {
      setErrorMessage('Could not sign you in. Please try again.');
    }

    if (messageParam === 'password_reset') {
      setSuccessMessage('Your password has been successfully reset. Please sign in.');
    } else if (messageParam === 'email_verified') {
      setSuccessMessage('Email verified successfully. You may now sign in.');
    }
  }, [errorParam, messageParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsOfflineError(false);

    if (!isOnline) {
      setIsOfflineError(true);
      setErrorMessage('You are currently offline. An internet connection is required to sign in.');
      return;
    }

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or phone number.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Invalid credentials.');
        setIsOfflineError(Boolean(res.isOffline));
        setIsSubmitting(false);
        return;
      }

      router.push(returnTo);
    } catch {
      setIsOfflineError(true);
      setErrorMessage('An unexpected network error occurred. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your consumer profile, track complaints, and organize evidence."
    >
      {/* Google OAuth Button */}
      <GoogleButton returnTo={returnTo} />

      <AuthDivider label="OR SIGN IN WITH PASSWORD" />

      {/* Success banner */}
      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Offline Alert */}
      {(isOfflineError || !isOnline) && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-950">Internet connection required</p>
            <p className="text-amber-800">
              Please connect to the internet to sign in and securely manage your profile and dispute cases.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && !isOfflineError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sign In Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="identifier"
          label="Email address or phone number"
          type="text"
          placeholder="e.g. name@example.com or +91 9876543210"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete="username"
          disabled={isSubmitting}
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-charcoal">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-coral hover:text-coral-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            label=""
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isSubmitting}
          />
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-steel-grey-300 text-coral focus:ring-coral/20 cursor-pointer"
            />
            <span className="text-xs text-steel-grey-600 font-medium">Keep me signed in</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Sign in
        </Button>
      </form>

      {/* Navigation to Sign Up */}
      <div className="mt-6 pt-5 border-t border-steel-grey-100 text-center">
        <p className="text-xs text-steel-grey-600">
          New to RESOLVE-ONE?{' '}
          <Link
            href={`/signup${returnTo !== '/app/overview' ? `?next=${encodeURIComponent(returnTo)}` : ''}`}
            className="font-semibold text-coral hover:text-coral-700 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F4]" />}>
      <SignInContent />
    </Suspense>
  );
}
