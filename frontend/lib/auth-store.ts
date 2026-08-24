'use client';
import { create } from 'zustand';

interface User { id: string; email: string; name?: string; role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN'; }

interface AuthState {
  user: User | null;
  setSession: (user: User, accessToken: string, refreshToken: string) => void;
  clear: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setSession: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null });
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('user');
    if (raw) set({ user: JSON.parse(raw) });
  },
}));
