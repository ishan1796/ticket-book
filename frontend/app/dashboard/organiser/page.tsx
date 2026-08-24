'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { LayoutDashboard, Plus, Calendar, DollarSign, Ticket, Users, Layers, Sparkles, AlertCircle } from 'lucide-react';

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
  const [standardPrice, setStandardPrice] = useState('50');
  const [premiumPrice, setPremiumPrice] = useState('100');
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Organiser Dashboard</h1>
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">ORGANISER</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Manage events, schedule showtimes, assign venues, and configure seat pricing</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </button>
          <button
            onClick={() => setShowShowModal(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
          >
            <Calendar className="h-4 w-4" />
            <span>Create Show</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Layers className="h-5 w-5 text-indigo-600" />} label="Total Events" value={events.length} />
        <KpiCard icon={<Calendar className="h-5 w-5 text-purple-600" />} label="Active Shows" value={totalShows} />
        <KpiCard icon={<Users className="h-5 w-5 text-emerald-600" />} label="Venues Available" value={venues.length} />
        <KpiCard icon={<DollarSign className="h-5 w-5 text-amber-600" />} label="System Status" value="ACTIVE" />
      </div>

      {/* Events Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="font-bold text-slate-900">Your Managed Events</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No events created yet. Click "Create Event" to begin.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((ev) => (
              <div key={ev.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-lg">{ev.title}</h3>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">{ev.type}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{ev.status}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{ev.shows?.length || 0} scheduled showtimes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedEventId(ev.id);
                      setShowShowModal(true);
                    }}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Add Show
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleCreateEvent} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New Event</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Coldplay World Tour"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Event Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="MOVIE">MOVIE</option>
                <option value="CONCERT">CONCERT</option>
                <option value="THEATRE">THEATRE</option>
                <option value="SPORTS">SPORTS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Event description..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingEvent}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {creatingEvent ? 'Creating...' : 'Create & Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Show Modal */}
      {showShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleCreateShow} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Schedule New Show</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Event</label>
              <select
                required
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Select Event --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Venue</label>
              <select
                required
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Select Venue --</option>
                {venues.map((vn) => (
                  <option key={vn.id} value={vn.id}>{vn.name} ({vn.city})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
              <input
                required
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">STANDARD Price (₹)</label>
                <input
                  required
                  type="number"
                  value={standardPrice}
                  onChange={(e) => setStandardPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PREMIUM Price (₹)</label>
                <input
                  required
                  type="number"
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowShowModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingShow}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
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
    <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">{icon}</div>
      <div>
        <span className="block text-xs font-semibold text-slate-400">{label}</span>
        <span className="text-xl font-extrabold text-slate-900">{value}</span>
      </div>
    </div>
  );
}
