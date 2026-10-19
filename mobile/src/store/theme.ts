import { create } from 'zustand';
import { getItem, setItem } from '@/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'campaign.theme';

type ThemeState = {
  mode: ThemeMode;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
};

export const useThemeMode = create<ThemeState>((set) => ({
  mode: 'system',
  hydrate: async () => {
    const saved = await getItem(KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') set({ mode: saved });
  },
  setMode: (mode) => {
    set({ mode });
    void setItem(KEY, mode);
  },
}));
