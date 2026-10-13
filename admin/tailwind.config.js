/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#14161A', 2: '#1C1F25', 3: '#262A32' },
        ace: { DEFAULT: '#FF5A1F', soft: '#FFF1EB' },
        azure: { DEFAULT: '#2E7DF6', soft: '#EAF2FF' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
