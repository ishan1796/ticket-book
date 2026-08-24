'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { LayoutDashboard, Plus, Calendar, DollarSign, Ticket, Users, Layers, Sparkles, AlertCircle, MapPin, Clock, ArrowRight } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  type: string;
  status: string;
  shows: { id: string; startsAt: string; venue: { name: string; city: string } }[];
}

interface VenueItem {
  id: string;
  name: string;
  city: string;
}

export default function OrganiserDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showShowModal, setShowShowModal] = useState(false);

  // New Event Form
  const [title, setTitle] = useState('');
  const [type, setType] = useState('MOVIE');
  const [description, setDescription] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  // New Show Form
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [standardPrice, setStandardPrice] = useState('450');
  const [premiumPrice, setPremiumPrice] = useState('950');
  const [creatingShow, setCreatingShow] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<{ items: EventItem[] }>('/events'),
      api.get<VenueItem[]>('/venues'),
    ])
      .then(([evData, vnData]) => {
        setEvents(evData.items || []);
        setVenues(vnData || []);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreatingEvent(true);
    setError(null);
    try {
      const newEv = await api.post<{ id: string }>('/events', { title, type, description });
      await api.patch(`/events/${newEv.id}/publish`);
      setShowEventModal(false);
      setTitle('');
      setDescription('');
      loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create event.');
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleCreateShow(e: React.FormEvent) {
    e.preventDefault();
    setCreatingShow(true);
    setError(null);
    try {
      const startsDate = new Date(startsAt).toISOString();
      const endsDate = new Date(new Date(startsAt).getTime() + 7200000).toISOString();

      await api.post('/shows', {
        eventId: selectedEventId,
        venueId: selectedVenueId,
        startsAt: startsDate,
        endsAt: endsDate,
        pricing: [
          { category: 'STANDARD', price: Number(standardPrice) },
          { category: 'PREMIUM', price: Number(premiumPrice) },
        ],
      });
      setShowShowModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create show.');
    } finally {
      setCreatingShow(false);
    }
  }

  const totalShows = events.reduce((acc, ev) => acc + (ev.shows?.length || 0), 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white">Organiser Studio</h1>
            <span className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-extrabold text-amber-300">
              ORGANISER
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Manage live events, schedule showtimes, assign venues, and configure seat pricing</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEventModal(true)}
            className="glow-btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </button>
          <button
            onClick={() => setShowShowModal(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition"
          >
            <Calendar className="h-4 w-4 text-purple-400" />
            <span>Schedule Show</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Layers className="h-5 w-5 text-indigo-400" />} label="Total Events" value={events.length} />
        <KpiCard icon={<Calendar className="h-5 w-5 text-purple-400" />} label="Active Shows" value={totalShows} />
        <KpiCard icon={<Users className="h-5 w-5 text-emerald-400" />} label="Venues Available" value={venues.length} />
        <KpiCard icon={<DollarSign className="h-5 w-5 text-amber-400" />} label="System Status" value="ACTIVE" />
      </div>

      {/* Managed Events Panel */}
      <div className="glass-card overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
        <div className="border-b border-white/5 bg-slate-950/60 px-6 py-4 flex items-center justify-between">
          <h2 className="font-extrabold text-white text-base">Your Managed Events & Shows</h2>
          <span className="text-xs font-semibold text-slate-400">{events.length} events registered</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <p className="text-sm font-bold text-white">No events created yet.</p>
            <p className="text-xs text-slate-500">Click "Create Event" above to publish your first movie or concert.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((ev) => (
              <div key={ev.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-lg">{ev.title}</h3>
                    <span className="rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-300">
                      {ev.type}
                    </span>
                    <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                      ● {ev.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-medium">
                    <span>{ev.shows?.length || 0} scheduled showtimes</span>
                    {ev.shows && ev.shows.length > 0 && (
                      <span className="text-slate-500">• Next at {ev.shows[0].venue.name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedEventId(ev.id);
                      setShowShowModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Show</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <form onSubmit={handleCreateEvent} className="glass-card w-full max-w-md rounded-3xl border border-white/10 p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Create New Event</h3>
              <span className="text-xs font-semibold text-indigo-400">Step 1 of 2</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Event Title</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Coldplay Music of the Spheres"
                className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Event Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              >
                <option value="MOVIE" className="bg-slate-900 text-white">🍿 MOVIE</option>
                <option value="CONCERT" className="bg-slate-900 text-white">🎸 CONCERT</option>
                <option value="THEATRE" className="bg-slate-900 text-white">🎭 THEATRE & STANDUP</option>
                <option value="SPORTS" className="bg-slate-900 text-white">🏎️ SPORTS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief summary of the live experience..."
                className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingEvent}
                className="glow-btn flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50"
              >
                {creatingEvent ? 'Publishing...' : 'Create & Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Show Modal */}
      {showShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <form onSubmit={handleCreateShow} className="glass-card w-full max-w-md rounded-3xl border border-white/10 p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Schedule Showtime</h3>
              <span className="text-xs font-semibold text-purple-400">Step 2 of 2</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Select Event</label>
              <select
                required
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Select Event --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">{ev.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Select Venue</label>
              <select
                required
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- Select Venue --</option>
                {venues.map((vn) => (
                  <option key={vn.id} value={vn.id} className="bg-slate-900 text-white">{vn.name} ({vn.city})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Start Date & Time</label>
              <input
                required
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">STANDARD (₹)</label>
                <input
                  required
                  type="number"
                  value={standardPrice}
                  onChange={(e) => setStandardPrice(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">PREMIUM / VIP (₹)</label>
                <input
                  required
                  type="number"
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowShowModal(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingShow}
                className="glow-btn flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50"
              >
                {creatingShow ? 'Scheduling...' : 'Schedule Show'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="glass-card flex items-center gap-4 rounded-3xl border border-white/10 p-5 shadow-xl transition hover:border-indigo-500/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">{icon}</div>
      <div>
        <span className="block text-xs font-bold text-slate-400">{label}</span>
        <span className="text-xl font-black text-white">{value}</span>
      </div>
    </div>
  );
}
