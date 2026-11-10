'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password?: string;
  showRules?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  showRules = true,
}) => {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'One number (0-9)', met: /[0-9]/.test(password) },
    { label: 'One special symbol (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = rules.filter((r) => r.met).length;

  const getStrengthInfo = () => {
    if (!password) return { label: 'Empty', color: 'bg-steel-grey-200', text: 'text-steel-grey-400' };
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (score === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
    if (score === 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
    return { label: 'Strong', color: 'bg-emerald-600', text: 'text-emerald-700' };
  };

  const strength = getStrengthInfo();

  if (!password && !showRules) return null;

  return (
    <div className="space-y-2 mt-1.5 select-none" aria-live="polite">
      {/* Strength Bar */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              step <= score ? strength.color : 'bg-steel-grey-200'
            )}
          />
        ))}
      </div>

      {password && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-steel-grey-600">Password strength:</span>
          <span className={cn('font-semibold', strength.text)}>{strength.label}</span>
        </div>
      )}

      {/* Rules list */}
      {showRules && (
        <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                rule.met ? 'text-emerald-700 font-medium' : 'text-steel-grey-500'
              )}
            >
              {rule.met ? (
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-steel-grey-300 shrink-0 flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-steel-grey-400" />
                </div>
              )}
              <span>{rule.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

