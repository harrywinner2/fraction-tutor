/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#070b16',
          800: '#0a0f1f',
          700: '#0e1530',
          600: '#142046',
        },
        cream: '#F5F0E6',
        gold: {
          DEFAULT: '#E3B23C',
          soft: '#EBC76A',
          deep: '#C8932A',
        },
        mint: '#5BD6A0',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(227,178,60,0.55)',
        'glow-mint': '0 0 38px -6px rgba(91,214,160,0.6)',
      },
    },
  },
  plugins: [],
}
