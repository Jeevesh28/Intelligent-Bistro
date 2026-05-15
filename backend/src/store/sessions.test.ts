import { describe, it, expect } from "vitest";
import { applyCartAction, getOrCreateCart } from "./sessions.js";
import { randomUUID } from "node:crypto";

// Each test uses a fresh sessionId so they don't share state.
function newSession() {
  return `test-${randomUUID()}`;
}

describe("applyCartAction — add_item", () => {
  it("adds a line with the item's base price when no size or modifiers", () => {
    const s = newSession();
    const r = applyCartAction(s, { type: "add_item", item_id: "burrata", quantity: 1 });
    expect(r.ok).toBe(true);
    const cart = getOrCreateCart(s);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].name).toBe("Burrata");
    expect(cart.lines[0].price).toBe(16); // base
    expect(cart.itemCount).toBe(1);
  });

  it("rejects unknown items", () => {
    const s = newSession();
    const r = applyCartAction(s, { type: "add_item", item_id: "foie-gras", quantity: 1 });
    expect(r.ok).toBe(false);
    expect(getOrCreateCart(s).lines).toHaveLength(0);
  });

  it("merges an identical line (same item, no size, no modifiers)", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "burrata", quantity: 1 });
    applyCartAction(s, { type: "add_item", item_id: "burrata", quantity: 2 });
    const cart = getOrCreateCart(s);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
  });

  it("does NOT merge when size differs", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "iced-tea", quantity: 1, size: "small" });
    applyCartAction(s, { type: "add_item", item_id: "iced-tea", quantity: 1, size: "large" });
    const cart = getOrCreateCart(s);
    expect(cart.lines).toHaveLength(2);
  });

  it("prices size-modified lines (large iced tea = base + $2)", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "iced-tea", quantity: 1, size: "large" });
    const cart = getOrCreateCart(s);
    expect(cart.lines[0].price).toBe(7); // iced-tea base $5 + $2 = $7
  });

  it("prices modifier add-ons (Caesar + chicken = base + $5)", () => {
    const s = newSession();
    applyCartAction(s, {
      type: "add_item",
      item_id: "caesar-salad",
      quantity: 1,
      modifiers: ["add chicken"],
    });
    const cart = getOrCreateCart(s);
    expect(cart.lines[0].price).toBe(18); // caesar $13 + $5
  });
});

describe("applyCartAction — update_line", () => {
  it("re-prices the line when size changes", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "iced-tea", quantity: 1, size: "medium" });
    const lineId = getOrCreateCart(s).lines[0].lineId;

    applyCartAction(s, { type: "update_line", line_id: lineId, size: "large" });
    const cart = getOrCreateCart(s);
    expect(cart.lines[0].price).toBe(7); // $5 + $2
    expect(cart.lines[0].size).toBe("large");
  });

  it("re-prices when modifiers change (add chicken on Caesar adds $5)", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "caesar-salad", quantity: 1 });
    const lineId = getOrCreateCart(s).lines[0].lineId;

    applyCartAction(s, {
      type: "update_line",
      line_id: lineId,
      modifiers: ["add chicken"],
    });
    const cart = getOrCreateCart(s);
    expect(cart.lines[0].price).toBe(18); // $13 + $5
  });

  it("removes the line when quantity is set to 0", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "burrata", quantity: 2 });
    const lineId = getOrCreateCart(s).lines[0].lineId;

    applyCartAction(s, { type: "update_line", line_id: lineId, quantity: 0 });
    expect(getOrCreateCart(s).lines).toHaveLength(0);
  });

  it("changes quantity without affecting price", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "burrata", quantity: 1 });
    const lineId = getOrCreateCart(s).lines[0].lineId;

    applyCartAction(s, { type: "update_line", line_id: lineId, quantity: 5 });
    const cart = getOrCreateCart(s);
    expect(cart.lines[0].quantity).toBe(5);
    expect(cart.lines[0].price).toBe(16); // still base
    expect(cart.subtotal).toBe(80);
  });
});

describe("applyCartAction — remove_item & clear_cart", () => {
  it("removes a specific line", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "burrata", quantity: 1 });
    applyCartAction(s, { type: "add_item", item_id: "caesar-salad", quantity: 1 });
    const cart = getOrCreateCart(s);
    expect(cart.lines).toHaveLength(2);
    const target = cart.lines[0].lineId;

    applyCartAction(s, { type: "remove_item", line_id: target });
    const after = getOrCreateCart(s);
    expect(after.lines).toHaveLength(1);
    expect(after.lines[0].name).toBe("Caesar Salad");
  });

  it("clears the entire cart", () => {
    const s = newSession();
    applyCartAction(s, { type: "add_item", item_id: "burrata", quantity: 1 });
    applyCartAction(s, { type: "add_item", item_id: "caesar-salad", quantity: 1 });
    applyCartAction(s, { type: "clear_cart" });
    const cart = getOrCreateCart(s);
    expect(cart.lines).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
    expect(cart.itemCount).toBe(0);
  });
});

describe("applyCartAction — subtotal math", () => {
  it("subtotal reflects size + modifier deltas across multiple lines", () => {
    const s = newSession();
    // Large iced tea: $7
    applyCartAction(s, { type: "add_item", item_id: "iced-tea", quantity: 1, size: "large" });
    // Caesar with chicken: $18
    applyCartAction(s, {
      type: "add_item",
      item_id: "caesar-salad",
      quantity: 1,
      modifiers: ["add chicken"],
    });
    const cart = getOrCreateCart(s);
    expect(cart.subtotal).toBe(25);
    expect(cart.itemCount).toBe(2);
  });
});
