import { create } from "zustand";
import type { ChatMessage } from "../lib/types";
import { api } from "../lib/api";
import { getSessionId } from "../lib/session";
import { useCartStore } from "./cartStore";

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

const INITIAL: ChatMessage = {
  role: "assistant",
  content:
    "Welcome to The Intelligent Bistro. I can build your order from anything you say — try \"the spicy chicken with truffle fries and an iced tea,\" or ask me what's good tonight.",
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [INITIAL],
  sending: false,
  error: null,

  send: async (text) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const historyForApi = get().messages.filter((m) => m !== INITIAL);
    set({ messages: [...get().messages, userMsg], sending: true, error: null });
    try {
      const sessionId = await getSessionId();
      const res = await api.chat(sessionId, text, historyForApi);
      useCartStore.getState().setCart(res.cart);
      const reply: ChatMessage = {
        role: "assistant",
        content: res.reply,
        actions: res.actions,
        suggestions: res.suggestions,
      };
      set({ messages: [...get().messages, reply], sending: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      set({
        sending: false,
        error: msg,
        messages: [
          ...get().messages,
          { role: "assistant", content: `Sorry — I couldn't reach the kitchen. (${msg})` },
        ],
      });
    }
  },

  reset: () => set({ messages: [INITIAL], error: null }),
}));
