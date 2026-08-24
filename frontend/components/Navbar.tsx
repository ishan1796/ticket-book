'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Ticket, User as UserIcon, LogOut, Shield, LayoutDashboard, Calendar, ShoppingBag } from 'lucide-react';

export function Navbar() {
  const { user, clear, hydrate } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    hydrate();
    setMounted(true);
  }, [hydrate]);

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 transition-transform group-hover:scale-105">
            <Ticket className="h-5 w-5" />
          </div>
          <span>Ticket<span className="text-indigo-600">Book</span></span>
        </Link>

        {/* Center Nav Items */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/" className="flex items-center gap-1.5 transition hover:text-indigo-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            Events
          </Link>
          {user && (
            <Link href="/bookings" className="flex items-center gap-1.5 transition hover:text-indigo-600">
              <ShoppingBag className="h-4 w-4 text-slate-400" />
              My Bookings
            </Link>
          )}

          {/* Role specific links */}
          {user?.role === 'ORGANISER' && (
            <Link href="/dashboard/organiser" className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Organiser Dashboard
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <div className="flex items-center gap-2">
              <Link href="/dashboard/organiser" className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Organiser
              </Link>
              <Link href="/dashboard/admin" className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition">
                <Shield className="h-3.5 w-3.5" />
                Admin Console
              </Link>
            </div>
          )}
        </nav>

        {/* Right Section: User & Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-800">{user.name || user.email}</span>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                  user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'ORGANISER' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => clear()}
                title="Logout"
                className="flex items-center gap-1 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
