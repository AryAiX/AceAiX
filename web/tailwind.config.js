/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Floodlight surfaces (DARK default) ── */
        page:   '#0C1A2B',   // stadium-dark canvas
        rim:    'rgba(255,255,255,0.12)',   // hairline borders on dark

        /* ── Text ── */
        ink:    '#F4F8FC',   // primary text on dark (cloud)
        slate: {
          DEFAULT: '#7C8DA6',
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },

        /* ── Brand ── */
        azure: {
          DEFAULT: '#2F80ED',
          50:  '#EBF4FF',
          100: '#DBEAFE',
          400: '#60AAFF',
          500: '#2F80ED',
          600: '#1A6AD5',
          700: '#1255B2',
        },
        volt:    '#B8F135',
        emerald: {
          DEFAULT: '#1FB57A',
          50:  '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#1FB57A',
          600: '#159E64',
        },
        amber: {
          DEFAULT: '#F5A623',
          50:  '#FFFBEB',
          400: '#FBBF24',
          500: '#F5A623',
          600: '#D97706',
        },
        coral: {
          DEFAULT: '#EF5350',
          50:  '#FEF2F2',
          400: '#F87171',
          500: '#EF5350',
          600: '#DC2626',
        },

        /* ── Dark / cinematic surfaces ── */
        panel:  '#16273B',
        navy: {
          900: '#060E1E',
          800: '#0A1628',
          700: '#0F1F3D',
          600: '#162952',
          500: '#1C3366',
        },

        /* ── Utility ── */
        muted:  '#7C8DA6',   // de-emphasised text on DARK surfaces
        cloud:  '#F4F8FC',
      },

      fontFamily: {
        display: ['"Clash Display"', '"Inter"', 'system-ui', 'sans-serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        arabic:  ['"IBM Plex Sans Arabic"', '"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', '"Inter"', 'monospace'],
      },

      animation: {
        'fade-in':        'fadeIn 0.4s ease-out',
        'slide-up':       'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow':     'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'marquee':        'marquee 28s linear infinite',
        'story-ring':     'storyRing 2s linear infinite',
        'stamp-in':       'stampIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'charge-ring':    'chargeRing 1.2s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'float':          'float 6s ease-in-out infinite',
        'shimmer':        'shimmer 2s linear infinite',
      },

      keyframes: {
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:      { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        marquee:      { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        storyRing:    { '0%': { strokeDashoffset: '0' }, '100%': { strokeDashoffset: '-251' } },
        stampIn:      { '0%': { opacity: '0', transform: 'scale(2) rotate(-8deg)' }, '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' } },
        chargeRing:   { '0%': { strokeDashoffset: '283' }, '100%': { strokeDashoffset: 'var(--target-offset)' } },
        float:        { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        aurora1:      { '0%,100%': { transform: 'translate(0%,0%) scale(1)' }, '50%': { transform: 'translate(4%,3%) scale(1.08)' } },
        aurora2:      { '0%,100%': { transform: 'translate(0%,0%) scale(1)' }, '50%': { transform: 'translate(-3%,4%) scale(1.06)' } },
      },

      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },

      boxShadow: {
        /* light-mode */
        'card':         '0 1px 3px rgba(12,26,43,0.06), 0 2px 8px rgba(12,26,43,0.04)',
        'card-md':      '0 4px 16px rgba(12,26,43,0.08), 0 1px 4px rgba(12,26,43,0.05)',
        'card-hover':   '0 8px 32px rgba(12,26,43,0.10), 0 2px 8px rgba(12,26,43,0.05)',
        /* dark / cinematic */
        'dark-card':    '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)',
        'dark-hover':   '0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)',
        'glass':        'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.3)',
        /* brand glows */
        'azure-glow':   '0 0 24px rgba(47,128,237,0.25), 0 0 48px rgba(47,128,237,0.10)',
        'azure-sm':     '0 2px 12px rgba(47,128,237,0.25)',
        'volt-glow':    '0 0 20px rgba(184,241,53,0.40), 0 0 40px rgba(184,241,53,0.16)',
        'emerald-glow': '0 0 20px rgba(31,181,122,0.25)',
        'inner-glow':   'inset 0 0 20px rgba(47,128,237,0.06)',
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-ink':        'linear-gradient(135deg, #0C1A2B 0%, #16273B 60%, #0C1A2B 100%)',
        'shimmer-light':   'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
        'shimmer-dark':    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34,1.56,0.64,1)',
        'expo':   'cubic-bezier(0.19,1,0.22,1)',
      },
    },
  },
  plugins: [],
};
