/** @type {import('tailwindcss').Config} */
export default {
  darkMode: false,
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
        // Direct Core Palette Tokens
        'steel-grey': {
          DEFAULT: 'var(--color-steel-grey)',
          50: '#F6F8F9',
          100: '#EDF0F2',
          200: '#DCE1E5',
          300: '#BAC4CC',
          400: '#929DA7',
          500: '#717D88',
          600: '#57626C',
          700: '#424B53',
          800: '#2E343A',
          900: '#1D2226',
        },
        charcoal: {
          DEFAULT: 'var(--color-charcoal)',
          50: '#F3F4F4',
          100: '#E3E4E6',
          200: '#C2C5C9',
          700: '#2C2F34',
          800: '#1F2226',
          900: '#17191C',
          950: '#0E0F11',
        },
        coral: {
          DEFAULT: 'var(--color-coral)',
          50: '#FFF5F4',
          100: '#FFEBE8',
          200: '#FFD4CE',
          300: '#FFAFA3',
          400: '#FF7D6B',
          500: '#FF4B32',
          600: '#E63D25',
          700: '#BF2B15',
          800: '#992211',
          900: '#7A1D0E',
        },

        // Brand maps directly to Vibrant Coral Orange
        brand: {
          DEFAULT: 'var(--color-coral)',
          50: '#FFF5F4',
          100: '#FFEBE8',
          200: '#FFD4CE',
          300: '#FFAFA3',
          400: '#FF7D6B',
          500: '#FF4B32', // Vibrant Coral Orange
          600: '#E63D25',
          700: '#BF2B15',
          800: '#992211',
          900: '#7A1D0E',
          950: '#3D0B04',
        },

        // Surface maps to clean white backgrounds & Cool Steel Grey borders
        surface: {
          DEFAULT: '#FFFFFF',
          light: '#FFFFFF',
          'light-subtle': '#F6F8F9',
          'light-ground': '#FFFFFF',
          'light-border': '#DCE1E5',
          dark: '#FFFFFF', // Prevent black card blocks
          'dark-subtle': '#F6F8F9',
          'dark-ground': '#FFFFFF',
          'dark-border': '#DCE1E5',
        },

        // Neutral maps to Midnight Charcoal & Cool Steel Grey
        neutral: {
          50: '#F6F8F9',
          100: '#EDF0F2',
          200: '#DCE1E5',
          300: '#BAC4CC',
          400: '#929DA7', // Cool Steel Grey
          500: '#57626C', // High-contrast secondary text (WCAG AA)
          600: '#424B53', // Deep steel grey (> 7:1)
          700: '#2E343A',
          800: '#1F2226',
          900: '#17191C', // Midnight Charcoal
          950: '#0E0F11',
        },

        semantic: {
          success: '#1B8755',
          'success-subtle': '#E8F5EE',
          warning: '#B57700',
          'warning-subtle': '#FEF7EA',
          error: '#D32F2F',
          'error-subtle': '#FDF2F2',
          info: '#1D70B8',
          'info-subtle': '#EDF4FC',
        }
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        '2xs': '2px',
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(23, 25, 28, 0.05), 0 1px 2px rgba(23, 25, 28, 0.03)',
        'elevated': '0 4px 14px rgba(23, 25, 28, 0.08), 0 2px 6px rgba(23, 25, 28, 0.04)',
        'floating': '0 12px 32px rgba(23, 25, 28, 0.14), 0 4px 12px rgba(23, 25, 28, 0.06)',
      }
    },
  },
  plugins: [],
}
