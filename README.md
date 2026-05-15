# The Intelligent Bistro

A high-fidelity mobile restaurant ordering app where guests browse a 33-item menu and manage a cart through a conversational AI assistant.

The AI parses natural-language orders like *"two spicy chicken sandwiches, a Caesar with chicken, swap the fries for truffle fries, and a large iced tea"* into structured `tool_use` calls that mutate a **server-side cart** in real time. Both UI taps and AI calls route through the **same** internal `applyCartAction()` — so the cart never diverges from what the assistant thinks it is.

---

## Contents

1. [Demo](#demo) · [Quick start](#quick-start)
2. [User functionality](#user-functionality)
3. [UI experience & usability](#ui-experience--usability)
4. [AI-driven cart interactions](#ai-driven-cart-interactions)
5. [Architecture](#architecture) · [Key engineering decisions](#key-engineering-decisions)
6. [Project structure](#project-structure)
7. [Tests & verification tools](#tests--verification-tools)
8. [Improvements intentionally not done](#improvements-intentionally-not-done)
9. [AI tooling used to build it](#ai-tooling-used-to-build-it)

---

## Demo

> Loom:

---

## Quick start

Prereqs: Node 20+, an Anthropic API key, and either Expo Go on a phone (SDK 54) or Xcode iOS Simulator.

```bash
# Backend
cd backend && npm install
cp .env.example .env                # set ANTHROPIC_API_KEY=sk-ant-...
npm run dev                         # http://0.0.0.0:3000 (LAN-reachable)

# Mobile (new terminal)
cd mobile && npm install
cp .env.example .env                # set EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000
npx expo start                      # press 'i' for sim, or scan QR

# Tests
cd backend && npm test              # 45 vitest specs in ~400ms
```

Find your LAN IP on macOS: `ipconfig getifaddr en0`.

---

## User functionality

**Browse** — 33 dishes across 7 categories. Search by name/ingredient. Multi-select filters (Popular, Vegetarian, Vegan, Spicy, Gluten-free, ❤ Favorites). Per-card star rating + count. Category pills with bidirectional scrollspy (tap to scroll · scroll to highlight).

**Item detail** — image with emoji-gradient fallback, chef's note, ingredients, allergens, 2 reviews. Modifier groups with single/multi semantics (no two milks; pick any extras). Drink size selector showing live price `(small -$1, medium, large +$2)`. Quantity stepper. "Pairs well with" cards that navigate to the partner dish. Live CTA `Add 2 to order · $42.00`.

**Cart** — line items with stepper + swipe-to-trash. Live subtotal, item count, sticky checkout CTA.

**Checkout** — three payment tabs (Card with brand auto-detection, Venmo handle, Cash). Tip presets + custom field. Itemized totals.

**Confirmation** — animated 4-stage progress: **Placed → In the kitchen → Plating → Ready**. Live countdown. Confetti at Ready. Order pushed to local history.

**Past orders & reorder** — clock icon in the header (visible only when history exists). One-tap reorder clears the current cart and re-adds every line.

**AI assistant** — Add / Modify / Remove / Inquire / Clear / out-of-menu lookups. Action chips confirm each tool call. Pairing chips suggest 1-tap upsells. **Long-press any action chip** → "What the AI did" inspector showing the raw tool JSON.

---

## UI experience & usability

**Visual system** — NativeWind (Tailwind for RN) with a warm restaurant palette (cream neutrals, forest primary, terracotta accents, ink text). Fraunces serif for headers + prices, Inter sans for body. Every screen has deliberate empty / loading / error states.

**Motion** — Moti + Reanimated 4. Cards stagger-fade in. Mini-cart springs in when cart goes empty→non-empty and **bounces on every add** (including AI-driven ones). Cart badge pulses on count change. Order-progress fills smoothly. 22-piece confetti at Ready.

**Loading & refresh** — Shimmering skeleton cards (not a spinner) during menu fetch. Pull-to-refresh with a native forest-green spinner.

**Touch & haptics** — `expo-haptics` for tactile feedback, wrapped in a helper that no-ops on web.

---

## AI-driven cart interactions

### Tools the AI can call

Defined in [backend/src/ai/tools.ts](backend/src/ai/tools.ts), validated with Zod, executed in [claude.ts](backend/src/ai/claude.ts):

| Tool | Purpose |
|---|---|
| `add_item` | Add a new line (item_id, quantity, modifiers?, size?, notes?) |
| `update_line` | Modify qty/size/modifiers on an existing line (re-prices automatically) |
| `remove_item` | Drop a line |
| `clear_cart` | Start over |
| `suggest_addon` | **Doesn't mutate** — surfaces as a 1-tap upsell chip in the UI |

### One chat turn end-to-end

```
User: "Two spicy chicken sandwiches and a large iced tea"
  │
  ▼  POST /chat/:sessionId
runChat (claude.ts, up to 5 rounds):
  Round 1: Claude emits 2× tool_use { add_item } → backend executes both
           → tool_result blocks fed back
  Round 2: Claude emits text + optional tool_use { suggest_addon }
  ▼
{ reply, actions[], suggestions[], cart }
  │
  ▼
Frontend: chat bubble + green ✓ action chips + 1-tap upsell pill
          cartStore.setCart(cart) → mini-cart bounces, badge updates
```

### What makes the AI feel competent

System prompt ([systemPrompt.ts](backend/src/ai/systemPrompt.ts)) is sectioned and explicit:
- **CART CHANGES** — must call a tool; batch tools in one turn (no chit-chat between).
- **CONTEXTUAL REFERENCES** — resolve "that", "it", "make it a large" via the cart snapshot injected each turn.
- **OFFER PAIRINGS** — `suggest_addon` at most once per turn, only when the just-added item has a `pairings` entry and that pair isn't already in cart.
- **DRINK SIZES & PRICING** — explicit S/M/L deltas; mention non-medium size in confirmation.
- **MODIFIER GROUPS** — `[single]/[multi]` markers + inline `+$X` deltas in the rendered menu, so the model can't invent options or hallucinate prices.
- **OUT-OF-MENU REQUESTS** — 14 example mappings (sushi → Tuna Tartare, pizza → Margherita, water → Iced Tea / Lemonade, ice cream → Apple Pie, breakfast → "not serving tonight, suggest something light"). Always pair the *no* with a named alternative + one-line why + ask before adding.

### Reliability: nothing is trusted

- **Zod** validates every tool input before it touches state.
- Unknown `item_id` → error returned to Claude as `tool_result { is_error: true }`, so it can self-correct in the next round.
- `update_line` re-prices the line whenever size or modifiers change — the AI never computes prices; the backend re-derives.
- `suggest_addon` is rejected if the item is already in cart or doesn't exist.

### The AI Inspector

Long-press any green action chip in chat → bottom-sheet showing the tool name, a friendly description, an OK/Error pill, each parameter Claude emitted, and the raw JSON in a Menlo code block. The caption — *"every cart change in this app flows through the same applyCartAction function"* — is the architectural insight a reviewer wants to see.

---

## Architecture

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Mobile (Expo Router + RN)   │         │  Backend (Express + TS)      │
│                              │         │                              │
│  Screens: menu / item / cart │ ◀ JSON ▶│  Routes: /menu /cart /chat   │
│   chat / checkout / confirm  │         │                              │
│   orders                     │         │  applyCartAction(sid, act)   │
│                              │         │   ▲                          │
│  Zustand: cart, chat,        │         │   └─ shared by UI routes     │
│   orders, favorites          │         │      AND AI tool execution   │
│   (orders/favorites          │         │                              │
│    persisted via             │         │  AI loop (claude.ts):        │
│    AsyncStorage)             │         │   @anthropic-ai/sdk@0.96     │
│                              │         │   Claude haiku-4-5           │
│  TanStack Query for /menu    │         │   ≤5 tool-use rounds         │
│  NativeWind 4.2 styling      │         │                              │
│  Moti + Reanimated 4 anims   │         │  Zod on every tool input     │
│                              │         │  Pricing: priceForSize +     │
│                              │         │   priceForModifiers          │
└──────────────────────────────┘         └──────────────────────────────┘
```

---

## Key engineering decisions

**One source of truth for the cart.** Both UI mutations and AI tool calls funnel through `applyCartAction(sessionId, action)` in [sessions.ts](backend/src/store/sessions.ts). The frontend never edits cart shape locally — every change round-trips and returns the new server-side cart. Zero drift between what Claude thinks the cart looks like and what the user sees.

**Server-side pricing math.** `priceForSize` + `priceForModifiers` + `computeUnitPrice` in [pricing.ts](backend/src/lib/pricing.ts) are the only places a price is calculated. The AI never computes prices — the backend re-derives them from the item's base + size delta + modifier deltas. Mirror in [mobile/lib/pricing.ts](mobile/lib/pricing.ts) exists only for live preview on the item-detail CTA; the cart line is whatever the server says.

**Modifier groups, not flat strings.** Started with `modifiers: string[]`, broke down once we needed mutual exclusivity ("no two milks") and priced add-ons ("+$5 add chicken"). Replaced with:
```ts
ModifierGroup = { id, label, type: "single" | "multi", options: { name, price? }[] }
```
UI enforces single-select by deselecting siblings. AI sees `[single]/[multi]` markers + price deltas inline in the prompt.

**Why JSON, not streaming SSE.** Streaming was attempted twice (`@anthropic-ai/sdk` 0.32 then 0.96). The SDK works; the latency profile doesn't help streaming. For "dinner for two", Claude generates ~10 `tool_use` blocks before any text — with streaming, the user sees an empty bubble with a cursor for ~4s; with JSON, a typing indicator for the same window then chips appear together. Latter reads snappier on a demo phone. Streaming code is preserved (`runChatStream` + `api.chatStream` + `react-native-sse`), gated behind a route switch — flipping it on is a 2-line change. Honest tradeoff over hidden code.

**Why Claude haiku-4-5.** Fast TTFB (~700ms), strong tool use, ~1/4 the cost of Sonnet. System prompt is ~6KB; per-turn cost is negligible at this scale.

**Backend binds to `0.0.0.0`.** Explicit in [index.ts](backend/src/index.ts) so a phone on the same LAN can reach the dev server without tunneling.

**Sessions without auth.** Each device generates a UUID v4 in AsyncStorage on first launch. That's the `sessionId`. No login — sufficient for a single-user take-home; production would attach to a user account.

---

## Project structure

```
backend/
├── src/
│   ├── index.ts                # Express bootstrap, binds 0.0.0.0:3000
│   ├── routes/                 # menu, cart, chat
│   ├── ai/
│   │   ├── claude.ts           # runChat + tool-use loop
│   │   ├── tools.ts            # Tool[] for SDK + Zod parsers
│   │   └── systemPrompt.ts     # persona + behavior rules + menu injection
│   ├── store/sessions.ts       # Map<sessionId, Cart> + applyCartAction
│   ├── lib/pricing.ts          # priceForSize, priceForModifiers, computeUnitPrice
│   ├── data/
│   │   ├── menu.json           # 33 items × 7 categories with modifierGroups
│   │   └── reviews.json        # mock reviews keyed by item id
│   ├── *.test.ts               # 45 vitest specs
│   └── types.ts
└── vitest.config.ts

mobile/
├── app/                        # Expo Router screens (file-based)
│   ├── _layout.tsx             # providers + font loading + store hydration
│   ├── index.tsx               # menu (SectionList + scrollspy + filters + search)
│   ├── item/[id].tsx           # details
│   ├── cart.tsx · chat.tsx · checkout.tsx · confirmation.tsx · orders.tsx
├── components/                 # MenuItemCard, ChatBubble, ActionInspector,
│                               # OrderProgress, MiniCart, HeartButton, ...
├── store/                      # Zustand: cart, chat, orders, favorites
├── lib/                        # api, types, pricing mirror, search, filters,
│                               # session, haptics
└── tailwind.config.js

tools/
└── menu-preview.html           # in-browser image verifier
```

---

## Tests & verification tools

**Unit tests** — `cd backend && npm test`. 45 vitest specs in ~400ms:

```
✓ src/lib/pricing.test.ts        (16 tests)
✓ src/store/sessions.test.ts     (13 tests)
✓ src/ai/tools.test.ts           (16 tests)
```

Covers `priceForSize` (S/M/L deltas, zero floor, unknown size), `priceForModifiers` (priced + free + negative deltas), `computeUnitPrice`, `applyCartAction` for every action type including line-merging by `itemId+modifiers+size` and re-pricing on `update_line`, `parseToolInput` valid/invalid shapes, `parseSuggestion` reason-length enforcement.

**Menu-preview image verifier** — [tools/menu-preview.html](tools/menu-preview.html). Open in any browser while the backend is running. It fetches `/menu`, renders every dish with photo + dimensions + URL, flags 404s with a red "load failed" badge, and lets you mark any image as "Wrong" for a copy-pasteable replacement list. Built because hand-curating 33 image URLs is error-prone — turned a 30-minute audit into ~5 minutes.

**Smoke prompts for the AI**

| Prompt | What it should do |
|---|---|
| `Build me dinner for two under $60` | Batch tool calls in one turn |
| `Make it medium rare` | Contextual reference → `update_line` |
| `Actually make that two` | `update_line` quantity on most recent line |
| `What's good and vegetarian?` | Plain text reply, no tool call |
| `Got any sushi?` | Out-of-menu → Tuna Tartare suggestion |
| `Add a ribeye and a glass of red` | After add, a 🍷 pairing chip may surface |
| `Clear my cart` | `clear_cart` |

---

## Improvements intentionally not done

Each with *why not* so a reviewer doesn't wonder.

**No real database.** A `Map<sessionId, Cart>` in process is sufficient to demo the AI/cart loop. Cart clears on backend restart (favorites + orders persist on-device). Stub-ready for SQLite — `applyCartAction` is the only surface that needs to change.

**No streaming chat.** Documented in [Key decisions](#key-engineering-decisions) above — latency profile for tool-heavy responses doesn't help streaming. Code path exists, gated.

**No voice ordering.** Would require either a Dev Build (`expo-speech-recognition`, ~15 min one-time setup) or backend Whisper. Out of scope for the Expo-Go-only constraint.

**User-written reviews.** Reviews are seeded in `reviews.json` as a trust-signal UX flourish. Would need a `POST /reviews/:itemId` + auth.

**Group / split-bill ordering.** Adds session-attribution complexity to every cart operation. The single-guest model is the right place to demonstrate the AI loop.

---

## AI tooling used to build it

Built end-to-end with **Claude Code** as the primary pair programmer.

- **Plan mode** for every architectural decision: UI library (NativeWind vs Tamagui), AI provider (Anthropic vs OpenAI), cart-state ownership (server vs client), modifier-group schema, voice route, streaming retry, slice scoping at each milestone.
- **Iterative multi-turn implementation**, with frequent tactical pivots when reality intervened:
  - Streaming → SDK 0.32 hang → revert. Retry on 0.96 after the Expo upgrade → still latency-bound → revert again, document tradeoff honestly.
  - NativeWind 4.2 + Reanimated 3 worklets-plugin conflict → pinned to 4.1.23 → upgraded again to 4.2 + the worklets plugin during the SDK 54 jump.
  - Unsplash photo IDs kept mismatching dishes → built [menu-preview.html](tools/menu-preview.html) to make the audit cheap.

Other tooling in use: **Vitest** (tests), **Zod** (validation everywhere), **`tsx watch`** (live backend reloads), **Expo Go** on a physical iPhone for the entire mobile testing loop.
