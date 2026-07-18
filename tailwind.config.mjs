/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,meta,ts,tsx,vue}', './public/js/**/*.js'],
  safelist: [
    'bg-red-100', 'text-red-800', 'border-red-300', 'bg-red-600',
    'bg-amber-100', 'text-amber-800', 'border-amber-300', 'bg-amber-600',
    'bg-emerald-100', 'text-emerald-800', 'border-emerald-300', 'bg-emerald-600',
    'bg-sky-100', 'text-sky-800', 'border-sky-300', 'bg-sky-600',
    'bg-slate-200', 'text-slate-800', 'border-slate-300', 'bg-slate-600'
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#EEF4FC',
          100: '#DCE6F1',
          200: '#B9CDE3',
          500: '#3A74C4',
          600: '#0F3A8C',
          700: '#0B2A6B',
          800: '#081F52',
          900: '#051438'
        },
        brand: {
          blue: '#0F3A8C',
          red: '#EF4444',
          teal: '#0D9488',
          orange: '#F59E0B',
          bg: '#EDF4FD',
          card: '#FFFFFF',
          textMain: '#0F172A',
          textSub: '#64748B',
          border: '#DCE6F1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Urbanist', 'sans-serif']
      }
    }
  },
  plugins: []
};
