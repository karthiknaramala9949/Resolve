import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Search, FolderKanban, FileText, ShoppingBag, BookOpen, Clock, ShieldCheck, Plus, Sparkles, X } from 'lucide-react';

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
  const navigate = useNavigate();
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
    { id: 'act-new', label: 'Create new case', category: 'Actions', icon: Plus, action: () => navigate('/app/cases?new=true') },
    { id: 'nav-overview', label: 'Go to Overview', category: 'Navigation', icon: FolderKanban, action: () => navigate('/app/overview') },
    { id: 'nav-cases', label: 'Go to My Cases', category: 'Navigation', icon: FolderKanban, action: () => navigate('/app/cases') },
    { id: 'nav-docs', label: 'Go to Documents', category: 'Navigation', icon: FileText, action: () => navigate('/app/documents') },
    { id: 'nav-purchases', label: 'Go to Purchases', category: 'Navigation', icon: ShoppingBag, action: () => navigate('/app/purchases') },
    { id: 'nav-help', label: 'Rights & Consumer Routes Guide', category: 'Navigation', icon: BookOpen, action: () => navigate('/app/help') },
    { id: 'nav-reminders', label: 'Go to Reminders', category: 'Navigation', icon: Clock, action: () => navigate('/app/reminders') },
    { id: 'nav-privacy', label: 'Privacy & Data Trust Export', category: 'Navigation', icon: ShieldCheck, action: () => navigate('/app/privacy') },
  ];

  // Map cases to searchable items
  const caseItems = cases.map((c) => ({
    id: c.id,
    label: `${c.id} · ${c.title} (${c.company})`,
    category: 'Cases',
    icon: FolderKanban,
    action: () => navigate(`/app/cases/${c.id}`),
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-surface-dark border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-floating overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, companies, proof, or actions... (Esc to close)"
            className="w-full bg-transparent text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
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
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={cn('w-4 h-4 shrink-0', isSelected ? 'text-brand-500' : 'text-neutral-400')} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 shrink-0 ml-2">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-light-subtle dark:bg-surface-dark-subtle border-t border-neutral-100 dark:border-neutral-800/80 text-[11px] text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border font-mono">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border font-mono">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border font-mono">↵</kbd> to select
            </span>
          </div>
          <span>Local index only</span>
        </div>
      </div>
    </div>
  );
};

