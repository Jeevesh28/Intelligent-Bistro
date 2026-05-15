export interface ModifierOption {
  name: string;
  price?: number;
}

export interface ModifierGroup {
  id: string;
  label: string;
  type: "single" | "multi";
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags?: string[];
  modifiers?: string[];
  modifierGroups?: ModifierGroup[];
  emoji?: string;
  accent?: [string, string];
  image?: string;
  longDescription?: string;
  ingredients?: string[];
  pairings?: string[];
  allergens?: string[];
  rating?: number;
  reviewCount?: number;
  reviews?: Review[];
}

export interface Review {
  name: string;
  stars: number;
  text: string;
  date?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Menu {
  restaurant: { name: string; tagline: string };
  categories: Category[];
  items: MenuItem[];
}

export interface CartLine {
  lineId: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];
  size?: string;
  notes?: string;
}

export interface Cart {
  sessionId: string;
  lines: CartLine[];
  subtotal: number;
  itemCount: number;
}

export type CartActionType =
  | { type: "add_item"; item_id: string; quantity: number; modifiers?: string[]; size?: string; notes?: string }
  | {
      type: "update_line";
      line_id: string;
      quantity?: number;
      modifiers?: string[];
      size?: string;
      notes?: string;
    }
  | { type: "remove_item"; line_id: string }
  | { type: "clear_cart" };

export interface ExecutedAction {
  action: CartActionType;
  ok: boolean;
  message: string;
}

export interface Suggestion {
  itemId: string;
  name: string;
  price: number;
  emoji?: string;
  reason: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: ExecutedAction[];
  suggestions?: Suggestion[];
  streaming?: boolean;
}

export interface ChatResponse {
  reply: string;
  cart: Cart;
  actions: ExecutedAction[];
  suggestions: Suggestion[];
}
