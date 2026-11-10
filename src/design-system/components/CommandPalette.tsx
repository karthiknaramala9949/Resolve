'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Search, FolderKanban, FileText, ShoppingBag, BookOpen, Clock, ShieldCheck, Plus, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  cases?: Array<{ id: string; title: string; company: string }>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  cases = [],
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static routes and quick actions
  const actions = [
    { id: 'act-new', label: 'Create new case', category: 'Actions', icon: Plus, action: () => router.push('/app/cases?new=true') },
    { id: 'nav-overview', label: 'Go to Overview', category: 'Navigation', icon: FolderKanban, action: () => router.push('/app/overview') },
    { id: 'nav-cases', label: 'Go to My Cases', category: 'Navigation', icon: FolderKanban, action: () => router.push('/app/cases') },
    { id: 'nav-docs', label: 'Go to Documents', category: 'Navigation', icon: FileText, action: () => router.push('/app/documents') },
    { id: 'nav-purchases', label: 'Go to Purchases', category: 'Navigation', icon: ShoppingBag, action: () => router.push('/app/purchases') },
    { id: 'nav-help', label: 'Rights & Consumer Routes Guide', category: 'Navigation', icon: BookOpen, action: () => router.push('/app/help') },
    { id: 'nav-reminders', label: 'Go to Reminders', category: 'Navigation', icon: Clock, action: () => router.push('/app/reminders') },
    { id: 'nav-privacy', label: 'Privacy & Data Trust Export', category: 'Navigation', icon: ShieldCheck, action: () => router.push('/app/privacy') },
  ];

  // Map cases to searchable items
  const caseItems = cases.map((c) => ({
    id: c.id,
    label: `${c.id} · ${c.title} (${c.company})`,
    category: 'Cases',
    icon: FolderKanban,
    action: () => router.push(`/app/cases/${c.id}`),
  }));

  const allItems = [...actions, ...caseItems];

  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-charcoal/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-steel-grey-200 rounded-2xl shadow-floating overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-steel-grey-200">
          <Search className="w-4 h-4 text-steel-grey-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, documents, or routes... (Esc to close)"
            className="w-full bg-transparent text-sm text-charcoal placeholder-steel-grey-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-steel-grey-400 hover:text-charcoal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-steel-grey-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-sm transition-colors',
                    isSelected
                      ? 'bg-steel-grey-100 text-charcoal font-medium'
                      : 'text-steel-grey-700 hover:bg-steel-grey-50'
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={cn('w-4 h-4 shrink-0', isSelected ? 'text-coral' : 'text-steel-grey-400')} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="text-xs text-steel-grey-500 shrink-0 ml-2">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-steel-grey-50 border-t border-steel-grey-100 text-xs text-steel-grey-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-steel-grey-200 font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-steel-grey-200 font-mono text-[10px]">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-steel-grey-200 font-mono text-[10px]">↵</kbd> select
            </span>
          </div>
          <span>Local index</span>
        </div>
      </div>
    </div>
  );
};
