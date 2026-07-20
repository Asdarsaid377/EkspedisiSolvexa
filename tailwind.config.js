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
        // Design tokens khusus /booking/* (Google Stitch redesign, 20 Jul
        // 2026) — SENGAJA dinamespace di bawah `booking-*` supaya tidak
        // bentrok dengan `surface`/`muted` global di atas (nilai beda,
        // dipakai dashboard staf) atau nama generik Tailwind lain
        // (`border` misalnya adalah key khusus yang mengubah default
        // warna utility `border` ke seluruh app kalau ditaruh top-level —
        // jangan pernah taruh token booking di root `colors`, selalu di
        // dalam namespace `booking`).
        booking: {
          primary: '#F97316',
          tint: '#FFF1E6',
          surface: '#FAF7F2',
          border: '#F0E9E0',
          text: '#1F2937',
          muted: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        // Plus Jakarta Sans dimuat via next/font/google HANYA di
        // app/booking/layout.tsx (CSS variable --font-booking) — TIDAK
        // menyentuh font global `sans` di atas yang dipakai dashboard/tugas.
        booking: ['var(--font-booking)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        // Soft shadow kartu dari export Stitch: 0px 4px 12px rgba(31,41,55,0.04)
        booking: '0px 4px 12px rgba(31,41,55,0.04)',
      },
    },
  },
  plugins: [],
}
