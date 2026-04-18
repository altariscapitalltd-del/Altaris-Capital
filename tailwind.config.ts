import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary':    '#0B0E11',
        'bg-secondary':  '#151A21',
        'bg-tertiary':   '#1E2329',
        'bg-elevated':   '#2B3139',
        'bg-hover':      '#323A45',
        'brand':         '#F0B90B',
        'brand-hover':   '#F8D33A',
        'brand-blue':    '#1E80FF',
        'success':       '#0ECB81',
        'danger':        '#F6465D',
        'border-color':  '#2B3139',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-live': 'pulseLive 2s ease-in-out infinite',
        'banner':     'bannerSlide 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:    { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseLive:  { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        bannerSlide:{ from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
