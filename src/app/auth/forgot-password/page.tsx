'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Input, Button } from '@/design-system';
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Phone } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<{
    type: 'email' | 'phone';
    message: string;
    debugToken?: string;
    debugOtp?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered email address or phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit recovery request.');
        setIsSubmitting(false);
        return;
      }

      setSentInfo({
        type: data.type,
        message: data.message,
        debugToken: data.debugToken,
        debugOtp: data.debugOtp,
      });

      // If phone, auto-forward to reset-password with phone parameter
      if (data.type === 'phone') {
        const query = new URLSearchParams({
          identifier: identifier.trim(),
          type: 'phone',
        });
        if (data.debugOtp) query.set('code', data.debugOtp);
        setTimeout(() => {
          router.push(`/auth/reset-password?${query.toString()}`);
        }, 1200);
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Recover your password"
      subtitle="Enter your verified email address or phone number to receive secure recovery instructions."
    >
      {/* Back to sign in link */}
      <div className="mb-4">
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-steel-grey-600 hover:text-charcoal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success alert */}
      {sentInfo ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h3 className="text-sm font-semibold">Recovery instructions dispatched</h3>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {sentInfo.message}
            </p>
          </div>

          {sentInfo.type === 'email' && sentInfo.debugToken && (
            <div className="p-3 bg-steel-grey-50 rounded-xl border border-steel-grey-200 text-xs space-y-1">
              <p className="font-semibold text-charcoal">Quick testing link:</p>
              <Link
                href={`/auth/reset-password?token=${sentInfo.debugToken}&identifier=${encodeURIComponent(identifier.trim())}`}
                className="text-coral hover:underline font-mono text-[11px] break-all"
              >
                /auth/reset-password?token={sentInfo.debugToken.slice(0, 16)}...
              </Link>
            </div>
          )}

          {sentInfo.type === 'phone' && (
            <p className="text-xs text-center text-steel-grey-500">
              Redirecting to verification code entry...
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full mt-2"
            onClick={() => setSentInfo(null)}
          >
            Try another email or phone
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="identifier"
            label="Email or Phone Number"
            type="text"
            placeholder="e.g. name@example.com or +91 9876543210"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            hint="We'll send an email link or an SMS OTP code depending on the format you enter."
            required
            autoComplete="username"
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
            Send recovery link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

