'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Ticket, LogOut, Shield, LayoutDashboard, Calendar, ShoppingBag, Sparkles, User as UserIcon } from 'lucide-react';

export function Navbar() {
  const { user, clear, hydrate } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    hydrate();
    setMounted(true);
  }, [hydrate]);

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-white group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-500/25 transition-transform group-hover:scale-105">
            <Ticket className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Ticket<span className="text-indigo-400 font-black">Book</span>
          </span>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-300">
          <Link
            href="/"
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition ${
              pathname === '/' ? 'bg-white/10 text-white shadow-inner' : 'hover:bg-white/5 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>Discover Events</span>
          </Link>

          {user && (
            <Link
              href="/bookings"
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition ${
                pathname === '/bookings' ? 'bg-white/10 text-white shadow-inner' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShoppingBag className="h-4 w-4 text-purple-400" />
              <span>My Tickets</span>
            </Link>
          )}

          {/* Role specific links */}
          {user?.role === 'ORGANISER' && (
            <Link
              href="/dashboard/organiser"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Organiser Studio</span>
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/organiser"
                className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Organiser</span>
              </Link>
              <Link
                href="/dashboard/admin"
                className="flex items-center gap-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Admin Console</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-200">{user.name || user.email}</span>
                <span
                  className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : user.role === 'ORGANISER'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => clear()}
                title="Logout"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-300 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="glow-btn flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Join / Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
