'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { Armchair, Sparkles } from 'lucide-react';

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'OFFERED';

export interface SeatMapSeat {
  id: string;
  rowLabel: string;
  seatNumber: number;
  category: string;
  status: SeatStatus;
  posX: number;
  posY: number;
}

interface Props {
  showId: string;
  initialSeats: SeatMapSeat[];
  selectedIds: Set<string>;
  categoryPrices?: Map<string, number>;
  onToggleSeat: (seat: SeatMapSeat) => void;
  maxSelectable?: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  VIP: { bg: 'bg-amber-500/10', border: 'border-amber-400', text: 'text-amber-700', label: 'VIP' },
  PREMIUM: { bg: 'bg-purple-500/10', border: 'border-purple-400', text: 'text-purple-700', label: 'Premium' },
  STANDARD: { bg: 'bg-indigo-500/10', border: 'border-indigo-400', text: 'text-indigo-700', label: 'Standard' },
  BALCONY: { bg: 'bg-blue-500/10', border: 'border-blue-400', text: 'text-blue-700', label: 'Balcony' },
  ECONOMY: { bg: 'bg-slate-500/10', border: 'border-slate-400', text: 'text-slate-700', label: 'Economy' },
};

const STATUS_CLASSES: Record<SeatStatus | 'SELECTED', string> = {
  AVAILABLE: 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100 hover:scale-105 cursor-pointer shadow-xs',
  HELD: 'bg-amber-100 border-amber-300 text-amber-800 cursor-not-allowed opacity-60',
  BOOKED: 'bg-rose-100 border-rose-300 text-rose-800 cursor-not-allowed opacity-60',
  OFFERED: 'bg-purple-100 border-purple-300 text-purple-800 cursor-not-allowed opacity-60',
  SELECTED: 'bg-indigo-600 border-indigo-700 text-white cursor-pointer shadow-md scale-110 ring-2 ring-indigo-300',
};

export function SeatMap({ showId, initialSeats, selectedIds, categoryPrices, onToggleSeat, maxSelectable = 8 }: Props) {
  const [seats, setSeats] = useState<Map<string, SeatMapSeat>>(
    () => new Map(initialSeats.map((s) => [s.id, s]))
  );

  useEffect(() => {
    setSeats(new Map(initialSeats.map((s) => [s.id, s])));
  }, [initialSeats]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('subscribe_show', showId);

    const onSeatUpdate = (payload: { showSeatId: string; status: SeatStatus }) => {
      setSeats((prev) => {
        const next = new Map(prev);
        const existing = next.get(payload.showSeatId);
        if (existing) {
          next.set(payload.showSeatId, { ...existing, status: payload.status });
        }
        return next;
      });
    };

    socket.on('seat_update', onSeatUpdate);
    return () => {
      socket.emit('unsubscribe_show', showId);
      socket.off('seat_update', onSeatUpdate);
    };
  }, [showId]);

  const rows = useMemo(() => {
    const grouped = new Map<string, SeatMapSeat[]>();
    for (const seat of seats.values()) {
      if (!grouped.has(seat.rowLabel)) grouped.set(seat.rowLabel, []);
      grouped.get(seat.rowLabel)!.push(seat);
    }
    for (const list of grouped.values()) list.sort((a, b) => a.seatNumber - b.seatNumber);
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  const categoriesPresent = useMemo(() => {
    const set = new Set<string>();
    for (const s of seats.values()) set.add(s.category);
    return Array.from(set);
  }, [seats]);

  function handleClick(seat: SeatMapSeat) {
    const isSelected = selectedIds.has(seat.id);
    if (seat.status !== 'AVAILABLE' && !isSelected) return;
    if (!isSelected && selectedIds.size >= maxSelectable) return;
    onToggleSeat(seat);
  }

  return (
    <div className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Screen/Stage Header */}
      <div className="relative mx-auto w-full max-w-xl text-center">
        <div className="h-2 w-full rounded-b-2xl bg-gradient-to-r from-indigo-300 via-indigo-600 to-indigo-300 shadow-sm" />
        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">STAGE / SCREEN</p>
      </div>

      {/* Categories Badge Legend */}
      {categoryPrices && categoryPrices.size > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-y border-slate-100 py-3 text-xs">
          <span className="font-semibold text-slate-500">Categories & Prices:</span>
          {categoriesPresent.map((cat) => {
            const price = categoryPrices.get(cat);
            const style = CATEGORY_COLORS[cat] || { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', label: cat };
            return (
              <div key={cat} className={`flex items-center gap-1.5 rounded-full border ${style.border} ${style.bg} px-3 py-1 font-semibold ${style.text}`}>
                <span>{style.label}</span>
                {price !== undefined && <span className="opacity-80">₹{price}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Seat Grid */}
      <div className="flex flex-col items-center gap-3 overflow-x-auto pb-4 pt-2">
        {rows.map(([rowLabel, rowSeats]) => (
          <div key={rowLabel} className="flex items-center gap-3">
            <span className="w-6 text-center text-xs font-bold text-slate-400">{rowLabel}</span>
            <div className="flex gap-2">
              {rowSeats.map((seat) => {
                const isSelected = selectedIds.has(seat.id);
                const styleKey = isSelected ? 'SELECTED' : seat.status;
                const price = categoryPrices?.get(seat.category);

                return (
                  <button
                    key={seat.id}
                    onClick={() => handleClick(seat)}
                    disabled={seat.status !== 'AVAILABLE' && !isSelected}
                    title={`Seat ${rowLabel}${seat.seatNumber} | ${seat.category} | ${seat.status}${price ? ` | ₹${price}` : ''}`}
                    className={`group relative flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold transition-all duration-150 ${STATUS_CLASSES[styleKey]}`}
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
            <span className="w-6 text-center text-xs font-bold text-slate-400">{rowLabel}</span>
          </div>
        ))}
      </div>

      {/* Seat Status Legend */}
      <div className="flex flex-wrap justify-center gap-6 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
        <LegendItem color="bg-emerald-500" label="Available" />
        <LegendItem color="bg-indigo-600" label="Selected" />
        <LegendItem color="bg-amber-500" label="Held by someone" />
        <LegendItem color="bg-purple-500" label="Waitlist offer pending" />
        <LegendItem color="bg-rose-500" label="Booked" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3.5 w-3.5 rounded-md ${color} shadow-xs`} />
      <span>{label}</span>
    </div>
  );
}
