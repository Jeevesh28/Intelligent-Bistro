import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CartLine } from "../lib/types";

export type PaymentMethod = "card" | "venmo" | "cash";

export interface PlacedOrder {
  id: string;
  lines: CartLine[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  placedAt: number;
  estimatedReadyMinutes: number;
  paymentMethod: PaymentMethod;
  cardLast4?: string;
  venmoHandle?: string;
}

const HISTORY_KEY = "bistro.orders";
const HISTORY_LIMIT = 20;

interface OrderState {
  lastOrder: PlacedOrder | null;
  history: PlacedOrder[];
  ready: boolean;
  setLastOrder: (o: PlacedOrder) => void;
  addToHistory: (o: PlacedOrder) => void;
  clear: () => void;
  clearHistory: () => Promise<void>;
  load: () => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  lastOrder: null,
  history: [],
  ready: false,

  setLastOrder: (o) => set({ lastOrder: o }),

  addToHistory: (o) => {
    const next = [o, ...get().history].slice(0, HISTORY_LIMIT);
    set({ history: next });
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
  },

  clear: () => set({ lastOrder: null }),

  clearHistory: async () => {
    set({ history: [] });
    await AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const history = raw ? (JSON.parse(raw) as PlacedOrder[]) : [];
      set({ history, ready: true });
    } catch {
      set({ ready: true });
    }
  },
}));
