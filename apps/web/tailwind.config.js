/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Design tokens
        granite: {
          900: '#0B0C0D',
          800: '#16181A',
          700: '#2A2D30',
          600: '#3E4245',
          500: '#52565A',
          400: '#6A6E72',
          300: '#8B8E92',
          200: '#A8ABAF',
          100: '#C0C2C5',
          50: '#D4D6D8',
        },
        slate: {
          50: '#F6F7F8',
        },
        bronze: {
          500: '#8B6B3F',
        },
        garnet: {
          500: '#9E2B2B',
        },
        panel: {
          dark: 'rgba(255, 255, 255, 0.04)',
          light: 'rgba(0, 0, 0, 0.04)',
        },
        // New theme variables
        bg: 'hsl(var(--bg))',
        panel: 'hsl(var(--panel))',
        border: 'hsl(var(--border))',
        accent: 'hsl(var(--accent))',
        text: 'hsl(var(--text))',
        muted: 'hsl(var(--muted))',
        // Legacy shadcn variables
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
        },
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
      },
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)',
        // Legacy
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        inscription: ['Cinzel', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

