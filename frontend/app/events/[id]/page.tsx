'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Calendar, MapPin, Film, Music, Clock, ChevronLeft, ArrowRight, Sparkles } from 'lucide-react';

interface EventDetail {
  id: string;
  title: string;
  type: string;
  description?: string;
  posterUrl?: string;
  status: string;
  organiser?: { name: string; email: string };
  shows: {
    id: string;
    startsAt: string;
    endsAt: string;
    venue: { id: string; name: string; city: string; address: string };
    pricing: { category: string; price: number }[];
  }[];
}

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
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load event details.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-slate-400">Loading event details...</div>;
  }

  if (error || !event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-800">
          <h2 className="text-xl font-bold">Event Not Found</h2>
          <p className="mt-2 text-sm text-rose-600">{error || 'The requested event does not exist.'}</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white">
            Return to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Back Button */}
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition">
        <ChevronLeft className="h-4 w-4" />
        Back to all events
      </Link>

      {/* Event Overview Hero */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-8 py-10 text-white">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              event.type === 'CONCERT' ? 'bg-purple-500/20 text-purple-300' : 'bg-indigo-500/20 text-indigo-300'
            }`}>
              {event.type === 'CONCERT' ? <Music className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
              {event.type}
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              {event.status}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{event.title}</h1>
          {event.description && <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">{event.description}</p>}

          {event.organiser && (
            <p className="mt-4 text-xs font-medium text-slate-400">
              Organised by <span className="text-slate-200 font-semibold">{event.organiser.name}</span>
            </p>
          )}
        </div>

        {/* Shows Selection List */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-900">Select Show Date & Time</h2>
          <p className="mt-1 text-sm text-slate-500">Choose an upcoming showtime to open the interactive seat map</p>

          {event.shows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No showtimes are currently scheduled for this event. Please check back later.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {event.shows.map((show) => (
                <div
                  key={show.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                      <span>{show.venue.name}, {show.venue.city}</span>
                    </div>
                    <p className="text-xs text-slate-500 pl-6">{show.venue.address}</p>

                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700 pl-6 pt-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{new Date(show.startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(show.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Pricing breakdown */}
                    <div className="flex flex-wrap gap-1.5 pl-6 pt-2">
                      {show.pricing.map((p) => (
                        <span key={p.category} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {p.category}: ₹{p.price}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/shows/${show.id}`)}
                    className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
                  >
                    <span>Select Seats</span>
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
