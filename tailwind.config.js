/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          50:  'var(--surface-50)',
          100: 'var(--surface-100)',
          200: 'var(--surface-200)',
          300: 'var(--surface-300)',
          800: 'var(--surface-800)',
          900: 'var(--surface-900)',
          950: 'var(--surface-950)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
          light:   'var(--accent-light)',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
        modal: '0 20px 60px rgba(0,0,0,0.3)',
      },
      animation: {
        'slide-in':    'slideIn 0.2s ease-out',
        'fade-in':     'fadeIn 0.15s ease-out',
        'scale-in':    'scaleIn 0.15s ease-out',
        'bounce-soft': 'bounceSoft 0.4s ease-out',
      },
      keyframes: {
        slideIn:    { from: { transform: 'translateY(-8px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:     { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn:    { from: { transform: 'scale(0.95)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        bounceSoft: { '0%': { transform: 'scale(0.95)' }, '60%': { transform: 'scale(1.02)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
