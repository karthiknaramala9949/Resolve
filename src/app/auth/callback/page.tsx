'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Button, Input } from '@/design-system';
import { RefreshCw, AlertCircle, CheckCircle2, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isMock = searchParams.get('mock') === 'google';
  const stateParam = searchParams.get('state');
  const codeParam = searchParams.get('code');
  const errorParam = searchParams.get('error');

  const { refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(!isMock);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state for interactive simulation when GCP credentials aren't provided in dev
  const [simEmail, setSimEmail] = useState('karthik.consumer@gmail.com');
  const [simName, setSimName] = useState('Karthik Naramala');
  const [isSimulating, setIsSimulating] = useState(false);

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

  const handleSimulateGoogleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!simEmail.trim()) return;

    try {
      setIsSimulating(true);
      const res = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: simEmail.trim(),
          name: simName.trim() || 'Google User',
          picture: 'https://lh3.googleusercontent.com/a/default-user',
          googleId: `google_${simEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          returnTo: '/app/overview',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to authenticate Google account.');
        setIsSimulating(false);
        return;
      }

      await refreshUser();
      router.push(data.redirectTo || '/app/overview');
    } catch {
      setErrorMessage('Network error during Google authentication.');
      setIsSimulating(false);
    }
  };

  return (
    <AuthLayout
      title="Completing authentication"
      subtitle="Verifying cryptographic tokens and establishing your secure session."
    >
      {isMock ? (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Google Identity Verification Sandbox</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Google OAuth simulation for local review and automated testing. You can link this
                Google profile to any existing account or create a new user.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSimulateGoogleLogin} className="space-y-3">
            <Input
              id="google-email"
              label="Google Verified Email"
              type="email"
              value={simEmail}
              onChange={(e) => setSimEmail(e.target.value)}
              required
              disabled={isSimulating}
            />

            <Input
              id="google-name"
              label="Full Name from Google Profile"
              type="text"
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              disabled={isSimulating}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isSimulating}
              disabled={isSimulating}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              <span>Confirm Google Sign-In</span>
            </Button>
          </form>
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
