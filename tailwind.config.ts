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
        'bg-primary':    '#07080A',
        'bg-secondary':  '#0E1014',
        'bg-tertiary':   '#121419',
        'bg-elevated':   '#16191F',
        'bg-hover':      '#1C2027',
        'brand':         '#C9A227',
        'brand-hover':   '#E4C25C',
        'brand-blue':    '#9DB4C0',
        'gold':          '#C9A227',
        'gold-bright':   '#E4C25C',
        'bone':          '#ECE7DB',
        'success':       '#3FB984',
        'danger':        '#E0566B',
        'border-color':  'rgba(201,162,39,0.10)',
      },
      fontFamily: {
        sans:    ['Schibsted Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
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
