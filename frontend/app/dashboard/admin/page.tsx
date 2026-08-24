'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Shield, Plus, Building2, Users, Settings, AlertCircle, CheckCircle, Lock } from 'lucide-react';

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
  const [rowCount, setRowCount] = useState(3);
  const [seatsPerRow, setSeatsPerRow] = useState(6);
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin Console</h1>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">ADMIN</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Configure venue seat layouts, assign RBAC roles, and inspect system invariants</p>
        </div>

        <button
          onClick={() => setShowVenueModal(true)}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create Venue</span>
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Venues Grid */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">System Venues</h2>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading venues...</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <div key={venue.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{venue.name}</h3>
                    <p className="text-xs text-slate-500">{venue.city}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mb-4">{venue.address}</p>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
                  <span className="font-semibold text-purple-700">Layout Configured</span>
                  <span className="text-slate-400 font-mono text-[11px]">{venue.id.slice(0, 12)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User RBAC Management Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">User Role Management (RBAC)</h2>
          <span className="text-xs font-semibold text-slate-400">{users.length} registered accounts</span>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No user accounts found or non-admin mode.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{u.name || 'User'}</span>
                    <span className="text-xs text-slate-500 font-mono">({u.email})</span>
                  </div>
                  <span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'ORGANISER' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role}
                  </span>
                </div>

                {u.role !== 'ADMIN' && (
                  <button
                    onClick={() => toggleUserRole(u.id, u.role)}
                    className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleCreateVenue} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create & Configure Venue</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Venue Name</label>
              <input
                required
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Grand Horizon Arena"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  required
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                <input
                  required
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 100 Express Way"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Row Count (A-H)</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={8}
                  value={rowCount}
                  onChange={(e) => setRowCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seats per Row</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={12}
                  value={seatsPerRow}
                  onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              This will automatically generate {rowCount * seatsPerRow} seat records with Row 1 assigned to PREMIUM category and remaining rows to STANDARD category.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVenueModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingVenue}
                className="flex-1 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition disabled:opacity-50"
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
