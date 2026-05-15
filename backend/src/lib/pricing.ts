import type { ModifierGroup } from "../types.js";

/**
 * Flat per-size price deltas applied on top of an item's base price.
 * Base price = medium (the "default" drink).
 *   small  → −$1.00
 *   medium →  base
 *   large  → +$2.00
 */
export const SIZE_DELTAS: Record<string, number> = {
  small: -1.0,
  medium: 0,
  large: 2.0,
};

export function priceForSize(base: number, size?: string | null): number {
  if (!size) return base;
  const delta = SIZE_DELTAS[size] ?? 0;
  return Math.max(0, Math.round((base + delta) * 100) / 100);
}

/**
 * Sum the price deltas of any selected modifiers that belong to the item's
 * modifierGroups. Modifiers not found in any group are treated as $0.
 */
export function priceForModifiers(
  groups: ModifierGroup[] | undefined,
  selected: string[] | undefined,
): number {
  if (!groups || !selected || selected.length === 0) return 0;
  let total = 0;
  for (const name of selected) {
    for (const g of groups) {
      const opt = g.options.find((o) => o.name === name);
      if (opt && typeof opt.price === "number") {
        total += opt.price;
        break;
      }
    }
  }
  return Math.round(total * 100) / 100;
}

/**
 * Final unit price for a cart line: base + size delta + modifier deltas.
 */
export function computeUnitPrice(
  base: number,
  size: string | undefined | null,
  modifiers: string[] | undefined,
  modifierGroups: ModifierGroup[] | undefined,
): number {
  const sized = priceForSize(base, size);
  const mods = priceForModifiers(modifierGroups, modifiers);
  return Math.max(0, Math.round((sized + mods) * 100) / 100);
}
