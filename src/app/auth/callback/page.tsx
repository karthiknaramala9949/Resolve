'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Button } from '@/design-system';
import { RefreshCw, AlertCircle } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isMock = searchParams.get('mock') === 'google';
  const stateParam = searchParams.get('state');
  const codeParam = searchParams.get('code');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    // If real Google callback returned to this route
    if (codeParam && stateParam) {
      window.location.href = `/api/auth/google/callback?code=${encodeURIComponent(codeParam)}&state=${encodeURIComponent(stateParam)}`;
      return;
    }

    if (errorParam) {
      router.push(`/auth/signin?error=${encodeURIComponent(errorParam)}`);
    }
  }, [codeParam, stateParam, errorParam, router]);

  return (
    <AuthLayout
      title={isMock ? 'Google Sign-In' : 'Completing authentication'}
      subtitle={
        isMock
          ? 'Authentication status'
          : 'Verifying cryptographic tokens and establishing your secure session.'
      }
    >
      {isMock ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Google sign-in is not available</p>
              <p className="text-xs text-amber-700 mt-1">
                Google OAuth is not configured on this environment. Please sign in with your email or phone number.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            onClick={() => router.push('/auth/signin')}
          >
            <span>Back to Sign In</span>
          </Button>
        </div>
      ) : (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-steel-grey-100 flex items-center justify-center mx-auto text-coral animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-semibold text-charcoal">Securing your session...</h3>
          <p className="text-xs text-steel-grey-500">Please wait while we redirect you to your workspace.</p>
        </div>
      )}
    </AuthLayout>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F4]" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
