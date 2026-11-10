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
                  'after:content-[""] after:w-full after:h-0.5 after:bg-steel-grey-200 after:absolute after:top-4 after:left-1/2 after:-z-10',
                index < currentStep && 'after:bg-coral'
              )}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick?.(index)}
                aria-label={`Step ${index + 1}: ${step.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 focus-visible:ring-offset-1',
                  isCompleted
                    ? 'bg-coral text-white shadow-2xs'
                    : isCurrent
                    ? 'bg-white border-2 border-coral text-coral shadow-2xs'
                    : 'bg-steel-grey-100 text-steel-grey-600 border border-steel-grey-200',
                  isClickable ? 'cursor-pointer hover:bg-steel-grey-200' : 'cursor-default'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2]" aria-hidden="true" /> : index + 1}
              </button>

              <div className="mt-2 text-center">
                <span
                  className={cn(
                    'block text-xs transition-colors',
                    isCurrent
                      ? 'font-medium text-charcoal'
                      : isCompleted
                      ? 'text-steel-grey-700'
                      : 'text-steel-grey-500'
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="hidden sm:block text-[11px] text-steel-grey-500 mt-0.5">
                    {step.description}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
