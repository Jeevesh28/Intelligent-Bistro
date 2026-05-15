# The Intelligent Bistro

A mobile restaurant ordering app where guests build their cart by talking to an AI assistant. Claude turns requests like *"two spicy chicken sandwiches, a Caesar with chicken, swap the fries for truffle fries, and a large iced tea"* into structured tool calls on a **server-side cart**.

The core engineering problem: an LLM that edits shared state can misread an order, invent a price, or drift out of sync with what the screen shows. The design rule here is that **the model is never trusted with state or money**.

<!-- Add a 10-second demo GIF here: one chat turn, action chips appearing, mini-cart updating.
<p align="center"><img src="docs/demo.gif" width="320" alt="Chat turn updating the cart"></p>
-->

**Stack:** Expo (SDK 54) + React Native · Express + TypeScript · Anthropic SDK (Claude Haiku 4.5, tool use) · Zod · Zustand · TanStack Query · Vitest

---

## Contents

1. [Quick start](#quick-start)
2. [Architecture](#architecture)
3. [Key engineering decisions](#key-engineering-decisions)
4. [How the AI edits the cart](#how-the-ai-edits-the-cart)
5. [Tests and verification](#tests-and-verification)
6. [Features](#features)
7. [Project structure](#project-structure)
8. [Deliberately out of scope](#deliberately-out-of-scope)
9. [How it was built](#how-it-was-built)

---

## Quick start

Prerequisites: Node 20+, an Anthropic API key, and Expo Go on a phone (SDK 54) or the Xcode iOS Simulator.

```bash
# Backend
cd backend && npm install
cp .env.example .env          # set ANTHROPIC_API_KEY
npm run dev                   # http://0.0.0.0:3000, reachable on your LAN

# Mobile (new terminal)
cd mobile && npm install
cp .env.example .env          # set EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000
npx expo start                # press 'i' for the simulator, or scan the QR code

# Tests
cd backend && npm test        # 45 Vitest specs, ~400 ms
```

On macOS, `ipconfig getifaddr en0` prints your LAN IP.

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
│                              │         │   Claude Haiku 4.5           │
│  TanStack Query for /menu    │         │   ≤5 tool-use rounds         │
│  NativeWind 4.2 styling      │         │                              │
│  Moti + Reanimated 4 anims   │         │  Zod on every tool input     │
│                              │         │  Pricing: priceForSize +     │
│                              │         │   priceForModifiers          │
└──────────────────────────────┘         └──────────────────────────────┘
```

---

## Key engineering decisions

**One source of truth for the cart.** UI taps and AI tool calls both go through `applyCartAction(sessionId, action)` in [sessions.ts](backend/src/store/sessions.ts). The frontend never edits the cart locally: every change round-trips to the server and returns the new cart. The assistant's view of the cart and the user's view cannot drift apart.

**Prices are computed only on the server.** `priceForSize`, `priceForModifiers` and `computeUnitPrice` in [pricing.ts](backend/src/lib/pricing.ts) are the only places a price is calculated. The model never computes a price; the backend re-derives it from the item's base price plus size and modifier deltas. A mirror in [mobile/lib/pricing.ts](mobile/lib/pricing.ts) exists only for the live preview on the item screen; the cart line is always whatever the server says.

**Modifier groups instead of flat strings.** The first version used `modifiers: string[]`, which broke as soon as the menu needed mutual exclusivity ("no two milks") and priced add-ons ("+$5 add chicken"). It became:

```ts
ModifierGroup = { id, label, type: "single" | "multi", options: { name, price? }[] }
```

The UI enforces single-select by deselecting siblings, and the prompt shows the model `[single]` / `[multi]` markers with inline price deltas so it cannot invent options.

**JSON responses instead of streaming.** Streaming was implemented twice (`@anthropic-ai/sdk` 0.32, then 0.96). The SDK worked, but the latency profile didn't benefit: for "dinner for two", Claude emits around ten `tool_use` blocks before any text, so a streamed reply shows an empty bubble for ~4 s. A typing indicator followed by all action chips at once reads faster. The streaming path (`runChatStream`, `api.chatStream`, `react-native-sse`) is kept behind a route switch; turning it on is a two-line change.

**Claude Haiku 4.5.** Fast time to first token (~700 ms), reliable tool use, and about a quarter of Sonnet's cost. The ~6 KB system prompt makes per-turn cost negligible at this scale.

**Sessions without auth.** Each device generates a UUID v4 on first launch and uses it as the `sessionId`. This is enough for a single-user demo; production would attach carts to user accounts.

**Backend binds to `0.0.0.0`.** Set explicitly in [index.ts](backend/src/index.ts) so a phone on the same LAN can reach the dev server without tunneling.

---

## How the AI edits the cart

### Tools

Defined in [backend/src/ai/tools.ts](backend/src/ai/tools.ts), validated with Zod, and executed in [claude.ts](backend/src/ai/claude.ts):

| Tool | Purpose |
|---|---|
| `add_item` | Add a line (`item_id`, `quantity`, optional `modifiers`, `size`, `notes`) |
| `update_line` | Change quantity, size or modifiers on an existing line; re-prices automatically |
| `remove_item` | Remove a line |
| `clear_cart` | Empty the cart |
| `suggest_addon` | Does not mutate the cart; surfaces a one-tap upsell chip in the UI |

### One chat turn

```
User: "Two spicy chicken sandwiches and a large iced tea"
  │
  ▼  POST /chat/:sessionId
runChat (claude.ts, up to 5 rounds):
  Round 1: Claude emits 2x tool_use { add_item } -> backend executes both
           -> tool_result blocks fed back
  Round 2: Claude emits text + optional tool_use { suggest_addon }
  ▼
{ reply, actions[], suggestions[], cart }
  │
  ▼
Frontend: chat bubble + action chips + upsell pill
          cartStore.setCart(cart) -> mini-cart and badge update
```

### Reliability: nothing the model sends is trusted

- **Zod validates every tool input** before it touches state.
- **Errors go back to the model.** An unknown `item_id` returns `tool_result { is_error: true }`, so Claude can correct itself in the next round.
- **`update_line` always re-prices** when size or modifiers change.
- **`suggest_addon` is rejected** if the item doesn't exist or is already in the cart.

### Prompt design

The system prompt ([systemPrompt.ts](backend/src/ai/systemPrompt.ts)) is split into explicit rules:

- **Cart changes** must go through a tool, batched in one turn.
- **Contextual references** ("that", "make it a large") are resolved against a cart snapshot injected every turn.
- **Pairings** are offered at most once per turn, only when the item has a pairing that isn't already in the cart.
- **Sizes, modifiers and prices** are rendered inline with their deltas, so the model can't hallucinate options.
- **Out-of-menu requests** map to a named alternative (14 examples, e.g. sushi to Tuna Tartare), with a one-line reason and a confirmation before adding.

### Action inspector

Long-press any action chip in the chat to open a sheet showing the tool name, its parameters, an OK/error status and the raw JSON. It makes the "every change goes through `applyCartAction`" guarantee visible in the app.

---

## Tests and verification

**Unit tests** (`cd backend && npm test`): 45 Vitest specs in ~400 ms.

```
✓ src/lib/pricing.test.ts        (16 tests)
✓ src/store/sessions.test.ts     (13 tests)
✓ src/ai/tools.test.ts           (16 tests)
```

Coverage: size deltas, priced, free and negative modifier deltas, `computeUnitPrice`, every `applyCartAction` type (including merging lines by `itemId + modifiers + size` and re-pricing on `update_line`), and valid and invalid tool inputs.

**Menu image verifier** ([tools/menu-preview.html](tools/menu-preview.html)). Renders every dish from `/menu` with its photo, flags failed loads, and lets you mark wrong images to produce a replacement list. Built because hand-checking 33 image URLs kept going wrong; it cut the audit from ~30 minutes to ~5.

**Smoke prompts**

| Prompt | Expected behavior |
|---|---|
| `Build me dinner for two under $60` | Several tool calls batched in one turn |
| `Make it medium rare` | Contextual reference resolved to `update_line` |
| `Actually make that two` | `update_line` quantity on the most recent line |
| `What's good and vegetarian?` | Text reply, no tool call |
| `Got any sushi?` | Out-of-menu request mapped to Tuna Tartare |
| `Clear my cart` | `clear_cart` |

---

## Features

- **Menu:** 33 dishes in 7 categories, search by name or ingredient, multi-select dietary filters, favorites, and category pills with scrollspy.
- **Item detail:** single and multi-select modifier groups, drink sizes with live price deltas, quantity stepper, and "pairs well with" links.
- **Cart and checkout:** steppers, swipe to delete, tip presets, and card, Venmo or cash payment tabs.
- **Order tracking:** animated four-stage progress (placed, in the kitchen, plating, ready) and a reorderable order history.
- **Assistant:** add, modify, remove, ask, clear, and out-of-menu lookups, with action chips confirming every tool call.
- **Polish:** NativeWind styling, Moti and Reanimated animations, skeleton loading states, and haptics.

---

## Project structure

```
backend/
├── src/
│   ├── index.ts                # Express bootstrap, binds 0.0.0.0:3000
│   ├── routes/                 # menu, cart, chat
│   ├── ai/
│   │   ├── claude.ts           # runChat and the tool-use loop
│   │   ├── tools.ts            # tool definitions and Zod parsers
│   │   └── systemPrompt.ts     # behavior rules and menu injection
│   ├── store/sessions.ts       # Map<sessionId, Cart> and applyCartAction
│   ├── lib/pricing.ts          # priceForSize, priceForModifiers, computeUnitPrice
│   ├── data/
│   │   ├── menu.json           # 33 items, 7 categories, modifier groups
│   │   └── reviews.json        # seeded reviews keyed by item id
│   ├── *.test.ts               # 45 Vitest specs
│   └── types.ts
└── vitest.config.ts

mobile/
├── app/                        # Expo Router screens (file-based)
│   ├── _layout.tsx             # providers, fonts, store hydration
│   ├── index.tsx               # menu: SectionList, scrollspy, filters, search
│   ├── item/[id].tsx           # item detail
│   ├── cart.tsx · chat.tsx · checkout.tsx · confirmation.tsx · orders.tsx
├── components/                 # MenuItemCard, ChatBubble, ActionInspector, ...
├── store/                      # Zustand: cart, chat, orders, favorites
├── lib/                        # api, types, pricing mirror, search, filters, session
└── tailwind.config.js

tools/
└── menu-preview.html           # in-browser image verifier
```

---

## Deliberately out of scope

- **No database.** An in-process `Map<sessionId, Cart>` is enough to demonstrate the AI and cart loop; carts reset when the backend restarts. `applyCartAction` is the only surface that would change to add SQLite.
- **No streaming chat.** See [Key engineering decisions](#key-engineering-decisions). The code path exists behind a switch.
- **No voice ordering.** It needs a development build (`expo-speech-recognition`) or a backend Whisper call, which conflicts with the Expo Go-only setup.
- **No user-written reviews or split bills.** Both add auth or session attribution to every cart operation without changing the AI loop being demonstrated.

---

## How it was built

I made the architectural calls: a server-owned cart, Anthropic tool use, Zod at every boundary, and modifier groups instead of strings. I used Claude Code as a pair programmer for implementation, with plan mode for each decision before writing code. A few pivots along the way:

- **Streaming:** hung on SDK 0.32 and was reverted. Retried on 0.96 after the Expo upgrade, it was still latency-bound, so it was reverted again and the tradeoff documented.
- **Styling:** a NativeWind 4.2 and Reanimated 3 worklets-plugin conflict forced a pin to 4.1.23, then an upgrade back to 4.2 with the worklets plugin during the SDK 54 move.
- **Images:** stock photo IDs kept mismatching dishes, which led to building the menu image verifier.

Other tooling: Vitest, Zod, `tsx watch` for live backend reloads, and Expo Go on a physical iPhone for the full mobile testing loop.
