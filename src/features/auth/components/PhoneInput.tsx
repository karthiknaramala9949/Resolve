'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface CountryCode {
  country: string;
  code: string;
  flag: string;
  placeholder: string;
}

export const POPULAR_COUNTRIES: CountryCode[] = [
  { country: 'India', code: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { country: 'United States', code: '+1', flag: '🇺🇸', placeholder: '202 555 0125' },
  { country: 'United Kingdom', code: '+44', flag: '🇬🇧', placeholder: '7911 123456' },
  { country: 'UAE', code: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { country: 'Singapore', code: '+65', flag: '🇸🇬', placeholder: '8123 4567' },
  { country: 'Canada', code: '+1', flag: '🇨🇦', placeholder: '416 555 0192' },
  { country: 'Australia', code: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
];

export interface PhoneInputProps {
  label?: string;
  hint?: string;
  error?: string;
  value?: string; // full E.164 string e.g. +919876543210
  onChange?: (fullPhone: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = 'Phone number',
  hint,
  error,
  value = '',
  onChange,
  disabled,
  required,
  id = 'phone-input',
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(POPULAR_COUNTRIES[0]);
  const [nationalNumber, setNationalNumber] = useState('');

  // Synchronize incoming value
  useEffect(() => {
    if (!value) {
      setNationalNumber('');
      return;
    }

    const matchedCountry = POPULAR_COUNTRIES.find((c) => value.startsWith(c.code));
    if (matchedCountry) {
      setSelectedCountry(matchedCountry);
      setNationalNumber(value.slice(matchedCountry.code.length).replace(/[^\d]/g, ''));
    } else {
      setNationalNumber(value.replace(/[^\d]/g, ''));
    }
  }, [value]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = POPULAR_COUNTRIES.find((c) => c.code === e.target.value) || POPULAR_COUNTRIES[0];
    setSelectedCountry(found);
    if (onChange) {
      const cleanDigits = nationalNumber.replace(/[^\d]/g, '');
      onChange(cleanDigits ? `${found.code}${cleanDigits}` : '');
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleanDigits = raw.replace(/[^\d]/g, '');
    setNationalNumber(cleanDigits);

    if (onChange) {
      onChange(cleanDigits ? `${selectedCountry.code}${cleanDigits}` : '');
    }
  };

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-charcoal">
          {label}
          {required && <span className="text-coral ml-1">*</span>}
        </label>
      )}

      <div className="flex rounded-xl border border-steel-grey-200 bg-white focus-within:border-coral focus-within:ring-2 focus-within:ring-coral/20 transition-all overflow-hidden">
        {/* Country Code Selector */}
        <div className="relative border-r border-steel-grey-200 bg-steel-grey-50 flex items-center shrink-0">
          <select
            value={selectedCountry.code}
            onChange={handleCountryChange}
            disabled={disabled}
            className="appearance-none bg-transparent pl-3 pr-7 py-2.5 text-sm font-medium text-charcoal focus:outline-none cursor-pointer disabled:cursor-not-allowed"
            aria-label="Country calling code"
          >
            {POPULAR_COUNTRIES.map((c) => (
              <option key={`${c.country}-${c.code}`} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-steel-grey-500 absolute right-2 pointer-events-none" />
        </div>

        {/* National Number Input */}
        <input
          id={id}
          type="tel"
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder={selectedCountry.placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'flex-1 px-3.5 py-2.5 text-base text-charcoal bg-transparent placeholder-steel-grey-400 focus:outline-none disabled:opacity-50 disabled:bg-steel-grey-50',
            error && 'text-red-600'
          )}
        />
      </div>

      {hint && !error && <p className="text-xs text-steel-grey-600 font-medium">{hint}</p>}
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
};

