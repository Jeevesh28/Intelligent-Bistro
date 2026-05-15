import EventSource from "react-native-sse";
import type { Cart, ChatMessage, ChatResponse, ExecutedAction, Menu, Suggestion } from "./types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface ChatStreamHandlers {
  onDelta?: (text: string) => void;
  onAction?: (action: ExecutedAction) => void;
  onSuggestion?: (suggestion: Suggestion) => void;
  onCart?: (cart: Cart) => void;
  onDone?: () => void;
  onError?: (err: string) => void;
}

export interface ChatStreamHandle {
  close: () => void;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ?? JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return (await res.json()) as T;
}

export const api = {
  baseUrl: BASE_URL,
  getMenu: () => request<Menu>("/menu"),
  getCart: (sessionId: string) => request<Cart>(`/cart/${sessionId}`),
  addItem: (
    sessionId: string,
    body: { item_id: string; quantity?: number; modifiers?: string[]; size?: string; notes?: string },
  ) =>
    request<Cart>(`/cart/${sessionId}/items`, {
      method: "POST",
      body: JSON.stringify({ quantity: 1, ...body }),
    }),
  updateQuantity: (sessionId: string, lineId: string, quantity: number) =>
    request<Cart>(`/cart/${sessionId}/items/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  removeLine: (sessionId: string, lineId: string) =>
    request<Cart>(`/cart/${sessionId}/items/${lineId}`, { method: "DELETE" }),
  clearCart: (sessionId: string) => request<Cart>(`/cart/${sessionId}`, { method: "DELETE" }),
  chat: (sessionId: string, message: string, history: ChatMessage[]) =>
    request<ChatResponse>(`/chat/${sessionId}`, {
      method: "POST",
      body: JSON.stringify({
        message,
        history: history.map(({ role, content }) => ({ role, content })),
      }),
    }),

  chatStream(
    sessionId: string,
    message: string,
    history: ChatMessage[],
    handlers: ChatStreamHandlers,
  ): ChatStreamHandle {
    const url = `${BASE_URL}/chat/${sessionId}`;
    const body = JSON.stringify({
      message,
      history: history.map(({ role, content }) => ({ role, content })),
    });
    const es = new EventSource(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body,
    });

    const safeParse = (data: unknown): Record<string, unknown> | null => {
      if (typeof data !== "string") return null;
      try {
        return JSON.parse(data) as Record<string, unknown>;
      } catch {
        return null;
      }
    };

    es.addEventListener("open", () => {
      console.log("[sse] open");
    });
    es.addEventListener("delta", (e) => {
      const d = safeParse((e as { data?: unknown }).data);
      if (d && typeof d.text === "string") handlers.onDelta?.(d.text);
    });
    es.addEventListener("action", (e) => {
      const d = safeParse((e as { data?: unknown }).data);
      if (d && d.action) handlers.onAction?.(d.action as ExecutedAction);
    });
    es.addEventListener("suggestion", (e) => {
      const d = safeParse((e as { data?: unknown }).data);
      if (d && d.suggestion) handlers.onSuggestion?.(d.suggestion as Suggestion);
    });
    es.addEventListener("cart", (e) => {
      const d = safeParse((e as { data?: unknown }).data);
      if (d && d.cart) handlers.onCart?.(d.cart as Cart);
    });
    es.addEventListener("done", () => {
      console.log("[sse] done");
      handlers.onDone?.();
      es.close();
    });
    es.addEventListener("error", (e) => {
      const evt = e as { message?: string; type?: string; data?: unknown; xhrStatus?: number };
      const msg =
        evt.message ??
        (typeof evt.data === "string" ? evt.data : null) ??
        (evt.xhrStatus ? `HTTP ${evt.xhrStatus}` : "Stream error");
      console.warn("[sse] error", evt);
      handlers.onError?.(msg);
      es.close();
    });
    es.addEventListener("close", () => {
      console.log("[sse] close");
    });

    return { close: () => es.close() };
  },
};
