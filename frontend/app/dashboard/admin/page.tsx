'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Shield, Plus, Building2, Users, Settings, AlertCircle, CheckCircle, Lock, Sparkles } from 'lucide-react';

interface VenueItem {
  id: string;
  name: string;
  address: string;
  city: string;
  seats?: { id: string; rowLabel: string; seatNumber: number; category: string }[];
}

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for venue creation
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [rowCount, setRowCount] = useState(4);
  const [seatsPerRow, setSeatsPerRow] = useState(8);
  const [creatingVenue, setCreatingVenue] = useState(false);

  const loadAdminData = () => {
    setLoading(true);
    Promise.all([
      api.get<VenueItem[]>('/venues'),
      api.get<UserItem[]>('/admin/users').catch(() => []),
    ])
      .then(([vData, uData]) => {
        setVenues(vData || []);
        setUsers(uData || []);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load admin data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault();
    setCreatingVenue(true);
    setError(null);

    // Build seat layout grid
    const seats = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let r = 0; r < rowCount; r++) {
      const rowLabel = rows[r] || `R${r + 1}`;
      for (let s = 1; s <= seatsPerRow; s++) {
        const category = r === 0 ? 'PREMIUM' : 'STANDARD';
        seats.push({
          rowLabel,
          seatNumber: s,
          category,
          posX: s - 1,
          posY: r,
        });
      }
    }

    try {
      await api.post('/venues', {
        name: venueName,
        address,
        city,
        seats,
      });
      setShowVenueModal(false);
      setVenueName('');
      setAddress('');
      setCity('');
      loadAdminData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create venue.');
    } finally {
      setCreatingVenue(false);
    }
  }

  async function toggleUserRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'CUSTOMER' ? 'ORGANISER' : 'CUSTOMER';
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      loadAdminData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to change user role.');
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white">Admin Console</h1>
            <span className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-xs font-extrabold text-purple-300">
              SUPERADMIN
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Configure venue seat layouts, assign RBAC roles, and inspect system invariants</p>
        </div>

        <button
          onClick={() => setShowVenueModal(true)}
          className="glow-btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-purple-500/25 hover:from-purple-600 hover:to-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create Venue</span>
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Venues Grid */}
      <div className="mb-10">
        <h2 className="text-xl font-extrabold text-white mb-4">Configured Venues & Layouts</h2>
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading venues...</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <div key={venue.id} className="glass-card rounded-3xl border border-white/10 p-6 shadow-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">{venue.name}</h3>
                    <p className="text-xs text-slate-400">{venue.city}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">{venue.address}</p>
                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-400">● Layout Active</span>
                  <span className="text-slate-500 font-mono text-[11px]">{venue.id.slice(0, 12)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User RBAC Management Table */}
      <div className="glass-card overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
        <div className="border-b border-white/5 bg-slate-950/60 px-6 py-4 flex items-center justify-between">
          <h2 className="font-extrabold text-white text-base">User Role Management (RBAC)</h2>
          <span className="text-xs font-semibold text-slate-400">{users.length} registered accounts</span>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">No user accounts found or non-admin mode.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((u) => (
              <div key={u.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{u.name || 'User'}</span>
                    <span className="text-xs text-slate-400 font-mono">({u.email})</span>
                  </div>
                  <span
                    className={`mt-1.5 inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : u.role === 'ORGANISER'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                {u.role !== 'ADMIN' && (
                  <button
                    onClick={() => toggleUserRole(u.id, u.role)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition"
                  >
                    Switch to {u.role === 'CUSTOMER' ? 'ORGANISER' : 'CUSTOMER'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Venue Modal */}
      {showVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <form onSubmit={handleCreateVenue} className="glass-card w-full max-w-md rounded-3xl border border-white/10 p-7 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Create & Configure Venue</h3>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Venue Name</label>
              <input
                required
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Grand Horizon Arena"
                className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">City</label>
                <input
                  required
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Address</label>
                <input
                  required
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 100 Express Way"
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Row Count (A-H)</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={8}
                  value={rowCount}
                  onChange={(e) => setRowCount(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Seats per Row</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={12}
                  value={seatsPerRow}
                  onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Generates {rowCount * seatsPerRow} seat records with Row 1 assigned to PREMIUM and remaining rows to STANDARD.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowVenueModal(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingVenue}
                className="glow-btn flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-purple-500/25 hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50"
              >
                {creatingVenue ? 'Building...' : 'Build Venue'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
