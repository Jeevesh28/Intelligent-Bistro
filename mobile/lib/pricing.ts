import type { ModifierGroup } from "./types";

/**
 * Mirror of backend/src/lib/pricing.ts — keep in sync.
 * Drink-size pricing: small = base − $1, medium = base, large = base + $2.
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

/**
 * Returns the group id that the given modifier name belongs to, or null if
 * it's free-floating (multi-select by default).
 */
export function groupForModifier(
  groups: ModifierGroup[] | undefined,
  name: string,
): ModifierGroup | null {
  if (!groups) return null;
  for (const g of groups) {
    if (g.options.some((o) => o.name === name)) return g;
  }
  return null;
}
