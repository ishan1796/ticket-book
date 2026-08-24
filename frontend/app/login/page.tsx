'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Lock, Mail, ArrowRight, Ticket, Sparkles } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', { email, password });
      setSession(res.user, res.accessToken, res.refreshToken);
      router.push(params.get('next') ?? '/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Password123!');
  }

  return (
    <div className="glass-card overflow-hidden rounded-3xl border border-white/10 p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
          <Ticket className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-white">Welcome Back</h1>
        <p className="text-xs text-slate-400">Sign in to manage holds, tickets, and bookings</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-indigo-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl bg-slate-900/90 border border-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-indigo-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-slate-900/90 border border-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-semibold">
            {error}
          </div>
        )}

        <button
          disabled={loading}
          className="glow-btn w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50"
        >
          <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {/* Demo Account Quick-Fill Buttons */}
      <div className="border-t border-white/5 pt-5 space-y-2.5">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
          Evaluator Quick-Fill Accounts:
        </span>
        <div className="grid grid-cols-3 gap-2 text-center">
          <button
            onClick={() => fillDemo('customer@demo.com')}
            className="rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/10 transition"
          >
            Customer
          </button>
          <button
            onClick={() => fillDemo('organiser@demo.com')}
            className="rounded-xl border border-amber-500/20 bg-amber-500/10 py-2 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition"
          >
            Organiser
          </button>
          <button
            onClick={() => fillDemo('admin@demo.com')}
            className="rounded-xl border border-purple-500/20 bg-purple-500/10 py-2 text-[11px] font-bold text-purple-300 hover:bg-purple-500/20 transition"
          >
            Admin
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        Don't have an account?{' '}
        <Link href="/register" className="font-bold text-indigo-400 hover:text-indigo-300 underline">
          Register here
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Suspense fallback={<div className="text-center text-slate-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
