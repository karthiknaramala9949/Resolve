import React from 'react';
import { Card, Button } from '@/design-system';
import { useAppStore } from '@/store/useAppStore';
import { Sun, Moon, Globe, Type, Sparkles } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    locale,
    setLocale,
    simpleLanguageMode,
    setSimpleLanguageMode,
  } = useAppStore();

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
          Settings
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Customize language, appearance, and accessibility preferences.
        </p>
      </div>

      {/* Language */}
      <Card variant="default" className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-brand-500" />
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Language (भाषा / భాష)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Select your preferred display language for all complaint guidance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { id: 'en', label: 'English', sub: 'Default' },
            { id: 'hi', label: 'हिन्दी', sub: 'Hindi' },
            { id: 'te', label: 'తెలుగు', sub: 'Telugu' },
          ].map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => setLocale(lang.id as any)}
              className={`p-4 rounded-xl border text-left transition-all ${
                locale === lang.id
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-100 font-semibold shadow-2xs'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
            >
              <div className="text-base">{lang.label}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{lang.sub}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Simple Language Mode */}
      <Card variant="default" className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Simple Language Mode
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Replaces long explanations with shorter, concise sentences. Best for quick reading under stress.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-label="Toggle Simple Language Mode"
            aria-checked={simpleLanguageMode}
            onClick={() => setSimpleLanguageMode(!simpleLanguageMode)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              simpleLanguageMode ? 'bg-brand-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                simpleLanguageMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Theme */}
      <Card variant="default" className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Appearance
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Warm off-white light mode and crafted deep ink dark mode.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between ${
              theme === 'light'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 font-semibold'
                : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <span>Light Theme (Warm Paper)</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between ${
              theme === 'dark'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 font-semibold'
                : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <span>Dark Theme (Deep Ink)</span>
            <Moon className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </Card>
    </div>
  );
};

