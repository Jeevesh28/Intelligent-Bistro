import { describe, it, expect } from "vitest";
import { parseToolInput, parseSuggestion } from "./tools.js";

describe("parseToolInput — add_item", () => {
  it("accepts a valid add_item shape", () => {
    const r = parseToolInput("add_item", { item_id: "burrata", quantity: 2 });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.type).toBe("add_item");
      expect(r.item_id).toBe("burrata");
      expect(r.quantity).toBe(2);
    }
  });

  it("defaults quantity to 1 when omitted", () => {
    const r = parseToolInput("add_item", { item_id: "burrata" });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.quantity).toBe(1);
    }
  });

  it("accepts size + modifiers + notes", () => {
    const r = parseToolInput("add_item", {
      item_id: "iced-tea",
      quantity: 1,
      size: "large",
      modifiers: ["sweet"],
      notes: "extra lemon",
    });
    expect("error" in r).toBe(false);
    if (!("error" in r) && r.type === "add_item") {
      expect(r.size).toBe("large");
      expect(r.modifiers).toEqual(["sweet"]);
      expect(r.notes).toBe("extra lemon");
    }
  });

  it("rejects missing item_id", () => {
    const r = parseToolInput("add_item", { quantity: 1 });
    expect("error" in r).toBe(true);
  });

  it("rejects an invalid size enum", () => {
    const r = parseToolInput("add_item", { item_id: "iced-tea", size: "huge" });
    expect("error" in r).toBe(true);
  });

  it("rejects quantity < 1", () => {
    const r = parseToolInput("add_item", { item_id: "burrata", quantity: 0 });
    expect("error" in r).toBe(true);
  });
});

describe("parseToolInput — update_line", () => {
  it("accepts a quantity update", () => {
    const r = parseToolInput("update_line", { line_id: "abc", quantity: 3 });
    expect("error" in r).toBe(false);
  });

  it("accepts size/modifier-only updates", () => {
    const r = parseToolInput("update_line", { line_id: "abc", size: "large" });
    expect("error" in r).toBe(false);
  });

  it("rejects missing line_id", () => {
    const r = parseToolInput("update_line", { quantity: 2 });
    expect("error" in r).toBe(true);
  });

  it("accepts quantity = 0 (remove)", () => {
    const r = parseToolInput("update_line", { line_id: "abc", quantity: 0 });
    expect("error" in r).toBe(false);
  });
});

describe("parseToolInput — remove_item & clear_cart", () => {
  it("parses remove_item", () => {
    const r = parseToolInput("remove_item", { line_id: "abc" });
    expect("error" in r).toBe(false);
  });

  it("parses clear_cart with empty input", () => {
    const r = parseToolInput("clear_cart", {});
    expect("error" in r).toBe(false);
  });

  it("rejects unknown tool names", () => {
    const r = parseToolInput("nuke_kitchen", {});
    expect("error" in r).toBe(true);
  });
});

describe("parseSuggestion", () => {
  it("accepts a valid suggestion", () => {
    const r = parseSuggestion({ item_id: "red-wine", reason: "Pairs great with the ribeye" });
    expect("error" in r).toBe(false);
  });

  it("rejects an over-long reason (> 80 chars)", () => {
    const long = "a".repeat(81);
    const r = parseSuggestion({ item_id: "red-wine", reason: long });
    expect("error" in r).toBe(true);
  });

  it("rejects missing item_id", () => {
    const r = parseSuggestion({ reason: "good pairing" });
    expect("error" in r).toBe(true);
  });
});
