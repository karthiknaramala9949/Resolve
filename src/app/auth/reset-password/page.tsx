'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { PasswordStrengthMeter } from '@/features/auth/components/PasswordStrengthMeter';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { Input, Button } from '@/design-system';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialToken = searchParams.get('token') || '';
  const initialIdentifier = searchParams.get('identifier') || searchParams.get('email') || '';
  const initialCode = searchParams.get('code') || '';
  const isPhone = searchParams.get('type') === 'phone' || (initialIdentifier && !initialIdentifier.includes('@'));

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [token, setToken] = useState(initialToken || initialCode);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialToken) setToken(initialToken);
    else if (initialCode) setToken(initialCode);
    if (initialIdentifier) setIdentifier(initialIdentifier);
  }, [initialToken, initialCode, initialIdentifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Please provide your email address or phone number.');
      return;
    }

    if (!token.trim()) {
      setErrorMessage('Please enter the reset code or link.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please check and try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.resetPassword({
        identifier: identifier.trim(),
        token: token.trim(),
        newPassword,
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/app/overview');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect. Please check your internet connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create new password"
      subtitle="Choose a strong password to protect your account and records."
    >
      <div className="mb-4">
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-steel-grey-600 hover:text-charcoal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success banner */}
      {isSuccess ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-charcoal">Password updated!</h3>
          <p className="text-xs text-steel-grey-600">
            Your password has been changed. Signing you in now...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialIdentifier && (
            <Input
              id="identifier"
              label="Email address or phone number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. name@example.com or +91 9876543210"
              required
              disabled={isSubmitting}
            />
          )}

          {isPhone ? (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-charcoal text-center">
                Enter 6-digit recovery code
              </label>
              <OtpInput
                length={6}
                value={token}
                onChange={setToken}
                disabled={isSubmitting}
              />
            </div>
          ) : (
            !initialToken && (
              <Input
                id="token"
                label="Reset code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the reset code from your email"
                required
                disabled={isSubmitting}
              />
            )
          )}

          <div>
            <PasswordInput
              id="new-password"
              label="New password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            <PasswordStrengthMeter password={newPassword} />
          </div>

          <PasswordInput
            id="confirm-password"
            label="Confirm new password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Update password and sign in
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F4]" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
