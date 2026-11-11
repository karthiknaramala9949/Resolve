'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { Button } from '@/design-system';
import { Smartphone, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';

function VerifyPhoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phoneParam = searchParams.get('phone') || '';
  const initialCode = searchParams.get('code') || '';
  const returnTo = searchParams.get('next') || '/app/overview';

  const { refreshUser, user } = useAuth();

  const targetPhone = phoneParam || user?.phoneNumber || '';
  const [otp, setOtp] = useState<string>(initialCode);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleVerify = async (codeToVerify = otp) => {
    if (codeToVerify.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: targetPhone,
          otp: codeToVerify,
          type: 'phone_otp',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid verification code.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      await refreshUser();

      setTimeout(() => {
        router.push(returnTo);
      }, 1200);
    } catch {
      setErrorMessage('Network error while verifying OTP.');
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage(null);
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: targetPhone,
        type: 'phone_otp',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to resend code');
    }
  };

  return (
    <AuthLayout
      title="Verify your mobile number"
      subtitle="We sent a 6-digit one-time password (OTP) to your phone for identity verification."
    >
      <div className="mb-4">
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-steel-grey-600 hover:text-charcoal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change phone number</span>
        </Link>
      </div>

      {isSuccess ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-charcoal">Phone number verified!</h3>
          <p className="text-xs text-steel-grey-600">
            Your mobile number has been authenticated. Entering workspace...
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-coral-50 text-coral flex items-center justify-center mx-auto">
              <Smartphone className="w-5 h-5" />
            </div>
            <p className="text-xs text-steel-grey-500 font-medium">
              Sent to <strong className="text-charcoal font-semibold">{targetPhone || 'your phone'}</strong>
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="py-2">
            <OtpInput
              length={6}
              value={otp}
              onChange={setOtp}
              onComplete={(fullCode) => handleVerify(fullCode)}
              onResend={handleResend}
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            disabled={isSubmitting || otp.length !== 6}
            onClick={() => handleVerify()}
          >
            Verify and continue
          </Button>

          <div className="text-center">
            <Link
              href={returnTo}
              className="text-xs text-steel-grey-500 hover:text-charcoal transition-colors"
            >
              Skip verification for now &rarr;
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F4]" />}>
      <VerifyPhoneContent />
    </Suspense>
  );
}
