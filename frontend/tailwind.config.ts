import type { Config } from 'tailwindcss';

// Design tokens for a booking-platform-appropriate palette: deep indigo
// primary (trust/premium), amber for HELD/urgency states, emerald for
// AVAILABLE, rose for BOOKED/unavailable — colorblind-safe pairing checked
// against shape/label redundancy in the SeatMap component (never color alone).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef2ff', 500: '#4f46e5', 600: '#4338ca', 700: '#3730a3' },
        seat: {
          available: '#10b981',
          held: '#f59e0b',
          booked: '#e11d48',
          selected: '#4f46e5',
          offered: '#8b5cf6',
        },
      },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
