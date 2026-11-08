import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: string | number;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className,
}) => {
  return (
    <nav aria-label="Progress Stepper" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && index <= currentStep;

          return (
            <li
              key={step.id}
              className={cn(
                'relative flex-1 flex flex-col items-center group',
                index !== steps.length - 1 &&
                  'after:content-[""] after:w-full after:h-0.5 after:bg-neutral-200 dark:after:bg-neutral-800 after:absolute after:top-4 after:left-1/2 after:-z-10',
                index < currentStep && 'after:bg-brand-500 dark:after:bg-brand-600'
              )}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick?.(index)}
                aria-label={`Step ${index + 1}: ${step.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  isCompleted
                    ? 'bg-brand-500 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-white dark:bg-surface-dark border-2 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm ring-4 ring-brand-50 dark:ring-brand-950/40'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700',
                  isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" /> : index + 1}
              </button>

              <span
                className={cn(
                  'mt-2 text-xs font-medium text-center transition-colors line-clamp-1 max-w-[90px]',
                  isCurrent
                    ? 'text-brand-600 dark:text-brand-400 font-semibold'
                    : isCompleted
                    ? 'text-neutral-800 dark:text-neutral-200'
                    : 'text-neutral-400 dark:text-neutral-500'
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
