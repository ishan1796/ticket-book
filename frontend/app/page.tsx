'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Search, Film, Music, Sparkles, MapPin, Calendar, ArrowRight } from 'lucide-react';

interface EventSummary {
  id: string;
  title: string;
  type: string;
  description?: string;
  posterUrl?: string;
  status: string;
  shows: { id: string; startsAt: string; venue: { name: string; city: string } }[];
}

export default function LandingPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  useEffect(() => {
    setLoading(true);
    let url = '/events';
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (selectedType !== 'ALL') params.append('type', selectedType);
    if (params.toString()) url += `?${params.toString()}`;

    api.get<{ items: EventSummary[] }>(url)
      .then((d) => setEvents(d.items || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [searchQuery, selectedType]);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 px-4 py-20 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-50" />
        <div className="relative mx-auto max-w-5xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Instant Hold & Real-time Live Seats</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Book Live Tickets for <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Movies & Concerts</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-300 sm:text-lg">
            Experience zero double-booking, atomic seat holds, and real-time live availability across top venues.
          </p>

          {/* Search & Filter Bar */}
          <div className="mx-auto max-w-3xl pt-4">
            <div className="flex flex-col sm:flex-row gap-3 rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-white/15 shadow-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies, concerts, artists, venues..."
                  className="w-full rounded-xl bg-white/90 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Type Category Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto px-1">
                {['ALL', 'MOVIE', 'CONCERT'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                      selectedType === type
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    {type === 'ALL' ? 'All Events' : type === 'MOVIE' ? 'Movies' : 'Concerts'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Showcase Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Featured Events & Shows</h2>
            <p className="text-sm text-slate-500">Pick your favorite event and select live seats instantly</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{events.length} events available</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <p className="text-lg font-semibold text-slate-700">No events found matching your filter.</p>
            <p className="mt-1 text-sm text-slate-400">Try searching for another term or reset your category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-200"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                      event.type === 'CONCERT' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {event.type === 'CONCERT' ? <Music className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                      {event.type}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {event.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {event.title}
                  </h3>
                  {event.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{event.description}</p>
                  )}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  {event.shows && event.shows.length > 0 ? (
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{event.shows[0].venue.name}, {event.shows[0].venue.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Next Show: {new Date(event.shows[0].startsAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Shows coming soon</p>
                  )}

                  <div className="mt-4 flex items-center justify-between font-semibold text-xs text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>Book Seats Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
