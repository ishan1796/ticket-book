import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'TicketBook — Live Concerts, Movies & VIP Experiences',
  description: 'Book seats for trending concerts, movies, and festivals with real-time seat availability, instant holds, and zero double-booking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="flex min-h-full flex-col bg-[#07090e] font-sans text-slate-100 antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-white/5 bg-[#05070a] py-8 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 font-medium">Live Seat Engine Online • Sub-10ms Atomic Locks</span>
            </div>
            <div className="text-slate-500">
              TicketBook &copy; {new Date().getFullYear()} — Production Ticket Platform.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
