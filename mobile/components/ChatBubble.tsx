import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AnimatePresence, MotiView } from "moti";
import { Check, Plus } from "lucide-react-native";
import type { ChatMessage, ExecutedAction, Suggestion } from "../lib/types";
import { useCartStore } from "../store/cartStore";
import { haptic } from "../lib/haptics";
import { ActionInspector } from "./ActionInspector";

interface Props {
  message: ChatMessage;
}

export function ChatBubble({ message }: Props) {
  const isUser = message.role === "user";
  const [inspecting, setInspecting] = useState<ExecutedAction | null>(null);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 220 }}
      className={`mb-3 max-w-[85%] ${isUser ? "self-end" : "self-start"}`}
    >
      <View
        className={`rounded-2xl px-4 py-3 ${
          isUser ? "bg-forest-600 rounded-br-md" : "bg-white border border-cream-200 rounded-bl-md"
        }`}
      >
        <Text
          className={`font-sans text-[15px] leading-[22px] ${isUser ? "text-cream-100" : "text-ink-900"}`}
        >
          {message.content}
          {message.streaming && <StreamingCaret />}
        </Text>
      </View>
      {message.actions && message.actions.length > 0 && (
        <View className="mt-2 gap-1">
          {message.actions
            .filter((a) => a.ok)
            .map((a, i) => (
              <Pressable
                key={i}
                onLongPress={() => {
                  haptic.selection();
                  setInspecting(a);
                }}
                delayLongPress={250}
                className="flex-row items-center gap-1.5 bg-cream-200 rounded-full self-start px-3 py-1 active:opacity-70"
              >
                <Check size={12} color="#3F5F3C" strokeWidth={3} />
                <Text className="font-sans-medium text-forest-600 text-xs">{a.message}</Text>
              </Pressable>
            ))}
          {!isUser && message.actions.some((a) => a.ok) && (
            <Text className="font-sans text-ink-400 text-[10px] mt-0.5 self-start">
              Long-press a chip to see what the AI did
            </Text>
          )}
        </View>
      )}
      {message.suggestions && message.suggestions.length > 0 && (
        <View className="mt-2 gap-2">
          {message.suggestions.map((s) => (
            <SuggestionChip key={s.itemId} suggestion={s} />
          ))}
        </View>
      )}

      <ActionInspector
        action={inspecting}
        visible={inspecting !== null}
        onClose={() => setInspecting(null)}
      />
    </MotiView>
  );
}

function StreamingCaret() {
  return (
    <MotiView
      from={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ type: "timing", duration: 500, loop: true, repeatReverse: true }}
      style={{ display: "flex" }}
    >
      <Text className="font-sans text-forest-600 text-[15px] leading-[22px]"> ▍</Text>
    </MotiView>
  );
}

function SuggestionChip({ suggestion }: { suggestion: Suggestion }) {
  const [state, setState] = useState<"idle" | "adding" | "added" | "hidden">("idle");
  const addItem = useCartStore((s) => s.addItem);

  const onAdd = async () => {
    if (state !== "idle") return;
    haptic.light();
    setState("adding");
    try {
      await addItem({ item_id: suggestion.itemId, quantity: 1 });
      setState("added");
      setTimeout(() => setState("hidden"), 1500);
    } catch {
      setState("idle");
    }
  };

  return (
    <AnimatePresence>
      {state !== "hidden" && (
        <MotiView
          from={{ opacity: 0, translateY: 4 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "timing", duration: 220 }}
          className="self-start"
        >
          <View
            className="flex-row items-center bg-white border border-cream-300 rounded-2xl pl-2 pr-1 py-1"
            style={{
              shadowColor: "#0E1A0D",
              shadowOpacity: 0.05,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text style={{ fontSize: 22, lineHeight: 26 }}>{suggestion.emoji ?? "✨"}</Text>
            <View className="px-2.5 flex-shrink">
              <Text className="font-sans-semibold text-ink-900 text-[13px]">
                {suggestion.name} · ${suggestion.price.toFixed(2)}
              </Text>
              <Text className="font-sans text-ink-500 text-[11px] mt-0.5" numberOfLines={1}>
                {suggestion.reason}
              </Text>
            </View>
            <Pressable
              onPress={onAdd}
              disabled={state !== "idle"}
              className={`flex-row items-center gap-1 rounded-xl px-3 py-1.5 ${
                state === "added" ? "bg-forest-700" : "bg-forest-600 active:bg-forest-700"
              }`}
            >
              {state === "added" ? (
                <>
                  <Check size={13} color="#FAF7F0" strokeWidth={3} />
                  <Text className="font-sans-semibold text-cream-100 text-xs">Added</Text>
                </>
              ) : (
                <>
                  <Plus size={13} color="#FAF7F0" strokeWidth={3} />
                  <Text className="font-sans-semibold text-cream-100 text-xs">
                    {state === "adding" ? "Adding…" : "Add"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </MotiView>
      )}
    </AnimatePresence>
  );
}
