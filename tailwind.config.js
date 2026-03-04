/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'rgb(var(--border))',
        input: 'rgb(var(--border))',
        ring: 'rgb(var(--primary))',
        background: 'rgb(var(--bg-app))',
        foreground: 'rgb(var(--text-primary))',
        primary: {
          DEFAULT: 'rgb(var(--primary))',
          foreground: 'rgb(var(--text-on-primary))'
        },
        secondary: {
          DEFAULT: 'rgb(var(--bg-surface-2))',
          foreground: 'rgb(var(--text-secondary))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive, 0 84.2% 60.2%))',
          foreground: 'hsl(var(--destructive-foreground, 0 0% 98%))'
        },
        muted: {
          DEFAULT: 'rgb(var(--bg-surface-2))',
          foreground: 'rgb(var(--text-muted))'
        },
        accent: {
          DEFAULT: 'rgb(var(--bg-surface-2))',
          foreground: 'rgb(var(--text-primary))'
        },
        popover: {
          DEFAULT: 'rgb(var(--bg-surface))',
          foreground: 'rgb(var(--text-primary))'
        },
        card: {
          DEFAULT: 'rgb(var(--bg-surface))',
          foreground: 'rgb(var(--text-primary))'
        },
      },
      borderRadius: {
        lg: 'var(--radius-card)',
        md: 'var(--radius-btn)',
        sm: 'calc(var(--radius-btn) - 2px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' }
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-down': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' }
        },
        'blur-in': {
          from: { filter: 'blur(4px)', opacity: '0' },
          to: { filter: 'blur(0)', opacity: '1' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-down': 'slide-down 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'blur-in': 'blur-in 0.4s ease-out'
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
