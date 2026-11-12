'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button, Card, useToast } from '@/design-system';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { PasswordStrengthMeter } from '@/features/auth/components/PasswordStrengthMeter';
import { useAuth } from '@/features/auth/context/AuthContext';
import { authService } from '@/services/authService';
import {
  User,
  Mail,
  ShieldCheck,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Calendar,
  Check,
  Shield,
  Bell,
  Save,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser, logout } = useAuth();
  const { toast } = useToast();

  // Profile Form States
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Preference States
  const [smsReminders, setSmsReminders] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  // UI & Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Redirect unauthenticated visitors
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?next=/app/profile');
    }
  }, [isLoading, isAuthenticated, router]);

  // Synchronize form when user data loads or changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phoneNumber || '+91');
    }
  }, [user]);

  // Handle profile update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim()) {
      setFormError('Full name is required.');
      toast('Full name is required.', 'warning');
      return;
    }

    if (password) {
      if (password.length < 8) {
        setFormError('New password must be at least 8 characters long.');
        toast('New password must be at least 8 characters long.', 'warning');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('New password and confirmation do not match.');
        toast('New password and confirmation do not match.', 'warning');
        return;
      }
      if (user?.providers.includes('email') && !currentPassword) {
        setFormError('Please enter your current password to authorize a password change.');
        toast('Please enter your current password to authorize a password change.', 'warning');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload: Parameters<typeof authService.setupProfile>[0] = {
        name: name.trim(),
      };

      if (phoneNumber && phoneNumber.trim().length >= 10 && phoneNumber !== user?.phoneNumber) {
        payload.phoneNumber = phoneNumber.trim();
      }

      if (password) {
        payload.password = password;
        if (currentPassword) {
          payload.currentPassword = currentPassword;
        }
      }

      payload.preferences = {
        notificationsEnabled: smsReminders,
      };

      const res = await authService.setupProfile(payload);
      if (res.success) {
        await refreshUser();
        const successMsg = 'Profile and account details updated successfully.';
        setFormSuccess(successMsg);
        toast(successMsg, 'success');
        setPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        setIsChangingPassword(false);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Unable to update profile. Please try again.';
      setFormError(errMsg);
      toast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || (!isAuthenticated && typeof window !== 'undefined')) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-coral border-t-transparent animate-spin" />
        <p className="text-xs text-steel-grey-600 font-medium">Loading profile...</p>
      </div>
    );
  }

  const monogram = (name || user?.name || user?.email || 'U')[0]?.toUpperCase();
  const hasEmailPassword = Boolean(user?.providers.includes('email'));
  const hasGoogle = Boolean(user?.providers.includes('google'));
  const hasPhone = Boolean(user?.phoneNumber || user?.providers.includes('phone'));

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active Consumer';

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-medium text-charcoal tracking-tight">
            User Profile
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 mt-0.5 font-normal">
            Manage your personal contact details, verified credentials, and dispute reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Authenticated Profile</span>
          </div>
        </div>
      </div>

      {/* Account Overview Card */}
      <Card variant="elevated" className="p-6 bg-white border border-steel-grey-200 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || 'User profile'}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-coral flex items-center justify-center text-white font-serif font-medium text-2xl shadow-sm shrink-0">
                {monogram}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-serif font-medium text-charcoal truncate">
                  {user?.name || name || 'Consumer'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Verified</span>
                </span>
              </div>
              <p className="text-xs text-steel-grey-500 mt-0.5 truncate">
                {user?.email || user?.phoneNumber || 'Dispute Claimant'}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-steel-grey-500 font-mono">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-steel-grey-400" />
                  <span>Member since {formattedDate}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-steel-grey-100 gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-steel-grey-50 border border-steel-grey-200 text-xs font-mono text-steel-grey-700">
              <Shield className="w-3.5 h-3.5 text-steel-grey-500 shrink-0" />
              <span>AES-256 Vault Active</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {user?.providers?.map((provider) => (
                <span
                  key={provider}
                  className="px-2 py-0.5 rounded-md bg-steel-grey-100 text-steel-grey-700 text-[10px] font-mono font-medium capitalize"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {formSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-900 text-xs sm:text-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1 font-medium">{formSuccess}</div>
          </div>
        )}

        {formError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-900 text-xs sm:text-sm animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        {/* Section 1: Contact Details */}
        <Card variant="subtle" className="p-6 bg-white border border-steel-grey-200 rounded-2xl space-y-5">
          <div className="border-b border-steel-grey-100 pb-3">
            <h4 className="text-base font-serif font-medium text-charcoal">
              Contact information
            </h4>
            <p className="text-xs text-steel-grey-500 font-normal mt-0.5">
              These details are inserted into statutory legal notices and used to reach you when merchants respond.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full legal name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Karthik Naramala"
              required
            />

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full h-11 px-3.5 rounded-xl border border-steel-grey-200 bg-steel-grey-50 text-steel-grey-600 text-sm font-normal cursor-not-allowed select-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-steel-grey-500 mt-1">
                Used as your primary dispute account identifier.
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <PhoneInput
              label="Mobile phone number"
              value={phoneNumber}
              onChange={setPhoneNumber}
              error={undefined}
            />
            <p className="text-[11px] text-steel-grey-500 mt-1.5 font-normal">
              Used strictly for time-sensitive statutory dispute deadline alerts (15-day company response cutoff).
            </p>
          </div>
        </Card>

        {/* Section 2: Security & Password */}
        <Card variant="subtle" className="p-6 bg-white border border-steel-grey-200 rounded-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-steel-grey-100 pb-3">
            <div>
              <h4 className="text-base font-serif font-medium text-charcoal">
                Security & credentials
              </h4>
              <p className="text-xs text-steel-grey-500 font-normal mt-0.5">
                {hasEmailPassword
                  ? 'Your account has email & password authentication enabled.'
                  : 'You sign in with Google or Phone. You may also set a password for direct login.'}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isChangingPassword ? 'Cancel password change' : hasEmailPassword ? 'Change password' : 'Set a password'}</span>
            </Button>
          </div>

          {isChangingPassword && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-150">
              {hasEmailPassword && (
                <div className="max-w-md">
                  <PasswordInput
                    label="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password to verify"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <PasswordInput
                    label="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <PasswordStrengthMeter password={password} />
                </div>

                <div>
                  <PasswordInput
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-charcoal">Client Encryption</span>
              </div>
              <p className="text-[11px] text-steel-grey-500 mt-1">
                Zero-knowledge encrypted documents and evidence vault.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-charcoal">Mobile Verification</span>
              </div>
              <p className="text-[11px] text-steel-grey-500 mt-1">
                Instant OTP verification supported for emergency alerts.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-charcoal">CPA Compliance</span>
              </div>
              <p className="text-[11px] text-steel-grey-500 mt-1">
                Complies with Consumer Protection (E-Commerce) Rules, 2020.
              </p>
            </div>
          </div>
        </Card>

        {/* Section 3: Notification Preferences */}
        <Card variant="subtle" className="p-6 bg-white border border-steel-grey-200 rounded-2xl space-y-4">
          <div className="border-b border-steel-grey-100 pb-3">
            <h4 className="text-base font-serif font-medium text-charcoal flex items-center gap-2">
              <Bell className="w-4 h-4 text-coral" />
              <span>Dispute alert preferences</span>
            </h4>
            <p className="text-xs text-steel-grey-500 font-normal mt-0.5">
              Control how you receive updates when companies reply or legal deadlines approach.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200 cursor-pointer hover:border-steel-grey-300 transition-colors">
              <input
                type="checkbox"
                checked={smsReminders}
                onChange={(e) => setSmsReminders(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-steel-grey-300 text-coral focus:ring-coral/20"
              />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-charcoal block">
                  SMS deadline alerts & cutoff countdowns
                </span>
                <span className="text-xs text-steel-grey-500 block font-normal">
                  Receive SMS when the 15-day merchant response period or 30-day escalation deadline is near.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200 cursor-pointer hover:border-steel-grey-300 transition-colors">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-steel-grey-300 text-coral focus:ring-coral/20"
              />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-charcoal block">
                  Email updates & proof pack download links
                </span>
                <span className="text-xs text-steel-grey-500 block font-normal">
                  Receive email copies of generated proof packs and case milestone confirmations.
                </span>
              </div>
            </label>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              setName(user?.name || '');
              setPhoneNumber(user?.phoneNumber || '+91');
              setPassword('');
              setConfirmPassword('');
              setCurrentPassword('');
              setIsChangingPassword(false);
              setFormError(null);
              setFormSuccess(null);
            }}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Discard changes</span>
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            className="min-w-[140px]"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>{isSubmitting ? 'Saving...' : 'Save changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
