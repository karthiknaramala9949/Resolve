'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
  progress: number; // 0 to 100
  size?: number; // diameter in px (default 48)
  strokeWidth?: number; // default 4
  color?: string; // override stroke color class
  variant?: 'default' | 'success' | 'warning';
  trackColor?: string; // default text-steel-grey-200
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 48,
  strokeWidth = 4,
  color,
  variant = 'default',
  trackColor = 'text-steel-grey-200',
  label,
  showPercent = true,
  className = '',
  ...props
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const variantColors = {
    default: 'text-coral',
    success: 'text-emerald-600',
    warning: 'text-amber-500',
  };
  const activeColor = color || variantColors[variant];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
      className={cn('relative inline-flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className={trackColor}
        />
        {/* Animated progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            activeColor,
            'transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none'
          )}
        />
      </svg>

      {showPercent && (
        <span className="absolute text-[11px] font-semibold text-charcoal">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
};
