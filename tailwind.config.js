/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        // Warm Paper Palette Tokens
        'steel-grey': {
          DEFAULT: 'var(--color-steel-grey)',
          50: '#FAF8F4',
          100: '#F3EFE7',
          200: '#E5DFD5',
          300: '#D2C9BD',
          400: '#B0A495',
          500: '#8A847A',
          600: '#5E554A',
          700: '#433D35',
          800: '#2E2A24',
          900: '#1F1B16',
        },
        charcoal: {
          DEFAULT: '#1F1B16',
          50: '#FAF8F4',
          100: '#F3EFE7',
          200: '#E5DFD5',
          700: '#433D35',
          800: '#2E2A24',
          900: '#1F1B16',
          950: '#14110E',
        },
        coral: {
          DEFAULT: 'var(--color-coral)',
          50: '#FDF5F4',
          100: '#FBE9E7',
          200: '#F6CCC7',
          300: '#EFA39C',
          400: '#E26D64',
          500: '#C8372D', // Refined Seal Terracotta
          600: '#AC2B22',
          700: '#8E221B',
          800: '#701B15',
          900: '#551410',
        },

        // Brand maps directly to Seal Terracotta
        brand: {
          DEFAULT: 'var(--color-coral)',
          50: '#FDF5F4',
          100: '#FBE9E7',
          200: '#F6CCC7',
          300: '#EFA39C',
          400: '#E26D64',
          500: '#C8372D',
          600: '#AC2B22',
          700: '#8E221B',
          800: '#701B15',
          900: '#551410',
          950: '#380B07',
        },

        // Warm paper surface
        surface: {
          DEFAULT: '#FAF8F4',
          light: '#FAF8F4',
          'light-subtle': '#F3EFE7',
          'light-ground': '#FAF8F4',
          'light-border': '#E5DFD5',
          dark: '#FFFFFF',
          'dark-subtle': '#F3EFE7',
          'dark-ground': '#FAF8F4',
          'dark-border': '#E5DFD5',
        },

        // Neutral maps to Warm Slate & Stone
        neutral: {
          50: '#FAF8F4',
          100: '#F3EFE7',
          200: '#E5DFD5',
          300: '#D2C9BD',
          400: '#B0A495',
          500: '#8A847A',
          600: '#5E554A',
          700: '#433D35',
          800: '#2E2A24',
          900: '#1F1B16',
          950: '#14110E',
        },

        semantic: {
          success: '#16A34A',
          'success-subtle': '#EBF7EE',
          warning: '#B57700',
          'warning-subtle': '#FEF7EA',
          error: '#C8372D',
          'error-subtle': '#FDF5F4',
          info: '#1D70B8',
          'info-subtle': '#EDF4FC',
        }
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Instrument Serif', 'Newsreader', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'IBM Plex Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '2xs': '2px',
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(31, 27, 22, 0.04)',
        'elevated': '0 4px 12px rgba(31, 27, 22, 0.06), 0 1px 3px rgba(31, 27, 22, 0.03)',
        'floating': '0 12px 28px rgba(31, 27, 22, 0.08), 0 2px 6px rgba(31, 27, 22, 0.04)',
      }
    },
  },
  plugins: [],
}
