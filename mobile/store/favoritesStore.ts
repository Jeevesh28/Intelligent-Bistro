import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "bistro.favorites";

interface FavoritesState {
  ids: string[];
  ready: boolean;
  load: () => Promise<void>;
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  ready: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      set({ ids, ready: true });
    } catch {
      set({ ready: true });
    }
  },

  toggle: (id) => {
    const { ids } = get();
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    set({ ids: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  },

  isFavorite: (id) => get().ids.includes(id),
}));
