/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
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
        brand: {
          50: '#FDF3F2',
          100: '#FBE4E2',
          200: '#F6CCC8',
          300: '#EEA69F',
          400: '#E2766C',
          500: '#C8372D', // Primary Brand Coral Red
          600: '#B02920',
          700: '#942018',
          800: '#7B1D17',
          900: '#671C17',
          950: '#380B07',
        },
        surface: {
          light: '#FFFFFF',
          'light-subtle': '#F8F6F0',
          'light-ground': '#FAF8F4',
          'light-border': '#E7E2D8',
          dark: '#1A1A1A',
          'dark-subtle': '#242424',
          'dark-ground': '#121212',
          'dark-border': '#333333',
        },
        semantic: {
          success: '#1B8755',
          'success-subtle': '#E8F5EE',
          'success-dark': '#13623D',
          warning: '#B57700',
          'warning-subtle': '#FEF7E6',
          'warning-dark': '#8A5A00',
          info: '#1D70B8',
          'info-subtle': '#EAF3FC',
          'info-dark': '#155288',
        }
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Telugu', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'micro': ['13px', '18px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'], // 16px minimum body
        'lg': ['18px', '26px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['32px', '40px'],
        '4xl': ['48px', '56px'],
        '5xl': ['72px', '80px'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '18px',
        '2xl': '24px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        'elevated': '0 4px 14px rgba(0, 0, 0, 0.07), 0 2px 6px rgba(0, 0, 0, 0.04)',
        'floating': '0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}

