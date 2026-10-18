import { create } from 'zustand';
import { api, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { getItem, removeItem, setItem } from '@/lib/storage';
import type { AppUser } from '@/types/api';

type AuthState = {
  user: AppUser | null;
  token: string | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AppUser) => void;
};

type AuthResponse = { token: string; user: AppUser };

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  ready: false,

  hydrate: async () => {
    setUnauthorizedHandler(() => void get().signOut());
    const token = await getItem('auth_token');
    if (!token) {
      set({ ready: true });
      return;
    }
    setAuthToken(token);
    try {
      const { user } = await api<{ user: AppUser }>('/auth/me');
      set({ token, user, ready: true });
    } catch (err) {
      // A rejected token means the session is over; a network failure keeps the user signed in offline.
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setAuthToken(null);
        await removeItem('auth_token');
        set({ token: null, user: null, ready: true });
      } else {
        set({ token, ready: true });
      }
    }
  },

  signIn: async (email, password) => {
    const res = await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });
    setAuthToken(res.token);
    await setItem('auth_token', res.token);
    set({ token: res.token, user: res.user });
  },

  signUp: async (name, email, password) => {
    const res = await api<AuthResponse>('/auth/register', { method: 'POST', body: { name, email, password } });
    setAuthToken(res.token);
    await setItem('auth_token', res.token);
    set({ token: res.token, user: res.user });
  },

  signOut: async () => {
    setAuthToken(null);
    await removeItem('auth_token');
    set({ token: null, user: null });
  },

  setUser: (user) => set({ user }),
}));
