import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
  TextBlock,
} from "@anthropic-ai/sdk/resources/messages.js";
import { tools, parseToolInput, parseSuggestion } from "./tools.js";
import { buildSystemPrompt, buildCartContext } from "./systemPrompt.js";
import { applyCartAction, getOrCreateCart, menu } from "../store/sessions.js";
import type { Cart, ChatMessage, ExecutedAction, Suggestion } from "../types.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5";
const SYSTEM = buildSystemPrompt(menu);
const MAX_TOOL_ROUNDS = 5;

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "action"; action: ExecutedAction }
  | { type: "suggestion"; suggestion: Suggestion }
  | { type: "cart"; cart: Cart }
  | { type: "done" }
  | { type: "error"; message: string };

export type Emit = (event: StreamEvent) => void;

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<![*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

export interface ChatResult {
  reply: string;
  cart: Cart;
  actions: ExecutedAction[];
  suggestions: Suggestion[];
}

/**
 * Non-streaming chat loop. Calls `messages.create` once per round and processes
 * the full response. Used by the JSON chat route.
 */
export async function runChat(
  sessionId: string,
  userMessage: string,
  history: ChatMessage[],
): Promise<ChatResult> {
  const cartBefore = getOrCreateCart(sessionId);

  const messages: MessageParam[] = [];
  for (const m of history.slice(-10)) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({
    role: "user",
    content: `${buildCartContext(cartBefore)}\n\nGuest says: ${userMessage}`,
  });

  const executed: ExecutedAction[] = [];
  const suggestions: Suggestion[] = [];
  const suggestionsSent = new Set<string>();
  let finalText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools,
      messages,
    });

    const textParts = response.content
      .filter((b): b is TextBlock => b.type === "text")
      .map((b) => b.text);
    if (textParts.length > 0) finalText = textParts.join("\n").trim();

    const toolUses = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    messages.push({ role: "assistant", content: response.content });

    const toolResults: ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      if (tu.name === "suggest_addon") {
        const parsed = parseSuggestion(tu.input);
        if ("error" in parsed) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Error: ${parsed.error}`,
            is_error: true,
          });
          continue;
        }
        const item = menu.items.find((i) => i.id === parsed.item_id);
        const cartNow = getOrCreateCart(sessionId);
        const alreadyInCart = cartNow.lines.some((l) => l.itemId === parsed.item_id);
        if (!item) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Item "${parsed.item_id}" not on menu.`,
            is_error: true,
          });
          continue;
        }
        if (alreadyInCart) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `${item.name} is already in the cart.`,
            is_error: true,
          });
          continue;
        }
        if (!suggestionsSent.has(item.id)) {
          suggestionsSent.add(item.id);
          suggestions.push({
            itemId: item.id,
            name: item.name,
            price: item.price,
            emoji: item.emoji,
            reason: parsed.reason,
          });
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Suggested ${item.name}.`,
        });
        continue;
      }

      const parsed = parseToolInput(tu.name, tu.input);
      if ("error" in parsed) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Error: ${parsed.error}`,
          is_error: true,
        });
        continue;
      }
      const result = applyCartAction(sessionId, parsed);
      executed.push(result);
      const cartNow = getOrCreateCart(sessionId);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: `${result.message}\n${buildCartContext(cartNow)}`,
        is_error: !result.ok,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  const cartAfter = getOrCreateCart(sessionId);
  if (!finalText) {
    finalText = executed.length
      ? executed.map((e) => e.message).join(" ")
      : "Sorry — I didn't catch that. Could you say it another way?";
  }
  return {
    reply: stripMarkdown(finalText),
    cart: cartAfter,
    actions: executed,
    suggestions,
  };
}

export { stripMarkdown };

/**
 * Streaming chat loop. Calls `messages.stream()` per round and emits SSE
 * events as the model produces text and tool_use blocks. Cart mutations and
 * suggestions are applied/emitted the moment a `tool_use` block finalizes
 * (via the SDK's `contentBlock` event), so the UI sees action chips and
 * mini-cart updates arrive mid-response instead of all-at-once at the end.
 */
export async function runChatStream(
  sessionId: string,
  userMessage: string,
  history: ChatMessage[],
  emit: Emit,
): Promise<void> {
  const cartBefore = getOrCreateCart(sessionId);
  const messages: MessageParam[] = [];
  for (const m of history.slice(-10)) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({
    role: "user",
    content: `${buildCartContext(cartBefore)}\n\nGuest says: ${userMessage}`,
  });

  const suggestionsSent = new Set<string>();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const collectedBlocks: Array<TextBlock | ToolUseBlock> = [];
    const toolResultsByUseId = new Map<string, ToolResultBlockParam>();

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools,
      messages,
    });

    stream.on("text", (textDelta: string) => {
      emit({ type: "delta", text: textDelta });
    });

    stream.on("contentBlock", (block) => {
      if (block.type !== "tool_use") return;
      const tu = block;

      if (tu.name === "suggest_addon") {
        const parsed = parseSuggestion(tu.input);
        if ("error" in parsed) {
          toolResultsByUseId.set(tu.id, {
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Error: ${parsed.error}`,
            is_error: true,
          });
          return;
        }
        const item = menu.items.find((i) => i.id === parsed.item_id);
        const cartNow = getOrCreateCart(sessionId);
        const alreadyInCart = cartNow.lines.some((l) => l.itemId === parsed.item_id);
        if (!item) {
          toolResultsByUseId.set(tu.id, {
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Item "${parsed.item_id}" not on menu.`,
            is_error: true,
          });
          return;
        }
        if (alreadyInCart) {
          toolResultsByUseId.set(tu.id, {
            type: "tool_result",
            tool_use_id: tu.id,
            content: `${item.name} is already in the cart.`,
            is_error: true,
          });
          return;
        }
        if (!suggestionsSent.has(item.id)) {
          suggestionsSent.add(item.id);
          emit({
            type: "suggestion",
            suggestion: {
              itemId: item.id,
              name: item.name,
              price: item.price,
              emoji: item.emoji,
              reason: parsed.reason,
            },
          });
        }
        toolResultsByUseId.set(tu.id, {
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Suggested ${item.name}.`,
        });
        return;
      }

      const parsed = parseToolInput(tu.name, tu.input);
      if ("error" in parsed) {
        toolResultsByUseId.set(tu.id, {
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Error: ${parsed.error}`,
          is_error: true,
        });
        return;
      }
      const result = applyCartAction(sessionId, parsed);
      emit({ type: "action", action: result });
      emit({ type: "cart", cart: getOrCreateCart(sessionId) });
      toolResultsByUseId.set(tu.id, {
        type: "tool_result",
        tool_use_id: tu.id,
        content: `${result.message}\n${buildCartContext(getOrCreateCart(sessionId))}`,
        is_error: !result.ok,
      });
    });

    const finalMessage = await stream.finalMessage();
    for (const block of finalMessage.content) {
      if (block.type === "text" || block.type === "tool_use") {
        collectedBlocks.push(block);
      }
    }

    const toolUses = collectedBlocks.filter((b): b is ToolUseBlock => b.type === "tool_use");
    if (finalMessage.stop_reason !== "tool_use" || toolUses.length === 0) {
      break;
    }

    messages.push({ role: "assistant", content: collectedBlocks });
    const toolResults: ToolResultBlockParam[] = toolUses
      .map((tu) => toolResultsByUseId.get(tu.id))
      .filter((r): r is ToolResultBlockParam => !!r);
    messages.push({ role: "user", content: toolResults });
  }

  emit({ type: "cart", cart: getOrCreateCart(sessionId) });
  emit({ type: "done" });
}
