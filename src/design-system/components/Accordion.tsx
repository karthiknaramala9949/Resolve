'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  defaultOpenId?: string;
  allowMultiple?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultOpenId,
  allowMultiple = false,
  className = '',
}) => {
  const [openIds, setOpenIds] = useState<string[]>(
    defaultOpenId ? [defaultOpenId] : []
  );

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={cn('divide-y divide-steel-grey-200 border-y border-steel-grey-200', className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const headerId = `accordion-header-${item.id}`;
        const panelId = `accordion-panel-${item.id}`;

        return (
          <div key={item.id} className="py-1">
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="w-full py-3.5 flex items-center justify-between gap-4 text-left font-medium text-sm sm:text-base text-charcoal hover:text-coral transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 rounded-lg select-none"
              >
                <span>{item.title}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-steel-grey-400 shrink-0 transform transition-transform duration-200 ease-out motion-reduce:transition-none',
                    isOpen && 'rotate-180 text-coral'
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!isOpen}
              className={cn(
                'overflow-hidden transition-all duration-200 ease-out',
                isOpen
                  ? 'max-h-96 opacity-100 pb-4 text-xs sm:text-sm text-steel-grey-600 leading-relaxed'
                  : 'max-h-0 opacity-0'
              )}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

