'use client';

import React, { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SwipeRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
  actionLabel?: string;
  confirmMessage?: string;
  disabled?: boolean;
  className?: string;
}

export const SwipeRow: React.FC<SwipeRowProps> = ({
  children,
  onDelete,
  deleteLabel = 'Delete',
  actionLabel,
  confirmMessage,
  disabled = false,
  className = '',
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const SWIPE_THRESHOLD = -72;
  const label = actionLabel || deleteLabel;

  const triggerDelete = () => {
    if (disabled) return;
    if (confirmMessage) {
      if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
        return;
      }
    }
    onDelete();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // Only allow swiping left (negative offset) up to -80px
    if (diff < 0) {
      setOffsetX(Math.max(-88, diff));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsSwiping(false);
    if (offsetX <= SWIPE_THRESHOLD) {
      // Swiped past threshold -> trigger delete
      setOffsetX(0);
      triggerDelete();
    } else {
      // Snap back
      setOffsetX(0);
    }
  };

  return (
    <div className={cn('relative overflow-hidden rounded-xl group', className)}>
      {/* Background action revealed on swipe */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-24 bg-red-600 flex items-center justify-end pr-5 text-white"
      >
        <Trash2 className="w-5 h-5 animate-pulse" />
      </div>

      {/* Foreground content sliding with touch gesture */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
        }}
        className={cn(
          'relative z-10 bg-white transition-transform',
          !isSwiping && 'duration-200 ease-out motion-reduce:transform-none'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">{children}</div>

          {/* Accessible, visible button alternative for keyboard and desktop users (Rule 7) */}
          <button
            type="button"
            onClick={triggerDelete}
            disabled={disabled}
            aria-label={label}
            title={label}
            className="opacity-70 hover:opacity-100 group-hover:opacity-100 text-steel-grey-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 shrink-0"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
