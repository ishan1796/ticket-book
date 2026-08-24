'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ShoppingBag, Ticket, QrCode, Calendar, MapPin, XCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface BookingItem {
  id: string;
  bookingRef: string;
  status: 'CONFIRMED' | 'CANCELLED';
  totalAmount: string;
  createdAt: string;
  show: {
    startsAt: string;
    event: { title: string; type: string };
    venue: { name: string; city: string };
  };
  items: {
    id: string;
    price: string;
    showSeat: {
      venueSeat: { rowLabel: string; seatNumber: number; category: string };
    };
  }[];
  ticket?: {
    id: string;
    qrToken: string;
  };
}

export default function MyBookingsPage() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQr, setSelectedQr] = useState<{ ref: string; token: string; title: string } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchBookings = () => {
    setLoading(true);
    api.get<{ items: BookingItem[] }>('/bookings/history')
      .then((d) => setBookings(d.items || []))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not fetch your booking history.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  async function handleCancel(bookingId: string) {
    if (!confirm('Are you sure you want to cancel this booking? The seat will be released and offered to waitlisted users.')) return;
    setCancellingId(bookingId);
    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      fetchBookings();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">My Confirmed Tickets</h1>
          <p className="mt-1 text-xs text-slate-400">View your active passes, check-in QR codes, or manage reservations</p>
        </div>
        <Link
          href="/"
          className="glow-btn inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition"
        >
          <Ticket className="h-4 w-4" />
          <span>Book New Show</span>
        </Link>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 animate-pulse rounded-3xl bg-slate-900 border border-white/5" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/10 p-12 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Tickets Reserved Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't reserved any tickets yet. Explore trending concerts, blockbusters, and live shows!
          </p>
          <Link
            href="/"
            className="glow-btn inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            <span>Explore Live Events</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="glass-card overflow-hidden rounded-3xl border border-white/10 transition hover:border-indigo-500/30 shadow-xl"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-white/5 bg-slate-950/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-extrabold text-indigo-300 tracking-wider">Ref: {booking.bookingRef}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider ${
                      booking.status === 'CONFIRMED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    ● {booking.status}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Booked on {new Date(booking.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-white">{booking.show.event.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-indigo-400" />
                        <span>{booking.show.venue.name}, {booking.show.venue.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <span>{new Date(booking.show.startsAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="block text-[11px] text-slate-400 font-semibold">Total Paid</span>
                    <span className="text-2xl font-black text-emerald-400">₹{booking.totalAmount}</span>
                  </div>
                </div>

                {/* Seat badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reserved Seats:</span>
                  {booking.items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-extrabold text-indigo-300"
                    >
                      {item.showSeat.venueSeat.rowLabel}{item.showSeat.venueSeat.seatNumber} ({item.showSeat.venueSeat.category})
                    </span>
                  ))}
                </div>

                {/* Action Toolbar */}
                {booking.status === 'CONFIRMED' && (
                  <div className="flex flex-wrap items-center justify-between border-t border-white/5 pt-4 gap-3">
                    {booking.ticket?.qrToken && (
                      <button
                        onClick={() => setSelectedQr({ ref: booking.bookingRef, token: booking.ticket!.qrToken, title: booking.show.event.title })}
                        className="glow-btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-indigo-600 hover:to-purple-700 transition"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>View Check-in Pass</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>{cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Check-in QR Modal */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm rounded-3xl border border-white/10 p-6 shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-black text-white">{selectedQr.title}</h3>
            <p className="text-xs font-mono font-bold text-indigo-300">Ref: {selectedQr.ref}</p>

            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-indigo-500/40 bg-indigo-950/40 p-4">
              <QrCode className="h-36 w-36 text-indigo-300" />
            </div>

            <p className="text-[11px] font-mono text-slate-400 break-all">{selectedQr.token}</p>
            <button
              onClick={() => setSelectedQr(null)}
              className="w-full rounded-xl bg-white/10 hover:bg-white/20 py-2.5 text-xs font-extrabold text-white transition"
            >
              Close Ticket
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
