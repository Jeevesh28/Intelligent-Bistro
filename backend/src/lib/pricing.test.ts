import { describe, it, expect } from "vitest";
import type { ModifierGroup } from "../types.js";
import {
  SIZE_DELTAS,
  priceForSize,
  priceForModifiers,
  computeUnitPrice,
} from "./pricing.js";

describe("priceForSize", () => {
  it("returns base when no size is given", () => {
    expect(priceForSize(10)).toBe(10);
    expect(priceForSize(10, null)).toBe(10);
    expect(priceForSize(10, undefined)).toBe(10);
  });

  it("applies the small delta", () => {
    expect(priceForSize(10, "small")).toBe(10 + SIZE_DELTAS.small);
    expect(priceForSize(5, "small")).toBe(4);
  });

  it("keeps medium at base", () => {
    expect(priceForSize(10, "medium")).toBe(10);
  });

  it("applies the large delta", () => {
    expect(priceForSize(10, "large")).toBe(12);
  });

  it("ignores unknown sizes", () => {
    expect(priceForSize(10, "xxl" as never)).toBe(10);
  });

  it("never goes below zero", () => {
    expect(priceForSize(0.5, "small")).toBe(0);
  });
});

describe("priceForModifiers", () => {
  const sandwichGroups: ModifierGroup[] = [
    {
      id: "extras",
      label: "Customize",
      type: "multi",
      options: [
        { name: "no pickles" },
        { name: "add cheese", price: 1.0 },
        { name: "add bacon", price: 2.5 },
      ],
    },
  ];

  it("returns 0 with no modifier groups", () => {
    expect(priceForModifiers(undefined, ["add cheese"])).toBe(0);
  });

  it("returns 0 with no selected modifiers", () => {
    expect(priceForModifiers(sandwichGroups, undefined)).toBe(0);
    expect(priceForModifiers(sandwichGroups, [])).toBe(0);
  });

  it("ignores free options", () => {
    expect(priceForModifiers(sandwichGroups, ["no pickles"])).toBe(0);
  });

  it("sums priced options", () => {
    expect(priceForModifiers(sandwichGroups, ["add cheese", "add bacon"])).toBe(3.5);
  });

  it("ignores unknown options", () => {
    expect(priceForModifiers(sandwichGroups, ["add cheese", "extra everything"])).toBe(1.0);
  });

  it("supports negative deltas (e.g. half pint)", () => {
    const beer: ModifierGroup[] = [
      {
        id: "pour",
        label: "Pour",
        type: "single",
        options: [
          { name: "half pint", price: -3 },
          { name: "pint" },
        ],
      },
    ];
    expect(priceForModifiers(beer, ["half pint"])).toBe(-3);
  });
});

describe("computeUnitPrice", () => {
  const drinkGroups: ModifierGroup[] = [
    {
      id: "milk",
      label: "Milk",
      type: "single",
      options: [{ name: "whole milk" }, { name: "oat milk" }, { name: "almond milk" }],
    },
  ];

  it("composes size + modifier deltas on top of base", () => {
    // Large cappuccino with oat milk (oat milk is free here): 5 + 2 + 0 = 7
    expect(computeUnitPrice(5, "large", ["oat milk"], drinkGroups)).toBe(7);
  });

  it("never returns negative", () => {
    expect(computeUnitPrice(0.5, "small", [], undefined)).toBe(0);
  });

  it("handles all undefined gracefully", () => {
    expect(computeUnitPrice(12, undefined, undefined, undefined)).toBe(12);
  });

  it("rounds to 2 decimals", () => {
    // Use a known-irrational-looking base; verify clean rounding.
    expect(computeUnitPrice(9.99, "medium", [], undefined)).toBe(9.99);
  });
});
