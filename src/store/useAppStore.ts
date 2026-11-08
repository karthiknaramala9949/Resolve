import { create } from 'zustand';
import i18n from '@/lib/i18n';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  locale: 'en' | 'hi' | 'te';
  setLocale: (locale: 'en' | 'hi' | 'te') => void;

  simpleLanguageMode: boolean;
  setSimpleLanguageMode: (enabled: boolean) => void;

  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  activeCaseCount: number;
  setActiveCaseCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => {
  // Read initial theme from system or localStorage
  const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('resolve-one-theme')) as 'light' | 'dark' | null;
  const initialTheme = savedTheme || (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  if (typeof document !== 'undefined') {
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  const savedLocale = (typeof window !== 'undefined' && localStorage.getItem('resolve-one-locale')) as 'en' | 'hi' | 'te' | null;
  const initialLocale = savedLocale || 'en';

  const savedSimpleMode = typeof window !== 'undefined' && localStorage.getItem('resolve-one-simple-language') === 'true';

  return {
    theme: initialTheme,
    setTheme: (theme) => {
      localStorage.setItem('resolve-one-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme });
    },
    toggleTheme: () => {
      set((state) => {
        const next = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('resolve-one-theme', next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { theme: next };
      });
    },

    locale: initialLocale,
    setLocale: (locale) => {
      localStorage.setItem('resolve-one-locale', locale);
      i18n.changeLanguage(locale);
      set({ locale });
    },

    simpleLanguageMode: savedSimpleMode,
    setSimpleLanguageMode: (simpleLanguageMode) => {
      localStorage.setItem('resolve-one-simple-language', String(simpleLanguageMode));
      set({ simpleLanguageMode });
    },

    isCommandPaletteOpen: false,
    openCommandPalette: () => set({ isCommandPaletteOpen: true }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

    activeCaseCount: 2,
    setActiveCaseCount: (activeCaseCount) => set({ activeCaseCount }),
  };
});
