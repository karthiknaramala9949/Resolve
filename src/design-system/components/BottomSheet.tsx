'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-charcoal/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-lg bg-white border border-steel-grey-200 rounded-t-2xl md:rounded-2xl p-6 shadow-floating max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-150',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle for mobile */}
        <div className="w-12 h-1 bg-steel-grey-300 rounded-full mx-auto mb-4 md:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && (
              <h3 id="bottom-sheet-title" className="text-lg font-serif font-medium text-charcoal">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-xs sm:text-sm text-steel-grey-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-steel-grey-400 hover:text-charcoal rounded-lg hover:bg-steel-grey-100 transition-colors inline-flex items-center justify-center shrink-0 min-h-[36px] min-w-[36px]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
};
