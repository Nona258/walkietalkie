/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class', // Change from 'media' to 'class'
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#237227', // primary brand green used in UI
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        palette: {
          teal: '#99f6e4',
          gold: '#fde68a',
          blue: '#bfdbfe',
          pink: '#fda4af',
          violet: '#c7d2fe',
          mint: '#a7f3d0',
          amber: '#fcd34d',
        },
        ui: {
          'surface-light': '#f8fafb',
          'muted-1': '#f3f4f6',
          'muted-2': '#e5e7eb',
          'text': '#1f2937',
        },
      },
    },
  },
  plugins: [],
};
