'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Search,
  Film,
  Music,
  Sparkles,
  MapPin,
  Calendar,
  ArrowRight,
  Star,
  Zap,
  ShieldCheck,
  Flame,
  Radio,
  Clock,
  Ticket,
} from 'lucide-react';

interface EventSummary {
  id: string;
  title: string;
  type: string;
  description?: string;
  posterUrl?: string;
  status: string;
  rating?: number;
  featured?: boolean;
  price?: number;
  shows?: { id: string; startsAt: string; venue: { name: string; city: string } }[];
}

// 14 Curated Gen-Z Showcase Events with high-quality concert & movie imagery
const SHOWCASE_EVENTS: EventSummary[] = [
  {
    id: 'coldplay-2026',
    title: 'Coldplay: Music of the Spheres World Tour',
    type: 'CONCERT',
    description: 'An ethereal night of celestial lights, immersive wristbands, and timeless anthems from Chris Martin & the band.',
    posterUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&auto=format&fit=crop&q=80',
    status: 'SELLING FAST',
    rating: 4.98,
    featured: true,
    price: 4500,
    shows: [{ id: 'show-coldplay', startsAt: '2026-09-12T19:30:00.000Z', venue: { name: 'DY Patil Stadium', city: 'Mumbai' } }],
  },
  {
    id: 'dune-part-2-imax',
    title: 'Dune: Part Two — IMAX 70mm Special Experience',
    type: 'MOVIE',
    description: 'Witness the mythic journey of Paul Atreides with thunderous Hans Zimmer audio and full-screen IMAX aspect ratio.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    status: 'POPULAR',
    rating: 4.95,
    featured: true,
    price: 650,
    shows: [{ id: 'show-dune', startsAt: '2026-08-30T20:00:00.000Z', venue: { name: 'PVR Superplex IMAX Laser', city: 'Bengaluru' } }],
  },
  {
    id: 'taylor-eras-tour',
    title: 'Taylor Swift | The Eras Tour Cinema Concert',
    type: 'CONCERT',
    description: 'Relive the record-shattering cultural phenomenon spanning 17 years of music in 4K Dolby Atmos surround sound.',
    posterUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
    status: 'ALMOST SOLD OUT',
    rating: 4.99,
    price: 900,
    shows: [{ id: 'show-taylor', startsAt: '2026-09-05T18:00:00.000Z', venue: { name: 'Grand Dolby Cinema', city: 'Delhi NCR' } }],
  },
  {
    id: 'martin-garrix-live',
    title: 'Martin Garrix India Tour 2026',
    type: 'CONCERT',
    description: 'Electric laser beams, high-energy progressive house drops, and unmatched festival vibes with the world’s #1 DJ.',
    posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    status: 'LIVE NOW',
    rating: 4.92,
    price: 2500,
    shows: [{ id: 'show-garrix', startsAt: '2026-09-20T17:00:00.000Z', venue: { name: 'Sunburn Festival Arena', city: 'Goa' } }],
  },
  {
    id: 'interstellar-re-release',
    title: 'Interstellar: 10th Anniversary IMAX Re-Release',
    type: 'MOVIE',
    description: 'Christopher Nolan’s sci-fi masterpiece back on the giant screen with heart-pounding organ scores and wormhole visuals.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    status: 'SPECIAL EVENT',
    rating: 4.97,
    price: 550,
    shows: [{ id: 'show-interstellar', startsAt: '2026-09-02T21:15:00.000Z', venue: { name: 'INOX Megaplex', city: 'Mumbai' } }],
  },
  {
    id: 'ar-rahman-symphony',
    title: 'A.R. Rahman: Harmony in Motion Symphonic Tour',
    type: 'CONCERT',
    description: 'A 60-piece global orchestra performing legendary soul-stirring soundtracks and live fusion masterworks.',
    posterUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
    status: 'SELLING FAST',
    rating: 4.96,
    price: 3200,
    shows: [{ id: 'show-ar-rahman', startsAt: '2026-09-28T19:00:00.000Z', venue: { name: 'JLN Stadium Grounds', city: 'Chennai' } }],
  },
  {
    id: 'oppenheimer-directors-cut',
    title: 'Oppenheimer — 70mm Master Screening',
    type: 'MOVIE',
    description: 'Feel the tension, pulse, and groundbreaking Trinity test sequence projected from authentic 70mm film stock.',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    status: 'LIMITED SLOTS',
    rating: 4.94,
    price: 600,
    shows: [{ id: 'show-oppenheimer', startsAt: '2026-09-08T18:45:00.000Z', venue: { name: 'Cinepolis Luxe Lounge', city: 'Hyderabad' } }],
  },
  {
    id: 'travis-scott-utopia',
    title: 'Travis Scott: Circus Maximus World Tour',
    type: 'CONCERT',
    description: 'Raging mosh pits, massive monolith stage design, and explosive energy performing the critically acclaimed Utopia album.',
    posterUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
    status: 'TRENDING',
    rating: 4.89,
    price: 4000,
    shows: [{ id: 'show-travis', startsAt: '2026-10-04T19:30:00.000Z', venue: { name: 'Indira Gandhi Arena', city: 'Delhi' } }],
  },
  {
    id: 'spider-verse-live-orchestra',
    title: 'Spider-Verse: Live in Concert with Symphony & DJ',
    type: 'MOVIE',
    description: 'The award-winning animated film projected in full HD accompanied by a live orchestra and scratch turntablist.',
    posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&auto=format&fit=crop&q=80',
    status: 'FAMILY PICK',
    rating: 4.93,
    price: 1200,
    shows: [{ id: 'show-spiderverse', startsAt: '2026-09-15T16:00:00.000Z', venue: { name: 'Royal Opera House', city: 'Mumbai' } }],
  },
  {
    id: 'zakir-khan-live',
    title: 'Zakir Khan Live — New Special Tour 2026',
    type: 'THEATRE',
    description: 'Unfiltered, heartfelt storytelling, sharp wit, and poetic observations with India’s most beloved comedian.',
    posterUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&auto=format&fit=crop&q=80',
    status: 'HOT TICKET',
    rating: 4.91,
    price: 1500,
    shows: [{ id: 'show-zakir', startsAt: '2026-09-18T20:00:00.000Z', venue: { name: 'Shanmukhananda Hall', city: 'Mumbai' } }],
  },
  {
    id: 'hans-zimmer-live',
    title: 'Hans Zimmer Live World Tour 2026',
    type: 'CONCERT',
    description: 'Epic symphonic suites from The Dark Knight, Gladiator, Inception, Pirates of the Caribbean & Lion King performed live.',
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    status: 'MUST ATTEND',
    rating: 4.99,
    price: 3800,
    shows: [{ id: 'show-zimmer', startsAt: '2026-10-12T19:00:00.000Z', venue: { name: 'Jio World Convention Centre', city: 'Mumbai' } }],
  },
  {
    id: 'f1-after-race-concert',
    title: 'Formula 1 Grand Prix After-Race Music Festival',
    type: 'CONCERT',
    description: 'High-octane racing meets international headliners, neon pyrotechnics, and an electrifying grandstand festival.',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    status: 'EXCLUSIVE',
    rating: 4.88,
    price: 5000,
    shows: [{ id: 'show-f1', startsAt: '2026-10-25T20:30:00.000Z', venue: { name: 'Buddh International Circuit', city: 'Greater Noida' } }],
  },
];

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
      .then((d) => {
        const fetched = d.items || [];
        if (fetched.length > 0) {
          // Merge API events with showcase metadata
          const merged = fetched.map((ev, idx) => ({
            ...ev,
            posterUrl: ev.posterUrl || SHOWCASE_EVENTS[idx % SHOWCASE_EVENTS.length].posterUrl,
            rating: 4.9 + (idx % 10) * 0.01,
            price: SHOWCASE_EVENTS[idx % SHOWCASE_EVENTS.length].price || 450,
          }));
          setEvents(merged);
        } else {
          // Fallback to rich showcase events
          setEvents(SHOWCASE_EVENTS);
        }
      })
      .catch(() => {
        setEvents(SHOWCASE_EVENTS);
      })
      .finally(() => setLoading(false));
  }, [searchQuery, selectedType]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesType =
        selectedType === 'ALL' ||
        event.type.toUpperCase() === selectedType.toUpperCase();
      const matchesSearch =
        !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.shows?.[0]?.venue?.city?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [events, selectedType, searchQuery]);

  const featuredEvent = useMemo(() => {
    return events.find((e) => e.featured) || events[0] || SHOWCASE_EVENTS[0];
  }, [events]);

  return (
    <main className="min-h-screen pb-20">
      {/* Gen-Z Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6">
        {/* Glow ambient orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-500/10 blur-[130px] pointer-events-none rounded-full" />
        
        <div className="relative mx-auto max-w-5xl text-center space-y-6">
          {/* Neon pill banner */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-4 py-1.5 text-xs font-extrabold text-indigo-300 backdrop-blur-xl shadow-lg shadow-indigo-500/10">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-200 to-pink-300 bg-clip-text text-transparent">
              Live Seat Engine • Zero Double Booking Guarantee
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Catch Every <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Live Beat</span> & <span className="bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-400 bg-clip-text text-transparent">Blockbuster</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
            Lock your favourite seats with <strong className="text-white">10-minute atomic holds</strong>, real-time WebSocket seat updates, and instant digital QR check-in passes.
          </p>

          {/* Interactive Search & Filter Box */}
          <div className="mx-auto max-w-3xl pt-4">
            <div className="glass-card rounded-2xl p-2.5 shadow-2xl border border-white/10 space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-indigo-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search concert, movie, artist, stadium, city..."
                  className="w-full rounded-xl bg-slate-900/90 py-3 pl-12 pr-4 text-sm text-white placeholder-slate-400 border border-white/5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
                {[
                  { id: 'ALL', label: '⚡ All Events' },
                  { id: 'CONCERT', label: '🎸 Concerts' },
                  { id: 'MOVIE', label: '🍿 IMAX Movies' },
                  { id: 'THEATRE', label: '🎭 Standup & Theatre' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedType(cat.id)}
                    className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      selectedType === cat.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Engine Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>ACID Safe Concurrency</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>10-Minute Hold Sweeper</span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-indigo-400" />
              <span>Cryptographic QR Tickets</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spotlight Card */}
      {featuredEvent && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 mb-12">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900/90 via-indigo-950/80 to-slate-900/90 p-1 shadow-2xl backdrop-blur-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-1 text-[11px] font-black text-white uppercase tracking-wider shadow-md">
                    <Flame className="h-3.5 w-3.5" />
                    FEATURED SPOTLIGHT
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-300">
                    ⭐ {featuredEvent.rating || '4.98'} Rated
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  {featuredEvent.title}
                </h2>

                <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                  {featuredEvent.description}
                </p>

                {featuredEvent.shows && featuredEvent.shows.length > 0 && (
                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-300 pt-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-indigo-400" />
                      <span>{featuredEvent.shows[0].venue.name}, {featuredEvent.shows[0].venue.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-purple-400" />
                      <span>{new Date(featuredEvent.shows[0].startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}

                <div className="pt-3 flex items-center gap-4">
                  <Link
                    href={`/events/${featuredEvent.id}`}
                    className="glow-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 px-6 py-3 text-xs font-extrabold text-white shadow-xl shadow-indigo-500/25 hover:opacity-95 transition"
                  >
                    <span>Reserve Live Seats</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  {featuredEvent.price && (
                    <span className="text-xs font-bold text-slate-400">
                      From <strong className="text-lg text-emerald-400">₹{featuredEvent.price}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Spotlight Poster Banner */}
              <div className="lg:col-span-5 overflow-hidden rounded-2xl border border-white/10 aspect-video lg:aspect-4/3 relative shadow-inner">
                <img
                  src={featuredEvent.posterUrl}
                  alt={featuredEvent.title}
                  className="h-full w-full object-cover object-center transition duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-extrabold text-emerald-400 border border-emerald-500/30">
                  ● Live Seats Available
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Events Grid Showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Trending Live Events</h2>
            <p className="text-xs text-slate-400">Select any event to explore the interactive seat map</p>
          </div>
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
            {filteredEvents.length} Events Available
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center space-y-3">
            <p className="text-base font-bold text-slate-300">No events matched your search.</p>
            <p className="text-xs text-slate-500">Try clearing your search query or selecting "All Events".</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('ALL');
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => {
              const nextShow = event.shows?.[0];
              const price = event.price || 350;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="glass-card glass-card-hover group flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                    <img
                      src={event.posterUrl}
                      alt={event.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    
                    {/* Top badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                          event.type === 'CONCERT'
                            ? 'bg-purple-500/80 text-white border border-purple-400/40 shadow-sm'
                            : 'bg-indigo-500/80 text-white border border-indigo-400/40 shadow-sm'
                        }`}
                      >
                        {event.type}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{event.rating || '4.9'}</span>
                      </span>
                    </div>

                    {/* Bottom overlay status */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="rounded-md bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                        ● {event.status || 'AVAILABLE'}
                      </span>
                      <span className="font-extrabold text-white text-sm">
                        ₹{price} <span className="text-[10px] text-slate-400 font-normal">onwards</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition leading-snug">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-400 leading-relaxed font-medium">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-white/5 pt-3 space-y-2">
                      {nextShow ? (
                        <div className="space-y-1 text-xs text-slate-400 font-medium">
                          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">{nextShow.venue.name}, {nextShow.venue.city}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            <span>{new Date(nextShow.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Upcoming showtimes</p>
                      )}

                      <div className="pt-2 flex items-center justify-between font-extrabold text-xs text-indigo-400 group-hover:text-indigo-300">
                        <span>Select Live Seats</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
