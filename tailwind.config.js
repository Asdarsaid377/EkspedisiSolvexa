/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#dcf0e4',
          200: '#bbe2cd',
          300: '#8acbac',
          400: '#57ad86',
          500: '#348f6a',
          600: '#257254',
          700: '#1e5c44',
          800: '#1a4937',
          900: '#163c2e',
          950: '#0b2219',
        },
        surface: '#f8faf9',
        muted: '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
