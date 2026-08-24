import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'TicketBook — Production-Grade Ticket Booking Platform',
  description: 'Book seats for movies and concerts with real-time availability and zero double-booking guarantees.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900 antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4">
            TicketBook &copy; {new Date().getFullYear()} — Production Ticket Booking System. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
