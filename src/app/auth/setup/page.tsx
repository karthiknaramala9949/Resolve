'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { PasswordStrengthMeter } from '@/features/auth/components/PasswordStrengthMeter';
import { Input, Button } from '@/design-system';
import { useAuth } from '@/features/auth/context/AuthContext';
import { authService } from '@/services/authService';
import { UserCheck, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

export default function AccountSetupPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '+91');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const payload: Record<string, string> = {};
      if (name.trim()) payload.name = name.trim();
      if (phoneNumber && phoneNumber.length >= 10 && phoneNumber !== user?.phoneNumber) {
        payload.phoneNumber = phoneNumber.trim();
      }
      if (password && password.length >= 8) {
        payload.password = password;
      }

      await authService.setupProfile(payload);
      await refreshUser();
      router.push('/app/overview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while saving profile.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Complete your profile"
      subtitle="Confirm your details so you can receive important updates and deadline reminders."
    >
      <div className="space-y-5">
        {/* Linked Identity Badge */}
        {user?.email && (
          <div className="flex items-center gap-3 p-3 bg-steel-grey-50 rounded-xl border border-steel-grey-200">
            <div className="w-9 h-9 rounded-full bg-coral text-white font-medium flex items-center justify-center font-serif text-sm">
              {user.name ? user.name[0]?.toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-charcoal truncate">{user.name}</p>
              <p className="text-[11px] text-steel-grey-500 truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="full-name"
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            required
            disabled={isSubmitting}
          />

          <PhoneInput
            id="mobile-phone"
            label="Mobile number (for urgent deadline reminders)"
            value={phoneNumber}
            onChange={setPhoneNumber}
            hint="Used only for time-sensitive deadline reminders and case updates."
            disabled={isSubmitting}
          />

          {!user?.providers.includes('email') && (
            <div>
              <PasswordInput
                id="optional-password"
                label="Set an account password (optional)"
                placeholder="Allows password login alongside Google"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Optional: setting a password allows you to sign in without Google."
                disabled={isSubmitting}
              />
              {password && <PasswordStrengthMeter password={password} />}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            <span>Save and continue</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => router.push('/app/overview')}
              className="text-xs font-medium text-steel-grey-500 hover:text-charcoal transition-colors"
            >
              Skip for now and continue &rarr;
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}

