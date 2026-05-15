import type { MenuItem } from "./types";

export type FilterId = "favorites" | "popular" | "vegetarian" | "vegan" | "spicy" | "gluten-free";

export interface FilterDef {
  id: FilterId;
  label: string;
  emoji: string;
  match: (item: MenuItem) => boolean;
}

export const FILTERS: FilterDef[] = [
  {
    id: "favorites",
    label: "Favorites",
    emoji: "❤️",
    // Favorites are evaluated separately (need access to the store).
    // This `match` is a placeholder; the menu screen short-circuits this id.
    match: () => true,
  },
  {
    id: "popular",
    label: "Popular",
    emoji: "⭐",
    match: (i) => i.tags?.includes("popular") ?? false,
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    emoji: "🌿",
    match: (i) =>
      i.tags?.some((t) => t === "vegetarian" || t === "vegan" || t === "vegetarian-option") ??
      false,
  },
  {
    id: "vegan",
    label: "Vegan",
    emoji: "🌱",
    match: (i) => i.tags?.includes("vegan") ?? false,
  },
  {
    id: "spicy",
    label: "Spicy",
    emoji: "🌶️",
    match: (i) => i.tags?.includes("spicy") ?? false,
  },
  {
    id: "gluten-free",
    label: "Gluten-free",
    emoji: "🌾",
    match: (i) =>
      i.tags?.some((t) => t === "gluten-free" || t === "gluten-free-option") ?? false,
  },
];

export function applyFilters(
  items: MenuItem[],
  active: FilterId[],
  favoriteIds?: Set<string>,
): MenuItem[] {
  if (active.length === 0) return items;
  return items.filter((item) =>
    active.every((id) => {
      if (id === "favorites") {
        return favoriteIds ? favoriteIds.has(item.id) : false;
      }
      const def = FILTERS.find((f) => f.id === id);
      return def ? def.match(item) : true;
    }),
  );
}
