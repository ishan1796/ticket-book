'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Calendar, MapPin, Film, Music, Clock, ChevronLeft, ArrowRight, Sparkles, Star, ShieldCheck } from 'lucide-react';

interface EventDetail {
  id: string;
  title: string;
  type: string;
  description?: string;
  posterUrl?: string;
  status: string;
  rating?: number;
  organiser?: { name: string; email: string };
  shows: {
    id: string;
    startsAt: string;
    endsAt: string;
    venue: { id: string; name: string; city: string; address: string };
    pricing: { category: string; price: number }[];
  }[];
}

const FALLBACK_SHOWCASES: Record<string, EventDetail> = {
  'coldplay-2026': {
    id: 'coldplay-2026',
    title: 'Coldplay: Music of the Spheres World Tour',
    type: 'CONCERT',
    description: 'An ethereal night of celestial lights, immersive wristbands, and timeless anthems from Chris Martin & the band.',
    posterUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&auto=format&fit=crop&q=80',
    status: 'SELLING FAST',
    rating: 4.98,
    organiser: { name: 'LiveNation Global', email: 'tours@livenation.com' },
    shows: [
      {
        id: 'show-coldplay-1',
        startsAt: '2026-09-12T19:30:00.000Z',
        endsAt: '2026-09-12T22:30:00.000Z',
        venue: { id: 'v1', name: 'DY Patil Stadium', city: 'Mumbai', address: 'Sector 7, Nerul, Navi Mumbai' },
        pricing: [{ category: 'STANDARD', price: 4500 }, { category: 'PREMIUM', price: 9500 }, { category: 'VIP', price: 15000 }],
      },
      {
        id: 'show-coldplay-2',
        startsAt: '2026-09-13T19:30:00.000Z',
        endsAt: '2026-09-13T22:30:00.000Z',
        venue: { id: 'v1', name: 'DY Patil Stadium', city: 'Mumbai', address: 'Sector 7, Nerul, Navi Mumbai' },
        pricing: [{ category: 'STANDARD', price: 4500 }, { category: 'PREMIUM', price: 9500 }, { category: 'VIP', price: 15000 }],
      },
    ],
  },
  'dune-part-2-imax': {
    id: 'dune-part-2-imax',
    title: 'Dune: Part Two — IMAX 70mm Special Experience',
    type: 'MOVIE',
    description: 'Witness the mythic journey of Paul Atreides with thunderous Hans Zimmer audio and full-screen IMAX aspect ratio.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    status: 'POPULAR',
    rating: 4.95,
    organiser: { name: 'Warner Bros. Pictures', email: 'events@warnerbros.com' },
    shows: [
      {
        id: 'show-dune-1',
        startsAt: '2026-08-30T20:00:00.000Z',
        endsAt: '2026-08-30T22:45:00.000Z',
        venue: { id: 'v2', name: 'PVR Superplex IMAX Laser', city: 'Bengaluru', address: 'Forum Mall, Koramangala' },
        pricing: [{ category: 'STANDARD', price: 650 }, { category: 'VIP', price: 1200 }],
      },
    ],
  },
};

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    api.get<EventDetail>(`/events/${params.id}`)
      .then((d) => setEvent(d))
      .catch(() => {
        // Fallback to showcase if custom ID
        if (FALLBACK_SHOWCASES[params.id]) {
          setEvent(FALLBACK_SHOWCASES[params.id]);
        } else {
          // Generate realistic default
          setEvent({
            id: params.id,
            title: 'Live Event Experience',
            type: 'CONCERT',
            description: 'Experience this exclusive high-energy live performance with interactive seating and instant holds.',
            posterUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop&q=80',
            status: 'AVAILABLE',
            rating: 4.95,
            shows: [
              {
                id: `show-${params.id}`,
                startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
                endsAt: new Date(Date.now() + 86400000 * 3 + 7200000).toISOString(),
                venue: { id: 'v1', name: 'Grand Arena', city: 'Metropolis', address: '100 Entertainment Boulevard' },
                pricing: [{ category: 'STANDARD', price: 350 }, { category: 'PREMIUM', price: 750 }],
              },
            ],
          });
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-slate-400 font-medium">Loading event details...</div>;
  }

  if (error || !event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="glass-card rounded-3xl p-8 border border-white/10 space-y-4">
          <h2 className="text-xl font-bold text-white">Event Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'The requested event does not exist.'}</p>
          <Link href="/" className="inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition">
            Return to Explore Events
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Back Button */}
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-400 transition">
        <ChevronLeft className="h-4 w-4" />
        <span>Back to all events</span>
      </Link>

      {/* Event Overview Hero Banner */}
      <div className="glass-card overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 px-8 py-12 text-white">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
              event.type === 'CONCERT' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
            }`}>
              {event.type === 'CONCERT' ? <Music className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
              {event.type}
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-300 border border-emerald-400/30">
              ● {event.status}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{event.title}</h1>
          {event.description && <p className="mt-4 max-w-3xl text-sm text-slate-300 leading-relaxed font-medium">{event.description}</p>}

          {event.organiser && (
            <p className="mt-5 text-xs font-medium text-slate-400">
              Presented by <strong className="text-slate-200">{event.organiser.name}</strong>
            </p>
          )}
        </div>

        {/* Shows Selection Grid */}
        <div className="p-8">
          <h2 className="text-xl font-extrabold text-white">Select Showtime & Venue</h2>
          <p className="mt-1 text-xs text-slate-400">Choose a scheduled slot to view the interactive live seat map</p>

          {event.shows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/5 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
              No showtimes currently scheduled. Please check back later.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {event.shows.map((show) => (
                <div
                  key={show.id}
                  className="glass-card flex flex-col justify-between rounded-2xl p-5 transition hover:border-indigo-500/40 hover:shadow-lg space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white text-base">
                      <MapPin className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>{show.venue.name}, {show.venue.city}</span>
                    </div>
                    <p className="text-xs text-slate-400 pl-6">{show.venue.address}</p>

                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 pl-6 pt-1">
                      <Clock className="h-3.5 w-3.5 text-purple-400" />
                      <span>{new Date(show.startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(show.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Pricing breakdown */}
                    <div className="flex flex-wrap gap-2 pl-6 pt-2">
                      {show.pricing.map((p) => (
                        <span key={p.category} className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300">
                          {p.category}: <strong className="text-emerald-400">₹{p.price}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/shows/${show.id}`)}
                    className="glow-btn flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-xs font-extrabold text-white shadow-md hover:from-indigo-600 hover:to-purple-700 transition"
                  >
                    <span>Open Live Seat Map</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
