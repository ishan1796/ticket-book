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
  VIP: { bg: 'bg-amber-500/15', border: 'border-amber-400/40', text: 'text-amber-300', label: 'VIP' },
  PREMIUM: { bg: 'bg-purple-500/15', border: 'border-purple-400/40', text: 'text-purple-300', label: 'Premium' },
  STANDARD: { bg: 'bg-indigo-500/15', border: 'border-indigo-400/40', text: 'text-indigo-300', label: 'Standard' },
  BALCONY: { bg: 'bg-cyan-500/15', border: 'border-cyan-400/40', text: 'text-cyan-300', label: 'Balcony' },
  ECONOMY: { bg: 'bg-slate-500/15', border: 'border-slate-400/40', text: 'text-slate-300', label: 'Economy' },
};

const STATUS_CLASSES: Record<SeatStatus | 'SELECTED', string> = {
  AVAILABLE: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 hover:scale-110 hover:border-emerald-400 cursor-pointer shadow-xs',
  HELD: 'bg-amber-500/20 border-amber-500/40 text-amber-300 cursor-not-allowed opacity-70',
  BOOKED: 'bg-rose-950/40 border-rose-900/30 text-rose-500/40 cursor-not-allowed opacity-40',
  OFFERED: 'bg-purple-500/20 border-purple-500/40 text-purple-300 cursor-not-allowed opacity-70',
  SELECTED: 'bg-indigo-600 border-indigo-400 text-white cursor-pointer shadow-lg shadow-indigo-500/50 scale-110 ring-2 ring-indigo-400',
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
    socket.on('seat_updated', onSeatUpdate);
    return () => {
      socket.emit('unsubscribe_show', showId);
      socket.off('seat_update', onSeatUpdate);
      socket.off('seat_updated', onSeatUpdate);
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
    <div className="glass-card space-y-8 rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl">
      {/* Screen / Stage Header */}
      <div className="relative mx-auto w-full max-w-xl text-center">
        <div className="h-2 w-full rounded-b-2xl bg-gradient-to-r from-indigo-500 via-purple-400 to-pink-500 shadow-lg shadow-indigo-500/50" />
        <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-indigo-300">STAGE / MAIN SCREEN</p>
      </div>

      {/* Categories Badge Legend */}
      {categoryPrices && categoryPrices.size > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-y border-white/5 py-3 text-xs">
          <span className="font-bold text-slate-400">Categories & Rates:</span>
          {categoriesPresent.map((cat) => {
            const price = categoryPrices.get(cat);
            const style = CATEGORY_COLORS[cat] || { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-300', label: cat };
            return (
              <div key={cat} className={`flex items-center gap-1.5 rounded-full border ${style.border} ${style.bg} px-3 py-1 font-bold ${style.text}`}>
                <span>{style.label}</span>
                {price !== undefined && <span className="opacity-90 font-extrabold text-emerald-400">₹{price}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Seat Grid */}
      <div className="flex flex-col items-center gap-3 overflow-x-auto pb-4 pt-2">
        {rows.map(([rowLabel, rowSeats]) => (
          <div key={rowLabel} className="flex items-center gap-3">
            <span className="w-6 text-center text-xs font-black text-slate-400">{rowLabel}</span>
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
                    className={`group relative flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-black transition-all duration-150 ${STATUS_CLASSES[styleKey]}`}
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
            <span className="w-6 text-center text-xs font-black text-slate-400">{rowLabel}</span>
          </div>
        ))}
      </div>

      {/* Seat Status Legend */}
      <div className="flex flex-wrap justify-center gap-6 border-t border-white/5 pt-4 text-xs font-semibold text-slate-300">
        <LegendItem color="bg-emerald-400 shadow-sm shadow-emerald-400/50" label="Available" />
        <LegendItem color="bg-indigo-500 shadow-sm shadow-indigo-500/50" label="Selected" />
        <LegendItem color="bg-amber-400" label="Held by someone" />
        <LegendItem color="bg-purple-400" label="Waitlist offer" />
        <LegendItem color="bg-rose-600/40" label="Booked" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3.5 w-3.5 rounded-md ${color}`} />
      <span>{label}</span>
    </div>
  );
}
