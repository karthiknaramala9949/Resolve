import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: 'cases' | 'documents' | 'purchases' | 'reminders' | 'search';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  illustration = 'cases',
  className,
}) => {
  const renderIllustration = () => {
    switch (illustration) {
      case 'documents':
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="35" width="55" height="70" rx="8" fill="#F6F8F9" stroke="#DCE1E5" strokeWidth="2" className="dark:fill-neutral-800 dark:stroke-neutral-700" />
            <rect x="40" y="20" width="55" height="70" rx="8" fill="#FFFFFF" stroke="#FF4B32" strokeWidth="2" className="dark:fill-neutral-900" />
            <path d="M52 38H80" stroke="#FF4B32" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M52 48H80" stroke="#DCE1E5" strokeWidth="2" strokeLinecap="round" className="dark:stroke-neutral-700" />
            <path d="M52 58H70" stroke="#DCE1E5" strokeWidth="2" strokeLinecap="round" className="dark:stroke-neutral-700" />
            <circle cx="78" cy="74" r="14" fill="#FF4B32" />
            <path d="M74 74L77 77L83 71" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'purchases':
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="30" y="45" width="60" height="50" rx="6" fill="#F6F8F9" stroke="#DCE1E5" strokeWidth="2" className="dark:fill-neutral-800 dark:stroke-neutral-700" />
            <path d="M30 60H90" stroke="#FF4B32" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M45 45V34C45 25.7157 51.7157 19 60 19C68.2843 19 75 25.7157 75 34V45" stroke="#FF4B32" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="60" cy="74" r="8" fill="#FFFFFF" stroke="#FF4B32" strokeWidth="2" className="dark:fill-neutral-900" />
          </svg>
        );
      case 'reminders':
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="30" width="70" height="65" rx="10" fill="#FFFFFF" stroke="#DCE1E5" strokeWidth="2" className="dark:fill-neutral-900 dark:stroke-neutral-700" />
            <path d="M25 45H95" stroke="#FF4B32" strokeWidth="3" />
            <rect x="40" y="20" width="6" height="15" rx="3" fill="#FF4B32" />
            <rect x="74" y="20" width="6" height="15" rx="3" fill="#FF4B32" />
            <circle cx="60" cy="68" r="16" fill="#F6F8F9" className="dark:fill-neutral-800" />
            <path d="M60 60V68L65 71" stroke="#FF4B32" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'search':
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="52" cy="52" r="26" stroke="#FF4B32" strokeWidth="3" fill="#FFFFFF" className="dark:fill-neutral-900" />
            <path d="M72 72L94 94" stroke="#FF4B32" strokeWidth="4" strokeLinecap="round" />
            <path d="M42 52H62" stroke="#DCE1E5" strokeWidth="2" strokeLinecap="round" className="dark:stroke-neutral-700" />
          </svg>
        );
      case 'cases':
      default:
        return (
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="35" width="70" height="55" rx="10" fill="#F6F8F9" stroke="#DCE1E5" strokeWidth="2" className="dark:fill-neutral-800 dark:stroke-neutral-700" />
            <path d="M40 35V28C40 24.6863 42.6863 22 46 22H74C77.3137 22 80 24.6863 80 28V35" stroke="#FF4B32" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="42" y="52" width="36" height="6" rx="3" fill="#FF4B32" />
            <circle cx="60" cy="72" r="4" fill="#FF4B32" />
          </svg>
        );
    }
  };

  return (
    <div className={cn('text-center py-12 px-4 max-w-md mx-auto', className)}>
      <div className="mb-4">{renderIllustration()}</div>
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 font-serif">
        {title}
      </h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
