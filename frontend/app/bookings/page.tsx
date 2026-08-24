'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ShoppingBag, Ticket, QrCode, Calendar, MapPin, XCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

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
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">View your active tickets, check-in QR codes, or manage cancellations</p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Ticket className="h-4 w-4" />
          <span>Book New Show</span>
        </Link>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-800">No Bookings Yet</h3>
          <p className="mt-1 text-sm text-slate-500">You haven't reserved any tickets yet. Explore upcoming movies & concerts!</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            <span>Explore Featured Events</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-900">Ref: {booking.bookingRef}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    booking.status === 'CONFIRMED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Booked on {new Date(booking.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{booking.show.event.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <MapPin className="h-4 w-4 text-indigo-600" />
                        <span>{booking.show.venue.name}, {booking.show.venue.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        <span>{new Date(booking.show.startsAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="block text-xs text-slate-400 font-medium">Total Price</span>
                    <span className="text-xl font-extrabold text-indigo-900">₹{booking.totalAmount}</span>
                  </div>
                </div>

                {/* Seat badges */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seats:</span>
                  {booking.items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-900"
                    >
                      {item.showSeat.venueSeat.rowLabel}{item.showSeat.venueSeat.seatNumber} ({item.showSeat.venueSeat.category})
                    </span>
                  ))}
                </div>

                {/* Action Toolbar */}
                {booking.status === 'CONFIRMED' && (
                  <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 gap-3">
                    {booking.ticket?.qrToken && (
                      <button
                        onClick={() => setSelectedQr({ ref: booking.bookingRef, token: booking.ticket!.qrToken, title: booking.show.event.title })}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                      >
                        <QrCode className="h-4 w-4 text-indigo-400" />
                        <span>View Check-in QR</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
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

      {/* QR Modal */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-bold text-slate-900">{selectedQr.title}</h3>
            <p className="text-xs font-mono text-slate-500">Ref: {selectedQr.ref}</p>

            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4">
              <QrCode className="h-40 w-40 text-indigo-900" />
            </div>

            <p className="text-[11px] font-mono text-slate-400 break-all">{selectedQr.token}</p>
            <button
              onClick={() => setSelectedQr(null)}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Close Ticket
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
