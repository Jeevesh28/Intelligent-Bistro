import { randomUUID } from "node:crypto";
import type { Cart, CartActionType, CartLine, ExecutedAction, Menu, MenuItem, Review } from "../types.js";
import menuData from "../data/menu.json" with { type: "json" };
import reviewsData from "../data/reviews.json" with { type: "json" };
import { computeUnitPrice } from "../lib/pricing.js";

interface ReviewEntry {
  rating: number;
  reviewCount: number;
  reviews: Review[];
}
const reviewsById = reviewsData as Record<string, ReviewEntry>;

const rawMenu = menuData as Menu;
const menu: Menu = {
  ...rawMenu,
  items: rawMenu.items.map((item) => {
    const r = reviewsById[item.id];
    return r
      ? { ...item, rating: r.rating, reviewCount: r.reviewCount, reviews: r.reviews }
      : item;
  }),
};
const itemsById = new Map<string, MenuItem>(menu.items.map((i) => [i.id, i]));

const carts = new Map<string, Cart>();

function emptyCart(sessionId: string): Cart {
  return { sessionId, lines: [], subtotal: 0, itemCount: 0 };
}

function recompute(cart: Cart): Cart {
  let subtotal = 0;
  let itemCount = 0;
  for (const line of cart.lines) {
    subtotal += line.price * line.quantity;
    itemCount += line.quantity;
  }
  cart.subtotal = Math.round(subtotal * 100) / 100;
  cart.itemCount = itemCount;
  return cart;
}

export function getOrCreateCart(sessionId: string): Cart {
  let cart = carts.get(sessionId);
  if (!cart) {
    cart = emptyCart(sessionId);
    carts.set(sessionId, cart);
  }
  return cart;
}

function findMergeableLine(cart: Cart, itemId: string, modifiers: string[] | undefined, size: string | undefined): CartLine | undefined {
  const modKey = (modifiers ?? []).slice().sort().join("|");
  return cart.lines.find((l) => {
    const lineModKey = (l.modifiers ?? []).slice().sort().join("|");
    return l.itemId === itemId && lineModKey === modKey && (l.size ?? "") === (size ?? "");
  });
}

export function applyCartAction(sessionId: string, action: CartActionType): ExecutedAction {
  const cart = getOrCreateCart(sessionId);

  if (action.type === "add_item") {
    const item = itemsById.get(action.item_id);
    if (!item) {
      return { action, ok: false, message: `Item "${action.item_id}" not on menu.` };
    }
    const quantity = Math.max(1, Math.floor(action.quantity || 1));
    const unitPrice = computeUnitPrice(
      item.price,
      action.size,
      action.modifiers,
      item.modifierGroups,
    );
    const existing = findMergeableLine(cart, item.id, action.modifiers, action.size);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.lines.push({
        lineId: randomUUID(),
        itemId: item.id,
        name: item.name,
        price: unitPrice,
        quantity,
        modifiers: action.modifiers,
        size: action.size,
        notes: action.notes,
      });
    }
    recompute(cart);
    return { action, ok: true, message: `Added ${quantity}× ${item.name}.` };
  }

  if (action.type === "update_line") {
    const line = cart.lines.find((l) => l.lineId === action.line_id);
    if (!line) {
      return { action, ok: false, message: `Line not found.` };
    }
    if (action.quantity !== undefined && action.quantity <= 0) {
      cart.lines = cart.lines.filter((l) => l.lineId !== action.line_id);
      recompute(cart);
      return { action, ok: true, message: `Removed ${line.name}.` };
    }
    const changes: string[] = [];
    if (action.quantity !== undefined && action.quantity !== line.quantity) {
      line.quantity = Math.floor(action.quantity);
      changes.push(`qty ${line.quantity}`);
    }
    if (action.size !== undefined && action.size !== line.size) {
      line.size = action.size;
      changes.push(action.size);
    }
    if (action.modifiers !== undefined) {
      line.modifiers = action.modifiers;
      changes.push(action.modifiers.length ? action.modifiers.join(", ") : "no modifiers");
    }
    // Re-price the line whenever size OR modifiers changed.
    if (action.size !== undefined || action.modifiers !== undefined) {
      const item = itemsById.get(line.itemId);
      if (item) {
        line.price = computeUnitPrice(item.price, line.size, line.modifiers, item.modifierGroups);
      }
    }
    if (action.notes !== undefined) {
      line.notes = action.notes;
    }
    recompute(cart);
    return {
      action,
      ok: true,
      message: changes.length
        ? `Updated ${line.name} (${changes.join("; ")}).`
        : `Updated ${line.name}.`,
    };
  }

  if (action.type === "remove_item") {
    const line = cart.lines.find((l) => l.lineId === action.line_id);
    if (!line) return { action, ok: false, message: "Line not found." };
    cart.lines = cart.lines.filter((l) => l.lineId !== action.line_id);
    recompute(cart);
    return { action, ok: true, message: `Removed ${line.name}.` };
  }

  if (action.type === "clear_cart") {
    cart.lines = [];
    recompute(cart);
    return { action, ok: true, message: "Cart cleared." };
  }

  return { action, ok: false, message: "Unknown action." };
}

export function clearCart(sessionId: string): Cart {
  const cart = getOrCreateCart(sessionId);
  cart.lines = [];
  recompute(cart);
  return cart;
}

export { menu };
