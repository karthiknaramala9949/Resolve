'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Button } from '@/design-system';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { authService } from '@/services/authService';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const returnTo = searchParams.get('next') || '/app/overview';

  const { refreshUser } = useAuth();

  const [state, setState] = useState<'verifying' | 'success' | 'idle' | 'error'>(
    token ? 'verifying' : 'idle'
  );
  const [message, setMessage] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // Auto-verify token if present in URL
  useEffect(() => {
    if (!token) return;

    const runVerification = async () => {
      try {
        setState('verifying');
        const res = await authService.verifyEmail(token);
        setState('success');
        setMessage(res.message || 'Email address successfully verified.');
        await refreshUser();
      } catch (err: any) {
        setState('error');
        setMessage(err.message || 'Failed to verify email link.');
      }
    };

    runVerification();
  }, [token, refreshUser]);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendCooldown(60);
        setMessage('A fresh verification link has been sent to your email.');
      } else {
        setMessage(data.error || 'Failed to resend verification email.');
      }
    } catch {
      setMessage('Failed to send verification request.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Confirming your email helps ensure you receive important case updates and deadline reminders."
    >
      {state === 'verifying' && (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-steel-grey-100 flex items-center justify-center mx-auto text-coral animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-semibold text-charcoal">Verifying your email...</h3>
          <p className="text-xs text-steel-grey-500">Checking your verification link...</p>
        </div>
      )}

      {state === 'success' && (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-charcoal">Email Verified!</h3>
            <p className="text-xs text-steel-grey-600">{message}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push(returnTo)}
          >
            <span>Continue to workspace</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {state === 'error' && (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-charcoal">Verification Failed</h3>
            <p className="text-xs text-red-600 font-medium">{message}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : 'Request new verification link'}
          </Button>
        </div>
      )}

      {state === 'idle' && (
        <div className="text-center py-2 space-y-4">
          <div className="w-12 h-12 rounded-full bg-coral-50 text-coral flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-charcoal">Check your email</h3>
            <p className="text-xs text-steel-grey-600 max-w-xs mx-auto">
              We sent a verification link to{' '}
              <strong className="text-charcoal font-semibold">{emailParam || 'your email address'}</strong>.
              Click the link in the message to activate your account.
            </p>
          </div>

          {message && (
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs font-medium">
              {message}
            </div>
          )}

          <div className="pt-2 space-y-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
            >
              {resendCooldown > 0 ? (
                `Resend email in ${resendCooldown}s`
              ) : (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend verification email</span>
                </span>
              )}
            </Button>

            <Link
              href={returnTo}
              className="block text-xs font-medium text-steel-grey-500 hover:text-charcoal transition-colors pt-1"
            >
              Skip for now and continue to app &rarr;
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F4]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
