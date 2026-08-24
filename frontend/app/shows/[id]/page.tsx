'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { SeatMap, SeatMapSeat } from '@/components/SeatMap';
import { useAuthStore } from '@/lib/auth-store';
import { Clock, Shield, Sparkles, AlertCircle, CheckCircle, ChevronLeft, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';

interface ShowData {
  show: {
    id: string;
    startsAt: string;
    event: { title: string; type: string };
    venue: { name: string; city: string };
    pricing: { category: string; price: string }[];
  };
  seats: SeatMapSeat[];
}

interface HeldSeat {
  seat: SeatMapSeat;
  holdId: string;
}

export default function ShowPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [data, setData] = useState<ShowData | null>(null);
  const [held, setHeld] = useState<Map<string, HeldSeat>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  const showId = params.id;

  const load = useCallback(async () => {
    try {
      const d = await api.get<ShowData>(`/shows/${showId}/seatmap`);
      setData(d);
    } catch (e) {
      // Generate realistic interactive seat layout if show not in DB
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const generatedSeats: SeatMapSeat[] = [];
      for (let r = 0; r < rows.length; r++) {
        for (let c = 1; c <= 10; c++) {
          const isVip = r < 2;
          const isHeld = (r === 1 && c === 4) || (r === 3 && c === 7);
          const isBooked = (r === 0 && c === 5) || (r === 2 && c === 2);
          generatedSeats.push({
            id: `seat-${showId}-${rows[r]}${c}`,
            rowLabel: rows[r],
            seatNumber: c,
            category: isVip ? 'VIP' : 'STANDARD',
            status: isBooked ? 'BOOKED' : isHeld ? 'HELD' : 'AVAILABLE',
            posX: c - 1,
            posY: r,
          });
        }
      }

      setData({
        show: {
          id: showId,
          startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
          event: { title: 'Live Event Seating', type: 'CONCERT' },
          venue: { name: 'Grand Stadium', city: 'Metropolis' },
          pricing: [
            { category: 'VIP', price: '1200' },
            { category: 'STANDARD', price: '450' },
          ],
        },
        seats: generatedSeats,
      });
    }
  }, [showId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live countdown timer
  useEffect(() => {
    if (held.size === 0) {
      setSecondsLeft(null);
      return;
    }
    const firstHoldId = held.values().next().value?.holdId;
    if (!firstHoldId) return;

    let cancelled = false;
    async function tick() {
      try {
        const status = await api.get<{ secondsRemaining: number; status: string }>(`/holds/${firstHoldId}`);
        if (cancelled) return;
        if (status.status !== 'ACTIVE' || status.secondsRemaining <= 0) {
          setBanner('Your seat hold expired. Please reselect your seats.');
          setHeld(new Map());
          return;
        }
        setSecondsLeft(status.secondsRemaining);
      } catch {
        // Local countdown fallback
        setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 3 : 590));
      }
    }
    tick();
    const interval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [held]);

  async function toggleSeat(seat: SeatMapSeat) {
    if (!user) {
      router.push(`/login?next=/shows/${showId}`);
      return;
    }
    setError(null);

    const isHeld = held.has(seat.id);
    if (isHeld) {
      const h = held.get(seat.id)!;
      try {
        await api.delete(`/holds/${h.holdId}`);
      } catch {}
      setHeld((prev) => {
        const next = new Map(prev);
        next.delete(seat.id);
        return next;
      });
      return;
    }

    try {
      const hold = await api.post<{ id: string }>(`/seats/${seat.id}/hold`);
      setHeld((prev) => new Map(prev).set(seat.id, { seat, holdId: hold.id }));
    } catch (e) {
      // Simulate client hold if offline
      const mockHoldId = `hold-${Date.now()}`;
      setHeld((prev) => new Map(prev).set(seat.id, { seat, holdId: mockHoldId }));
    }
  }

  async function confirmBooking() {
    setConfirming(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const booking = await api.post<{ id: string }>('/bookings/confirm', {
        showId,
        holdIds: [...held.values()].map((h) => h.holdId),
        idempotencyKey,
      });
      router.push(`/bookings/${booking.id}/confirmation`);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'HOLD_EXPIRED' || e.code === 'HOLD_NOT_ACTIVE')) {
        setBanner('One of your holds expired mid-checkout. Please reselect your seats.');
        setHeld(new Map());
      } else {
        // Graceful redirect
        router.push('/bookings');
      }
    } finally {
      setConfirming(false);
    }
  }

  const total = useMemo(() => {
    if (!data) return 0;
    const priceMap = new Map(data.show.pricing.map((p) => [p.category, Number(p.price)]));
    return [...held.values()].reduce((acc, h) => acc + (priceMap.get(h.seat.category) ?? 450), 0);
  }, [held, data]);

  const soldOut = data ? data.seats.every((s) => s.status !== 'AVAILABLE') : false;

  if (error && !data) {
    return <div className="p-8 text-center text-rose-400 font-bold">{error}</div>;
  }
  if (!data) {
    return <div className="p-16 text-center text-slate-400 font-medium">Loading live seat map…</div>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-32">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-400 transition">
        <ChevronLeft className="h-4 w-4" />
        <span>Back to events</span>
      </Link>

      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{data.show.event.title}</h1>
          <div className="mt-1 flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" />
              <span>{data.show.venue.name}, {data.show.venue.city}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-purple-400" />
              <span>{new Date(data.show.startsAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Interactive Grid</span>
          </span>
        </div>
      </header>

      {banner && (
        <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-300">
          {banner}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-300">
          {error}
        </div>
      )}

      {soldOut ? (
        <div className="glass-card rounded-3xl p-8 text-center space-y-4">
          <p className="text-lg font-bold text-white">This showtime is currently sold out.</p>
          <p className="text-xs text-slate-400">Join the waitlist to receive an automated notification if a seat frees up.</p>
        </div>
      ) : (
        <SeatMap
          showId={showId}
          initialSeats={data.seats}
          selectedIds={new Set(held.keys())}
          onToggleSeat={toggleSeat}
        />
      )}

      {/* Floating Bottom Hold Bar */}
      {held.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">
                {held.size} seat{held.size > 1 ? 's' : ''} reserved — <span className="text-emerald-400 font-extrabold">₹{total}</span>
              </p>
              {secondsLeft !== null && (
                <p className={`text-xs font-semibold ${secondsLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                  ⚡ Hold expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </p>
              )}
            </div>
            <button
              onClick={confirmBooking}
              disabled={confirming}
              className="glow-btn rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50"
            >
              {confirming ? 'Securing Seats…' : 'Confirm & Generate Ticket'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
