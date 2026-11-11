'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Input, Button } from '@/design-system';
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Phone } from 'lucide-react';
import { authService } from '@/services/authService';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<{
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email address or phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authService.requestPasswordReset(identifier.trim());

      setSentInfo({
        message: res.message || 'If an account exists, we have sent instructions.',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email address or phone number to receive password reset instructions."
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
              <h3 className="text-sm font-semibold">Reset link sent</h3>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {sentInfo.message}
            </p>
          </div>

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
            hint="We'll send an email link or a verification code depending on what you enter."
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
            Send reset instructions
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

