'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Sparkles, Clock, CheckCircle, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface WaitlistOfferDetail {
  id: string;
  offerToken: string;
  status: string;
  expiresAt: string;
  showSeat: {
    venueSeat: { rowLabel: string; seatNumber: number; category: string };
    show: {
      id: string;
      startsAt: string;
      event: { title: string };
      venue: { name: string; city: string };
    };
  };
}

export default function WaitlistOfferPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [offer, setOffer] = useState<WaitlistOfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptedBookingId, setAcceptedBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!params.token) return;
    setLoading(true);
    // Fetch offer status from API or DB snapshot endpoint
    api.get<WaitlistOfferDetail>(`/waitlist/offers/${params.token}`)
      .then((d) => setOffer(d))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load waitlist offer details.'))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleAccept() {
    if (!user) {
      router.push(`/login?next=/waitlist/offer/${params.token}`);
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      const res = await api.post<{ bookingId: string }>(`/waitlist/offers/${params.token}/accept`);
      setAcceptedBookingId(res.bookingId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to accept offer. It may have expired or been claimed.');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-400">Verifying waitlist offer token...</div>;
  }

  if (acceptedBookingId) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Offer Accepted & Seat Booked!</h1>
          <p className="text-sm text-slate-600">Your seat has been reserved and your booking confirmation generated.</p>
          <button
            onClick={() => router.push(`/bookings/${acceptedBookingId}/confirmation`)}
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
          >
            View Ticket & Confirmation
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 text-white text-center space-y-2">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>EXCLUSIVE WAITLIST OFFER</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">A Seat Just Opened Up For You!</h1>
          <p className="text-xs text-slate-300">A previously held/booked seat has been released and offered to you.</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {offer ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                <h3 className="font-bold text-slate-900">{offer.showSeat.show.event.title}</h3>
                <p className="text-xs text-slate-600">
                  {offer.showSeat.show.venue.name}, {offer.showSeat.show.venue.city}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                    Seat {offer.showSeat.venueSeat.rowLabel}{offer.showSeat.venueSeat.seatNumber} ({offer.showSeat.venueSeat.category})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                <span>This offer expires at {new Date(offer.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Claim it now!</span>
              </div>

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-xs font-extrabold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{accepting ? 'Claiming Seat...' : 'Accept Offer & Confirm Booking'}</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <p className="text-sm text-slate-600">Click below to claim your waitlist offer seat.</p>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-xs font-extrabold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <span>{accepting ? 'Claiming Seat...' : 'Claim Offer & Book Seat'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
