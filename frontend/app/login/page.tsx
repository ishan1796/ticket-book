'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Lock, Mail, ArrowRight, ShieldCheck, Ticket } from 'lucide-react';

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
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="text-center mb-6 space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
          <Ticket className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
        <p className="text-xs text-slate-500">Sign in to manage holds, view tickets, and confirm bookings</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
        >
          <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {/* Demo Account Quick-Fill Buttons */}
      <div className="mt-8 border-t border-slate-100 pt-6 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
          Evaluator Demo Quick-Fill:
        </span>
        <div className="grid grid-cols-3 gap-2 text-center">
          <button
            onClick={() => fillDemo('customer1@demo.com')}
            className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Customer
          </button>
          <button
            onClick={() => fillDemo('organiser@demo.com')}
            className="rounded-lg border border-amber-200 bg-amber-50 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition"
          >
            Organiser
          </button>
          <button
            onClick={() => fillDemo('admin@demo.com')}
            className="rounded-lg border border-purple-200 bg-purple-50 py-1.5 text-[11px] font-semibold text-purple-800 hover:bg-purple-100 transition"
          >
            Admin
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <Link href="/register" className="font-bold text-indigo-600 hover:underline">
          Create one now
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
