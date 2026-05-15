import type { MenuItem } from "./types";

export function searchItems(items: MenuItem[], query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const terms = q.split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.description,
      item.category,
      (item.ingredients ?? []).join(" "),
      (item.tags ?? []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
