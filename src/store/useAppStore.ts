import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  simpleLanguageMode: boolean;
  setSimpleLanguageMode: (enabled: boolean) => void;

  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  activeCaseCount: number;
  setActiveCaseCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => {
  // Always default to light theme for clean white palette
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
  }

  const savedSimpleMode = typeof window !== 'undefined' && localStorage.getItem('resolve-one-simple-language') === 'true';

  return {
    theme: 'light',
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

    simpleLanguageMode: savedSimpleMode,
    setSimpleLanguageMode: (simpleLanguageMode) => {
      localStorage.setItem('resolve-one-simple-language', String(simpleLanguageMode));
      set({ simpleLanguageMode });
    },

    isCommandPaletteOpen: false,
    openCommandPalette: () => set({ isCommandPaletteOpen: true }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

    activeCaseCount: 0,
    setActiveCaseCount: (activeCaseCount) => set({ activeCaseCount }),
  };
});
