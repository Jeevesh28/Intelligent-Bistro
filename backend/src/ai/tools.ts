import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages.js";
import type { CartActionType } from "../types.js";

export const addItemSchema = z.object({
  item_id: z.string(),
  quantity: z.number().int().min(1).default(1),
  modifiers: z.array(z.string()).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  notes: z.string().optional(),
});

export const updateLineSchema = z.object({
  line_id: z.string(),
  quantity: z.number().int().min(0).optional(),
  modifiers: z.array(z.string()).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  notes: z.string().optional(),
});

export const removeItemSchema = z.object({
  line_id: z.string(),
});

export const clearCartSchema = z.object({});

export const suggestAddonSchema = z.object({
  item_id: z.string(),
  reason: z.string().max(80),
});

export const tools: Tool[] = [
  {
    name: "add_item",
    description:
      "Add a menu item to the cart. Use the exact item_id from the menu. quantity defaults to 1. modifiers are free-form strings the kitchen will see (e.g., 'extra spicy', 'no pickles', 'medium rare'). size applies to drinks.",
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "Exact menu item id (e.g., 'spicy-chicken-sandwich')." },
        quantity: { type: "integer", minimum: 1, description: "How many of this item to add. Defaults to 1." },
        modifiers: {
          type: "array",
          items: { type: "string" },
          description: "Customizations from the item's allowed modifiers list, or free-form kitchen notes.",
        },
        size: { type: "string", enum: ["small", "medium", "large"], description: "Drink size, if applicable." },
        notes: { type: "string", description: "Short note for the kitchen." },
      },
      required: ["item_id"],
    },
  },
  {
    name: "update_line",
    description:
      "Modify an existing cart line in place: change quantity, size, modifiers, or kitchen notes. Provide ONLY the fields you want to change — omit the rest. Use this for any 'change/modify/swap/make it ___' request on an item already in the cart (e.g., 'make that a large', 'add extra spicy', 'change to medium rare', 'make it two'). Set quantity to 0 to remove the line. Always prefer this over remove + re-add.",
    input_schema: {
      type: "object",
      properties: {
        line_id: { type: "string", description: "The lineId from the current cart snapshot." },
        quantity: { type: "integer", minimum: 0, description: "New quantity. Set to 0 to remove the line." },
        size: { type: "string", enum: ["small", "medium", "large"], description: "Change drink size." },
        modifiers: {
          type: "array",
          items: { type: "string" },
          description:
            "REPLACES the line's modifiers entirely with this list. To 'add extra spicy', include the existing modifiers plus 'extra spicy'.",
        },
        notes: { type: "string", description: "Update the kitchen note." },
      },
      required: ["line_id"],
    },
  },
  {
    name: "remove_item",
    description: "Remove a line from the cart entirely. Use the line_id from the current cart snapshot.",
    input_schema: {
      type: "object",
      properties: {
        line_id: { type: "string" },
      },
      required: ["line_id"],
    },
  },
  {
    name: "clear_cart",
    description: "Empty the entire cart. Only use when the user clearly asks to start over.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "suggest_addon",
    description:
      "Suggest ONE complementary item the guest might enjoy alongside what's already in their cart. Does NOT add anything — the guest sees a chip with the suggestion and decides. Use sparingly: at most ONCE per turn, and only when a clearly natural pairing exists (e.g. wine with steak, fries with burger). Don't suggest items already in the cart. Pull from the item's `pairings` field when possible.",
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "Exact menu item id to suggest." },
        reason: {
          type: "string",
          description: "Short, warm reason (≤ 80 chars). E.g. 'Pairs beautifully with the ribeye.'",
        },
      },
      required: ["item_id", "reason"],
    },
  },
];

export function parseToolInput(name: string, input: unknown): CartActionType | { error: string } {
  try {
    if (name === "add_item") {
      const v = addItemSchema.parse(input);
      return { type: "add_item", ...v };
    }
    if (name === "update_line") {
      const v = updateLineSchema.parse(input);
      return { type: "update_line", ...v };
    }
    if (name === "remove_item") {
      const v = removeItemSchema.parse(input);
      return { type: "remove_item", ...v };
    }
    if (name === "clear_cart") {
      clearCartSchema.parse(input);
      return { type: "clear_cart" };
    }
    return { error: `Unknown tool: ${name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ParsedSuggestion {
  item_id: string;
  reason: string;
}

export function parseSuggestion(input: unknown): ParsedSuggestion | { error: string } {
  try {
    return suggestAddonSchema.parse(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
