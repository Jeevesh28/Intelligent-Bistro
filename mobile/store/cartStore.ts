import { create } from "zustand";
import type { Cart } from "../lib/types";
import { api } from "../lib/api";
import { getSessionId } from "../lib/session";

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  lastAddedAt: number;
  refresh: () => Promise<void>;
  setCart: (cart: Cart) => void;
  addItem: (body: { item_id: string; quantity?: number; modifiers?: string[]; size?: string }) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  error: null,
  lastAddedAt: 0,

  setCart: (cart) => {
    const prevCount = get().cart?.itemCount ?? 0;
    set({
      cart,
      lastAddedAt: cart.itemCount > prevCount ? Date.now() : get().lastAddedAt,
    });
  },

  refresh: async () => {
    try {
      set({ loading: true, error: null });
      const sessionId = await getSessionId();
      const cart = await api.getCart(sessionId);
      set({ cart, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load cart", loading: false });
    }
  },

  addItem: async (body) => {
    try {
      const sessionId = await getSessionId();
      const cart = await api.addItem(sessionId, body);
      get().setCart(cart);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to add item" });
      throw e;
    }
  },

  updateQuantity: async (lineId, quantity) => {
    try {
      const sessionId = await getSessionId();
      const cart = await api.updateQuantity(sessionId, lineId, quantity);
      set({ cart });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to update" });
    }
  },

  removeLine: async (lineId) => {
    try {
      const sessionId = await getSessionId();
      const cart = await api.removeLine(sessionId, lineId);
      set({ cart });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to remove" });
    }
  },

  clear: async () => {
    try {
      const sessionId = await getSessionId();
      const cart = await api.clearCart(sessionId);
      set({ cart });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to clear" });
    }
  },
}));
