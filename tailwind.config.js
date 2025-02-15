/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        ocean: {
          50: '#f4f9fb',
          100: '#e2f1f8',
          200: '#bce3f0',
          300: '#86cce3',
          400: '#48b0d0',
          500: '#2596be',
          600: '#1b77a0',
          700: '#1a6082',
          800: '#1b4f6b',
          900: '#1b435b',
          950: '#0c2635',
        },
      },
      backgroundImage: {
        'gradient-ocean': 'linear-gradient(to bottom, rgb(12, 74, 110), rgb(8, 47, 73))',
        'gradient-surface': 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
      },
      boxShadow: {
        'glow': '0 0 15px -3px rgba(147, 197, 253, 0.1)',
      }
    },
  },
  plugins: [],
};