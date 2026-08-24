'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { CheckCircle2, Ticket as TicketIcon, Calendar, MapPin, QrCode, ArrowLeft, Download, ShoppingBag } from 'lucide-react';

interface BookingConfirmation {
  id: string;
  bookingRef: string;
  status: string;
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

export default function BookingConfirmationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    api.get<BookingConfirmation>(`/bookings/${params.id}`)
      .then((d) => setBooking(d))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not fetch booking confirmation details.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-400">Loading booking confirmation...</div>;
  }

  if (error || !booking) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-800">
          <h2 className="text-xl font-bold">Booking Not Found</h2>
          <p className="mt-2 text-sm text-rose-600">{error}</p>
          <Link href="/bookings" className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white">
            Go to My Bookings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Success Badge Banner */}
      <div className="mb-8 text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Booking Confirmed!</h1>
        <p className="text-sm text-slate-500">Your seats are secured. An email with ticket details and QR code has been dispatched.</p>
      </div>

      {/* Ticket Pass Container */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">BOOKING REFERENCE</span>
            <p className="text-2xl font-mono font-bold tracking-wider">{booking.bookingRef}</p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
              {booking.status}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">{booking.show.event.title}</h2>
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
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

          {/* Seat breakdown */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Reserved Seats</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {booking.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="block text-xs font-medium text-slate-400">{item.showSeat.venueSeat.category}</span>
                  <span className="block text-lg font-extrabold text-indigo-900">
                    {item.showSeat.venueSeat.rowLabel}{item.showSeat.venueSeat.seatNumber}
                  </span>
                  <span className="block text-xs font-semibold text-slate-600">₹{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QR Ticket Code Box */}
          <div className="border-t border-slate-100 pt-6 text-center space-y-3">
            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4">
              <QrCode className="h-28 w-28 text-indigo-900" />
            </div>
            <p className="text-xs font-mono text-slate-400 break-all px-4">
              QR Token: {booking.ticket?.qrToken || `QR-${booking.id}`}
            </p>
            <p className="text-xs text-slate-500 font-medium">Present this QR code at the venue gate for instant check-in verification.</p>
          </div>

          {/* Total Paid Summary */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-slate-900">
            <span className="text-sm font-semibold">Total Paid Amount:</span>
            <span className="text-2xl font-extrabold text-indigo-600">₹{booking.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Link
          href="/bookings"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>View All My Bookings</span>
        </Link>
        <Link
          href="/"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
        >
          <TicketIcon className="h-4 w-4" />
          <span>Book Another Show</span>
        </Link>
      </div>
    </main>
  );
}
