'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { GoogleButton, AuthDivider } from '@/features/auth/components/GoogleButton';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { PasswordStrengthMeter } from '@/features/auth/components/PasswordStrengthMeter';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { Input, Button } from '@/design-system';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Mail, Phone, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('next') || '/app/overview';

  const { register } = useAuth();

  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (method === 'email' && !email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (method === 'phone' && (!phoneNumber || phoneNumber.length < 10)) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await register({
        name: name.trim(),
        email: method === 'email' ? email.trim() : undefined,
        phoneNumber: method === 'phone' ? phoneNumber.trim() : undefined,
        password,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
        setIsSubmitting(false);
        return;
      }

      if (res.verificationRequired === 'phone') {
        const query = new URLSearchParams({
          phone: phoneNumber.trim(),
          next: returnTo,
        });
        router.push(`/auth/verify-phone?${query.toString()}`);
      } else {
        const query = new URLSearchParams({
          email: email.trim(),
          next: returnTo,
        });
        router.push(`/auth/verify-email?${query.toString()}`);
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Organize consumer complaints, track refund milestones, and enforce statutory rights."
    >
      {/* Google OAuth Quick Start */}
      <GoogleButton returnTo={returnTo} />

      <AuthDivider label="OR SIGN UP WITH" />

      {/* Method Tabs */}
      <div className="flex rounded-xl bg-steel-grey-100 p-1 mb-5 select-none">
        <button
          type="button"
          onClick={() => {
            setMethod('email');
            setErrorMessage(null);
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            method === 'email'
              ? 'bg-white text-charcoal shadow-2xs'
              : 'text-steel-grey-600 hover:text-charcoal'
          )}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email address</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMethod('phone');
            setErrorMessage(null);
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
            method === 'phone'
              ? 'bg-white text-charcoal shadow-2xs'
              : 'text-steel-grey-600 hover:text-charcoal'
          )}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Phone number</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label="Full name"
          type="text"
          placeholder="e.g. Priya Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          disabled={isSubmitting}
        />

        {method === 'email' ? (
          <Input
            id="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isSubmitting}
          />
        ) : (
          <PhoneInput
            id="phone"
            label="Phone number"
            value={phoneNumber}
            onChange={setPhoneNumber}
            required
            disabled={isSubmitting}
          />
        )}

        <div>
          <PasswordInput
            id="password"
            label="Password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <p className="text-[11px] text-steel-grey-500 leading-normal pt-1">
          By continuing, you agree to local proof packaging and client-side evidence storage under
          our privacy principles.
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Create account
        </Button>
      </form>

      {/* Navigation to Sign In */}
      <div className="mt-6 pt-5 border-t border-steel-grey-100 text-center">
        <p className="text-xs text-steel-grey-600">
          Already have an account?{' '}
          <Link
            href={`/auth/signin${returnTo !== '/app/overview' ? `?next=${encodeURIComponent(returnTo)}` : ''}`}
            className="font-semibold text-coral hover:text-coral-700 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F4]" />}>
      <SignUpContent />
    </Suspense>
  );
}
