'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { SeatMap, SeatMapSeat } from '@/components/SeatMap';
import { useAuthStore } from '@/lib/auth-store';

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
  const [held, setHeld] = useState<Map<string, HeldSeat>>(new Map()); // seatId -> hold info
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
      setError(e instanceof ApiError ? e.message : 'Could not load this show. Please try again.');
    }
  }, [showId]);

  useEffect(() => {
    load();
  }, [load]);

  // Server-truth countdown: we poll the earliest active hold's remaining
  // seconds rather than trusting a client-side timer alone, so a slow tab,
  // clock drift, or a laptop going to sleep can't make the UI lie about how
  // much time is actually left before the backend releases the seat.
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
        /* transient — next tick will retry */
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
      } catch {
        /* releasing is best-effort; sweep will clean it up regardless */
      }
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
      if (e instanceof ApiError && e.code === 'SEAT_UNAVAILABLE') {
        setError(`Seat ${seat.rowLabel}${seat.seatNumber} was just taken by someone else. Please pick another seat.`);
        load(); // resync in case our local view was stale
      } else {
        setError(e instanceof ApiError ? e.message : 'Could not hold that seat. Please try again.');
      }
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
        setError(e instanceof ApiError ? e.message : 'Checkout failed. Please try again.');
      }
    } finally {
      setConfirming(false);
    }
  }

  const total = useMemo(() => {
    if (!data) return 0;
    const priceMap = new Map(data.show.pricing.map((p) => [p.category, Number(p.price)]));
    return [...held.values()].reduce((acc, h) => acc + (priceMap.get(h.seat.category) ?? 0), 0);
  }, [held, data]);

  const soldOut = data ? data.seats.every((s) => s.status !== 'AVAILABLE') : false;

  if (error && !data) {
    return <div className="p-8 text-center text-rose-600">{error}</div>;
  }
  if (!data) {
    return <div className="p-8 text-center text-slate-400">Loading seat map…</div>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{data.show.event.title}</h1>
        <p className="text-sm text-slate-500">
          {data.show.venue.name}, {data.show.venue.city} — {new Date(data.show.startsAt).toLocaleString()}
        </p>
      </header>

      {banner && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{banner}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {soldOut ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="mb-4 text-lg font-semibold">This show is sold out.</p>
          <WaitlistJoin showId={showId} pricing={data.show.pricing} />
        </div>
      ) : (
        <SeatMap showId={showId} initialSeats={data.seats} selectedIds={new Set(held.keys())} onToggleSeat={toggleSeat} />
      )}

      {held.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {held.size} seat{held.size > 1 ? 's' : ''} selected — ₹{total}
              </p>
              {secondsLeft !== null && (
                <p className={`text-xs font-medium ${secondsLeft < 60 ? 'text-rose-600' : 'text-slate-400'}`}>
                  Hold expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </p>
              )}
            </div>
            <button
              onClick={confirmBooking}
              disabled={confirming}
              className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {confirming ? 'Confirming…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function WaitlistJoin({ showId, pricing }: { showId: string; pricing: { category: string; price: string }[] }) {
  const [joined, setJoined] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function join(category: string) {
    try {
      await api.post(`/shows/${showId}/waitlist`, { category });
      setJoined(category);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not join the waitlist.');
    }
  }

  if (joined) {
    return <p className="text-emerald-700">You're on the waitlist for {joined}. We'll email you the moment a seat opens up.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">Join the waitlist for a category — you'll get a time-limited offer if a seat frees up.</p>
      <div className="flex justify-center gap-2">
        {pricing.map((p) => (
          <button
            key={p.category}
            onClick={() => join(p.category)}
            className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            Waitlist — {p.category} (₹{p.price})
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
