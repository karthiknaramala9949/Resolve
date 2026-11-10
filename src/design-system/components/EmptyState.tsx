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
          <svg className="w-24 h-24 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="35" width="55" height="70" rx="8" fill="#F3EFE7" stroke="#E5DFD5" strokeWidth="1.5" />
            <rect x="40" y="20" width="55" height="70" rx="8" fill="#FFFFFF" stroke="#C8372D" strokeWidth="1.5" />
            <path d="M52 38H80" stroke="#C8372D" strokeWidth="2" strokeLinecap="round" />
            <path d="M52 48H80" stroke="#E5DFD5" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M52 58H70" stroke="#E5DFD5" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="78" cy="74" r="12" fill="#C8372D" />
            <path d="M74 74L77 77L82 71" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'purchases':
        return (
          <svg className="w-24 h-24 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="30" y="45" width="60" height="50" rx="6" fill="#F3EFE7" stroke="#E5DFD5" strokeWidth="1.5" />
            <path d="M30 60H90" stroke="#C8372D" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M45 45V34C45 25.7157 51.7157 19 60 19C68.2843 19 75 25.7157 75 34V45" stroke="#C8372D" strokeWidth="2" strokeLinecap="round" />
            <circle cx="60" cy="74" r="6" fill="#FFFFFF" stroke="#C8372D" strokeWidth="1.5" />
          </svg>
        );
      case 'reminders':
        return (
          <svg className="w-24 h-24 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="30" width="70" height="65" rx="8" fill="#FFFFFF" stroke="#E5DFD5" strokeWidth="1.5" />
            <path d="M25 45H95" stroke="#C8372D" strokeWidth="2" />
            <rect x="40" y="20" width="6" height="15" rx="3" fill="#C8372D" />
            <rect x="74" y="20" width="6" height="15" rx="3" fill="#C8372D" />
            <circle cx="60" cy="68" r="14" fill="#F3EFE7" />
            <path d="M60 62V68L64 70" stroke="#C8372D" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
      case 'search':
        return (
          <svg className="w-24 h-24 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="52" cy="52" r="24" stroke="#C8372D" strokeWidth="2" fill="#FFFFFF" />
            <path d="M70 70L90 90" stroke="#C8372D" strokeWidth="3" strokeLinecap="round" />
            <path d="M42 52H62" stroke="#E5DFD5" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
      case 'cases':
      default:
        return (
          <svg className="w-24 h-24 mx-auto" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="35" width="70" height="55" rx="8" fill="#F3EFE7" stroke="#E5DFD5" strokeWidth="1.5" />
            <path d="M40 35V28C40 24.6863 42.6863 22 46 22H74C77.3137 22 80 24.6863 80 28V35" stroke="#C8372D" strokeWidth="2" strokeLinecap="round" />
            <rect x="42" y="52" width="36" height="5" rx="2.5" fill="#C8372D" />
            <circle cx="60" cy="72" r="3.5" fill="#C8372D" />
          </svg>
        );
    }
  };

  return (
    <div className={cn('text-center py-10 px-4 max-w-md mx-auto', className)}>
      <div className="mb-3">{renderIllustration()}</div>
      <h3 className="text-lg font-serif font-medium text-charcoal">
        {title}
      </h3>
      <p className="mt-1 text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
