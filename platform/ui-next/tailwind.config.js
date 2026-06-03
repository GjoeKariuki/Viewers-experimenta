/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('../ui/tailwind.config.js')],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    fontFamily: {
      inter: ['Inter', 'sans-serif'],
    },
    fontSize: {
      xxs: '0.625rem', // 10px
      xs: '0.6875rem', // 11px
      sm: '0.75rem', // 12px
      base: '0.8125rem', // 13px
      lg: '0.875rem', // 14px
      xl: '1rem', // 16px
      // 2xl and above will be updated in an upcoming version
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '4rem',
      // '2xl': '1.125rem', // 18px
      // '3xl': '1.375rem', // 22px
      // '4xl': '1.5rem', // 24px
      // '5xl': '1.875rem', // 30px
    },
    fontWeight: {
      hairline: '100',
      thin: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    extend: {
      colors: {
        highlight: 'hsl(var(--highlight))',
        neutral: 'hsl(var(--neutral))',
        'neutral-light': 'hsl(var(--neutral-light))',
        'neutral-dark': 'hsl(var(--neutral-dark))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: 'hsl(var(--highlight))',
          main: 'hsl(var(--primary))',
          dark: 'hsl(var(--background))',
          active: 'hsl(var(--primary))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          light: 'hsl(var(--highlight))',
          main: 'hsl(var(--secondary))',
          dark: 'hsl(var(--background))',
          active: 'hsl(var(--secondary))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        inputfield: {
          main: 'hsl(var(--input))',
          disabled: 'hsl(var(--accent))',
          focus: 'hsl(var(--highlight))',
          placeholder: 'hsl(var(--neutral))',
        },
        customblue: {
          10: 'hsl(var(--background))',
          20: 'hsl(var(--background))',
          30: 'hsl(var(--accent))',
          40: 'hsl(var(--primary))',
          50: 'hsl(var(--secondary))',
          80: 'hsl(var(--secondary))',
          100: 'hsl(var(--highlight))',
          200: 'hsl(var(--highlight))',
          300: 'hsl(var(--accent))',
          400: 'hsl(var(--neutral))',
        },
        common: {
          bright: '#ffffff',
          light: 'hsl(var(--neutral))',
          main: '#ffffff',
          dark: 'hsl(var(--neutral-dark))',
          active: 'hsl(var(--primary))',
        },
        'aqua-pale': 'hsl(var(--highlight))',
        'customgrey-70': 'hsl(var(--muted-foreground))',
        bkg: {
          low: 'hsl(var(--background))',
          med: 'hsl(var(--muted))',
          full: 'hsl(var(--accent))',
        },
        info: {
          primary: 'hsl(var(--foreground))',
          secondary: 'hsl(var(--highlight))',
        },
        actions: {
          primary: 'hsl(var(--primary))',
          highlight: 'hsl(var(--highlight))',
          hover: 'hsla(var(--primary) / 0.2)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
